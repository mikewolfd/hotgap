// Which states' child-care subsidy reaches PolicyEngine's net income, and
// which is computed and then dropped on the floor — on a model that predates
// policyengine-us #9503. WORKAROUND: delete this module, parse.ts's
// `childcareSubsidyCounted` and client.ts's probeChildcareSubsidyCounted once
// every endpoint HotGap calls carries #9503.
//
// PolicyEngine models a CCDF-funded child-care subsidy per state
// (`<st>_child_care_subsidies`, SPM unit, all 51 summed by the aggregate
// `child_care_subsidies`). Before #9503 only the states listed in the parameter
// `gov.household.household_state_benefits` flow into `household_state_benefits`
// → `household_benefits` → `household_net_income`. For every other state the
// subsidy is computed correctly and then never counted, so PolicyEngine's net
// income is missing the largest single benefit a parent of a young child
// receives — policyengine-us #9405. #9503 puts the aggregate itself on the
// list, in every period, so a model that carries it counts the subsidy in all
// 51 states; client.ts asks each endpoint which kind it is, once, and this
// table only decides on the old kind.
//
// Worse than missing: in an omitted state the modeled subsidy makes the
// household look POORER. `childcare_expenses` is defined as
// `pre_subsidy_childcare_expenses - child_care_subsidies`, and that net figure
// drives SNAP's dependent-care deduction and the CDCC. Verified live
// 2026-09-15, Connecticut, single parent with a 3-year-old and a $9,600 bill:
// with the subsidy modeled ($8,850 at $25,000 of pay) net income is $34,121;
// with `ct_child_care_subsidies` forced to 0 it is $38,102. The $8,850 never
// arrives and $3,981 of SNAP and credits leave.
// (docs/upstream/evidence/childcare-ct-full.json, childcare-ct-forced-zero.json.)
//
// Both lists below were read from the LIVE API's own metadata on 2026-09-15
// (`GET https://api.policyengine.org/us/metadata`, policyengine-us 1.764.6),
// not from the repository, because the deployed model is what HotGap calls.

/**
 * States whose subsidy variable exists in the DEPLOYED model (38 of 51).
 * The other 13 — DC, IL, NC, NY, OH, OK, OR, SD, TN, TX, UT, WI, WY — are
 * implemented on `main` but not yet released, and asking for their variable
 * is a 400 ("Unrecognized household variable `ny_child_care_subsidies`",
 * docs/upstream/evidence/childcare-ny-base.json). HotGap therefore asks for
 * the AGGREGATE `child_care_subsidies` instead, which is one name in every
 * state and is already the variable `childcare_expenses` itself subtracts.
 * This set is documentation, held to by its unit test; it is not a request key.
 */
export const CHILDCARE_SUBSIDY_STATES: ReadonlySet<string> = new Set([
  "AK", "AL", "AR", "AZ", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "IA", "ID",
  "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "ND",
  "NE", "NH", "NJ", "NM", "NV", "PA", "RI", "SC", "VA", "VT", "WA", "WV",
]);

/**
 * States whose subsidy is inside `household_state_benefits`, and therefore
 * already inside `household_net_income`. In these states HotGap must NOT add
 * it again; it only moves it out of the untracked `otherBenefits` remainder so
 * it can be named. Everywhere else, `parse.ts` adds it (a WORKAROUND marked
 * there, retired by policyengine-us #9503).
 *
 * This is the 23-state list from policyengine-us `main`, not the 18 the
 * deployed 2026 block currently carries. The five extras — DC, NC, NY, OH, OK
 * — have NO subsidy variable in the deployed model at all (they are in the
 * 13 above), so their subsidy is $0 today and the branch is a no-op; the day
 * the API ships `main`, those five gain the variable and the list entry in the
 * same release, and this table is already right. Using the deployed 18 would
 * have been wrong on that day in the expensive direction: the money counted
 * twice.
 */
export const CHILDCARE_SUBSIDY_IN_NET_INCOME: ReadonlySet<string> = new Set([
  "AL", "AR", "AZ", "CA", "CO", "DC", "DE", "GA", "ID", "IN", "MD", "MO", "MT",
  "NC", "NE", "NV", "NY", "OH", "OK", "SC", "VA", "WA", "WV",
]);

/**
 * Whether this state's child-care subsidy is already inside net income.
 * `countedEverywhere` is the endpoint's answer to the #9503 probe (a model
 * record's `countsChildcareSubsidy`); on a model that predates the fix the
 * table decides.
 */
export const childcareSubsidyInNetIncome = (state: string, countedEverywhere = false): boolean =>
  countedEverywhere || CHILDCARE_SUBSIDY_IN_NET_INCOME.has(state.toUpperCase());
