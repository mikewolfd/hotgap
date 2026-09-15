"""HTTP in front of `calculate`: POST /us/calculate and GET /healthz.

Wire-compatible with `https://api.policyengine.org/us/calculate` for
everything HotGap sends (`core/src/translate.ts` builds it,
`core/src/parse.ts` reads it back). Point HotGap at it with

    HOTGAP_PE_URL=http://127.0.0.1:8080/us/calculate

Responses are serialised here rather than with `flask.jsonify` so the key
order and the NaN handling do not depend on a Flask default: the live API
sorts the keys of a success body and leaves an error body in its own order,
and this matches that.
"""

from __future__ import annotations

import json
import os
from typing import Any

from flask import Flask, Response, request

from .calculate import (
    CORE_VERSION,
    MODEL,
    MODEL_VERSION,
    CalculateError,
    calculate,
    policy_cache_size,
    warm_up,
)

app = Flask(__name__)

# At import, so gunicorn's --preload does it once in the master and every
# forked worker starts with the caches already warm.
warm_up()

# The model that produced every number this process returns. Sent on every
# response so a sweep can record it without a second request; also at /healthz.
VERSION_HEADER = "X-PolicyEngine-Version"


def _respond(body: dict[str, Any], status: int, sort_keys: bool) -> Response:
    return Response(
        json.dumps(body, sort_keys=sort_keys),
        status=status,
        mimetype="application/json",
        headers={
            VERSION_HEADER: MODEL_VERSION,
            # The public API is keyless and open; a browser client of the
            # archived UI expects the same.
            "Access-Control-Allow-Origin": "*",
        },
    )


def _error(message: str, status: int = 400, errors: list[dict[str, Any]] | None = None) -> Response:
    return _respond(
        {"status": "error", "message": message, "result": None, "errors": errors or []},
        status,
        sort_keys=False,
    )


@app.post("/us/calculate")
def us_calculate() -> Response:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("Request body must be a JSON object.")
    if "household" not in payload:
        return _error("Request body must contain a `household` object.")
    try:
        result = calculate(payload["household"], payload.get("policy"))
    except CalculateError as e:
        return _error(e.message, errors=e.errors)
    except Exception as e:  # noqa: BLE001 - a bug here is the server's fault, not the caller's
        app.logger.exception("calculate failed")
        return _error(f"{e.__class__.__name__}: {e}", status=500)
    return _respond({"status": "ok", "message": None, "result": result}, 200, sort_keys=True)


@app.get("/healthz")
def healthz() -> Response:
    return _respond(
        {
            "status": "ok",
            "model": MODEL,
            "version": MODEL_VERSION,
            "policyengine_core": CORE_VERSION,
            "policy_systems_cached": policy_cache_size(),
        },
        200,
        sort_keys=False,
    )


if __name__ == "__main__":
    # Development only. `threaded=False` because a simulation is not safe to
    # interleave with another in the same process (see calculate.py); for
    # parallelism run several worker processes under gunicorn.
    app.run(
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8080")),
        threaded=False,
    )
