# MoneyFlow — bounded research record template

> Copy this file only when a research result is reusable beyond one PR comment or work-packet note. Keep one decision question per record.

**Status:** Draft | Active | Historical | Superseded  
**Owner:**  
**Research question:**  
**Related issue/spec/packet:**  
**MoneyFlow baseline:** commit/PR/date used for repository truth  
**External evidence reviewed:** YYYY-MM-DD  
**Review trigger:** date, provider/policy change, dependency change, contradictory runtime evidence, or named milestone

## 1. Decision question

State the exact decision this research should inform. Prefer a falsifiable question over a topic label.

Example shape: `Can MoneyFlow safely use X for Y under constraints A/B/C?`

## 2. Scope and non-goals

**In scope**

- 

**Out of scope**

- 

## 3. Current MoneyFlow reality

Record only the repository/runtime facts needed to interpret the external evidence.

| Claim | Evidence | Confidence |
|---|---|---|
|  | code/test/migration/provider read-back | High / Medium / Low |

If code/tests and prose conflict, resolve against the executable evidence before continuing.

## 4. External sources

Use 2–4 focused sources by default. Prefer official specifications/platform/provider documentation, then maintained implementations and practitioner evidence.

| Source | Accessed | What it establishes | What does not transfer to MoneyFlow | License / security / privacy / operations note |
|---|---|---|---|---|
|  | YYYY-MM-DD |  |  |  |

Do not paste large source excerpts. Record the conclusion and link to the source.

## 5. Findings

| Finding | Evidence type | Confidence | MoneyFlow implication |
|---|---|---|---|
|  | Fact / inference / practitioner signal | High / Medium / Low |  |

Explicitly preserve material negative results and contradictions.

## 6. Alternatives considered

| Option | Benefit | Cost/risk | Why not preferred |
|---|---|---|---|
|  |  |  |  |

## 7. Recommendation

**Posture:** Adopt | Adapt | Reject | Defer | Needs owner decision

State the smallest conclusion supported by the evidence. Do not turn a research recommendation into implementation authority.

## 8. Verification before implementation

List the evidence that would be required if the recommendation becomes an authorized work item.

- Unit/domain proof:
- Database/RLS proof:
- Browser/UI proof:
- Provider/production read-back:
- Security/privacy/legal review:
- Rollback/failure behavior:

Mark non-applicable items explicitly rather than omitting material boundaries.

## 9. Open questions and invalidation conditions

- What is still unknown?
- What new evidence would reverse or narrow this conclusion?
- Which assumptions are date-sensitive?

## 10. Related MoneyFlow artifacts

- Current authority:
- Code/tests/migrations:
- Prior research:
- ADR/spec/packet:
- PR memory:

## 11. Supersession

When this record is no longer current, keep it historical only if it still prevents repeated work. Name the artifact that supersedes it and ensure current truth lives in the correct authority layer, not in two places.