"""One PolicyEngine household request in, the public API's response out.

The public `POST https://api.policyengine.org/us/calculate` is not documented
as a contract anywhere, so every rule below was read off the live service on
2026-09-15 with the probes described next to it, and the two recorded
responses in `fixtures/` were used as a second, older witness. `engine/README.md`
lists what is deliberately not implemented.

The response is the REQUEST's `household` object, deep-copied, with values
filled in — never a freshly built structure. That is why `members`, `axes`,
role lists and any input the caller sent come back exactly as sent.

Two fill-in rules, and which one applies depends only on whether the request
carries `axes`:

  * No axes: only the `null` leaves are computed, each to a SCALAR. Inputs are
    echoed byte-for-byte (`"employment_income": {"2026": 12345.67}` comes back
    as `12345.67`, not as the float32 the model actually used).
  * Axes: EVERY variable leaf is computed — inputs included — to an ARRAY of
    `count` values. A forced scalar input broadcasts across the axis both into
    the model (policyengine-core tiles a group-entity input over the expanded
    cells) and back out in the echo, so `head_start: 0` returns `[0, 0, 0]`.
    HotGap's `core/src/parse.ts` accepts either a scalar or a full series here
    because the July 2026 deployment echoed forced inputs as scalars; the
    service matches what the API does today.

Number formatting is not cosmetic, it is part of the wire format. The model
computes in float32. On the scalar path the API round-trips through
`float(str(x))`, so a float32 whose shortest repr is `11035.282` is reported as
`11035.282`; on the axis path it does not, so the same value is reported as
`11035.2822265625`. Both were confirmed live in the same probe.
"""

from __future__ import annotations

import copy
import json
import os
import threading
from collections import OrderedDict
from importlib.metadata import version
from typing import Any

from policyengine_core.enums import EnumArray
from policyengine_us import Simulation
from policyengine_us.system import CountryTaxBenefitSystem
from policyengine_us.system import system as _PACKAGE_SYSTEM
from policyengine_core.reforms import Reform

MODEL = "policyengine-us"
MODEL_VERSION = version("policyengine-us")
CORE_VERSION = version("policyengine-core")

# --- Baseline overrides -----------------------------------------------------
#
# Parameters this service sets on every request. Baked into BASELINE_SYSTEM
# once, at import in the gunicorn master, so a request with no `policy` of
# its own runs on the preloaded system that every worker shares copy-on-write
# — rather than each worker building and caching a 0.45 GB reform system for
# what is, from HotGap's side, the plain model. Requests that do carry a
# `policy` get these merged in (see _system_for), so both paths agree.

HEAD_START_IN_NET_INCOME = "gov.simulation.include_head_start_benefits_in_net_income"
# HotGap's parse.ts subtracts the programs it names from `household_benefits`
# to get an untracked remainder, and its evaluate.ts values Head Start at
# replacement cost by adjusting net income DOWN from the sticker. Both assume
# Head Start sits inside household_net_income, which is how the public API
# behaves and how every committed curve was swept. policyengine-us 2.4.2 moved
# that behind this switch, default false, so serving the release as-is would
# silently change the meaning of every curve and floor that remainder at zero.
# Restoring it is what makes this service a drop-in rather than a different
# model; it is named here, switchable, and pinned by HotGap's own contract
# test ("head_start:0 override removes Head Start from net income").
_RESTORE_HEAD_START = os.environ.get("HOTGAP_ENGINE_HEAD_START_IN_NET_INCOME", "1") != "0"


def _has_parameter(path: str) -> bool:
    """True when this model version defines that parameter. A ParameterNode is
    attribute-addressed, not a mapping, so walk it."""
    node = _PACKAGE_SYSTEM.parameters
    for part in path.split("."):
        node = getattr(node, part, None)
        if node is None:
            return False
    return True


def _baseline_overrides() -> dict[str, Any]:
    if not _RESTORE_HEAD_START or not _has_parameter(HEAD_START_IN_NET_INCOME):
        return {}
    return {HEAD_START_IN_NET_INCOME: {"2000-01-01.2099-12-31": True}}


# Built through the constructor, not applied afterwards: upstream applies a
# reform after its parameter-processing pipeline so a value inserted at a
# future date cannot act as a defined value during uprating (policyengine-us
# #9075). The package's own singleton stays alive underneath (it is a module
# global there); that one extra system lives in the master and is shared.
BASELINE_SYSTEM = (
    CountryTaxBenefitSystem(reform=Reform.from_dict(_baseline_overrides(), country_id="us"))
    if _baseline_overrides()
    else _PACKAGE_SYSTEM
)

_ENTITIES_BY_PLURAL = {entity.plural: entity for entity in BASELINE_SYSTEM.entities}
# `members` and any other role name is a list of person ids, not a variable.
# The person entity has no roles at all, hence the getattr.
_ROLE_KEYS = {
    plural: {
        name
        for role in getattr(entity, "roles", None) or ()
        for name in (role.key, role.plural)
        if name
    }
    for plural, entity in _ENTITIES_BY_PLURAL.items()
}


class CalculateError(Exception):
    """A request the service refuses: answered with HTTP 400 and this message."""

    def __init__(self, message: str, errors: list[dict[str, Any]] | None = None):
        super().__init__(message)
        self.message = message
        self.errors = errors or []


def _reject(errors: list[dict[str, Any]]) -> None:
    """Raise in the public API's shape: one joined message plus the details.

    Live 2026-09-15, `rent` on `spm_units` returns HTTP 400 with
    `{"status": "error", "message": "Unrecognized calculate input(s): Household
    variable `rent` belongs on `people`, not `spm_units`, at
    `household.spm_units.s.rent`.", "result": null, "errors": [...]}`, and two
    bad names in one request are joined with "; ".
    """
    raise CalculateError(
        "Unrecognized calculate input(s): "
        + "; ".join(error["message"] for error in errors),
        errors,
    )


def _validate(household: dict[str, Any], system) -> None:
    errors: list[dict[str, Any]] = []
    for plural, instances in household.items():
        if plural == "axes":
            continue
        if plural not in _ENTITIES_BY_PLURAL:
            errors.append(
                {
                    "type": "household_entity",
                    "name": plural,
                    "path": f"household.{plural}",
                    "message": f"Unrecognized household entity `{plural}` at `household.{plural}`.",
                }
            )
            continue
        if not isinstance(instances, dict):
            continue
        for instance_id, variables in instances.items():
            if not isinstance(variables, dict):
                continue
            for name in variables:
                if name in _ROLE_KEYS[plural]:
                    continue
                path = f"household.{plural}.{instance_id}.{name}"
                variable = system.variables.get(name)
                if variable is None:
                    errors.append(
                        {
                            "type": "household_variable",
                            "name": name,
                            "path": path,
                            "message": f"Unrecognized household variable `{name}` at `{path}`.",
                        }
                    )
                elif variable.entity.plural != plural:
                    errors.append(
                        {
                            "type": "household_variable_wrong_entity",
                            "name": name,
                            "path": path,
                            "message": (
                                f"Household variable `{name}` belongs on "
                                f"`{variable.entity.plural}`, not `{plural}`, at `{path}`."
                            ),
                            "expected_entity_plural": variable.entity.plural,
                            "actual_entity_plural": plural,
                        }
                    )
    if errors:
        _reject(errors)


# A reform is a whole rebuilt tax-benefit system: ~6.5 s against 0.07 s to
# build a simulation over one already built. HotGap sends the same handful of
# parameter corrections on every request for a given state, so keep the last
# few.
# Per worker. Each cached system is a full CountryTaxBenefitSystem built for
# one distinct `policy`: ~6.5 s to build and ~0.45 GB unwarmed, growing to
# ~1.5–2 GB once its lazily resolved parameter caches fill on first use, and
# gunicorn workers do not share them. Measured on 2.5.0 over the eight
# heaviest states: a worker peaks at 5.4 GB with two cached, 2.75 GB with one;
# a baseline-only worker plateaus at 1.9 GB. Eight per worker on four workers
# took a 16 GB runner down mid-sweep. HotGap's sweep sends seven distinct
# policies (six parent-Medicaid states and New York) in state-major order, so
# one in play per worker is the working set; the seam between two override
# states costs one rebuild.
_POLICY_CACHE_SIZE = int(os.environ.get("HOTGAP_ENGINE_POLICY_CACHE", "1"))
_policy_cache: "OrderedDict[str, Any]" = OrderedDict()
# One lock for the cache AND for running a simulation. policyengine-us hands
# every Simulation the same shared TaxBenefitSystem instance and then applies
# its structural reforms to it (`Simulation.__init__` -> `apply_reform`), so
# two simulations in one process are not safe to interleave. Parallelism comes
# from running several worker PROCESSES (see the Dockerfile), not threads.
_lock = threading.RLock()


def _system_for(policy: dict[str, Any] | None):
    if not policy:
        return BASELINE_SYSTEM  # already carries _baseline_overrides()
    # The caller's own overrides win: a request that sets the same parameter
    # is asking for that value deliberately.
    policy = {**_baseline_overrides(), **policy}
    key = json.dumps(policy, sort_keys=True)
    with _lock:
        cached = _policy_cache.get(key)
        if cached is not None:
            _policy_cache.move_to_end(key)
            return cached
        try:
            reform = Reform.from_dict(policy, country_id="us")
            built = CountryTaxBenefitSystem(reform=reform)  # constructor path, see BASELINE_SYSTEM
        except CalculateError:
            raise
        except Exception as e:  # a bad parameter path, period or value
            raise CalculateError(f"Invalid policy: {e}") from e
        _policy_cache[key] = built
        while len(_policy_cache) > _POLICY_CACHE_SIZE:
            _policy_cache.popitem(last=False)
        return built


def policy_cache_size() -> int:
    with _lock:
        return len(_policy_cache)


def _series(variable, values, index: int, instances: int) -> list[Any]:
    """One entity instance's values across the axis.

    `expand_axes` repeats the whole situation once per axis point, so the
    arrays run cell-major: instance `index` of cell `c` sits at
    `c * instances + index`.
    """
    if isinstance(values, EnumArray):
        values = values.decode_to_str()
    return values[index::instances].tolist()


def _scalar(variable, values, index: int) -> Any:
    if isinstance(values, EnumArray):
        return values.decode()[index].name
    value = values[index]
    if variable.value_type == float:
        # float32 -> shortest repr -> float, which is what the API reports.
        return float(str(value))
    if variable.value_type == str:
        return str(value)
    return value.tolist()


def warm_up() -> None:
    """Run one throwaway household so the first real request is not the slow one.

    Importing the package builds the parameter tree, but a great deal of it is
    resolved lazily on first use and cached on the shared TaxBenefitSystem.
    Measured in the container 2026-09-15: without this the first request a
    gunicorn worker serves took 9-14 s and the next 0.6 s. Under `--preload`
    the warm caches are built once in the master and inherited copy-on-write,
    so every worker starts warm.
    """
    situation = {
        "people": {
            "you": {"age": {"2026": 30}, "employment_income": {"2026": 20000}},
            "kid": {"age": {"2026": 5}},
        },
        "families": {"f": {"members": ["you", "kid"]}},
        "marital_units": {"m": {"members": ["you"]}},
        "tax_units": {"t": {"members": ["you", "kid"]}},
        "spm_units": {"s": {"members": ["you", "kid"]}},
        "households": {"h": {"members": ["you", "kid"], "state_name": {"2026": "CA"}}},
    }
    with _lock:
        simulation = Simulation(tax_benefit_system=BASELINE_SYSTEM, situation=situation)
        for name in (
            "household_net_income",
            "household_benefits",
            "household_state_benefits",
            "household_refundable_tax_credits",
            "spm_unit_medical_out_of_pocket_expenses",
            "snap",
            "medicaid",
            "child_care_subsidies",
        ):
            simulation.calculate(name, "2026")


def calculate(household: dict[str, Any], policy: dict[str, Any] | None = None) -> dict[str, Any]:
    """The `result` object for one request. Raises CalculateError on a bad one."""
    if not isinstance(household, dict):
        raise CalculateError("`household` must be an object.")
    system = _system_for(policy)
    _validate(household, system)

    with _lock:
        try:
            simulation = Simulation(tax_benefit_system=system, situation=household)
        except CalculateError:
            raise
        except Exception as e:
            raise CalculateError(str(e) or e.__class__.__name__) from e

        result = copy.deepcopy(household)
        has_axes = bool(household.get("axes"))
        for plural, instances in household.items():
            if plural == "axes" or not isinstance(instances, dict):
                continue
            count = len(instances)
            for index, (instance_id, variables) in enumerate(instances.items()):
                if not isinstance(variables, dict):
                    continue
                for name, periods in variables.items():
                    if name in _ROLE_KEYS[plural] or not isinstance(periods, dict):
                        continue
                    variable = system.variables[name]
                    for period, value in periods.items():
                        # Without axes the API only fills in what was asked
                        # for (a null) and echoes every input untouched.
                        if value is not None and not has_axes:
                            continue
                        try:
                            values = simulation.calculate(name, period)
                        except Exception as e:
                            raise CalculateError(
                                f"Could not calculate `{name}` for `{period}`: {e}"
                            ) from e
                        result[plural][instance_id][name][period] = (
                            _series(variable, values, index, count)
                            if has_axes
                            else _scalar(variable, values, index)
                        )
        return result
