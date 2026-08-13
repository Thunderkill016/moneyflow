# Phase E — Creative Territories

**Status:** delivered for owner review — **OWNER SELECTION: PENDING**
**Baseline:** `main@55ee401f34bf1200dbdcab08aec13df1feddec1f`
**Scope:** three candidate creative territories. **No territory is selected**, no
production palette is chosen, and nothing here authorises a runtime, CSS, token,
component or Design System change.
**Strategy authority:** `docs/research/PHASE_D_BRAND_STRATEGY.md` — locked, not revisited.

---

## 1. Executive brief

Three territories, each a materially different **interpretive stance** on the same
locked strategy. They are not one design in three accent colours; they disagree about
what the product's visual language should treat as the hero, and therefore about
composition, density, typography, motion and how money reads.

| | **A — Sổ Cái** (The Register) | **B — Biên Nhận** (The Attested Record) | **C — Bản Ghi & Bản Sửa** (State and Amendment) |
|---|---|---|---|
| Hero | the **collection** — the continuous register | the **object** — one record and where it came from | the **timeline** — the ledger's state and how it changed |
| Traceability is… | **spatial**: a figure is a collapsed view of rows and expands into them | **attestational**: each record carries its own origin marks | **temporal**: any figure can be rewound to the records that produced it |
| Correction reads as… | a new line in the register | a re-attested record | **the hero mechanism itself** |
| Governing structure | rules, columns, running position | the bounded record object | the state marker and its amendments |

All three are candidate names only. None is current authority.

**Why these three and not three moods.** Phase D forbids mood adjectives as direction,
and the two prior directions failed partly by starting from atmosphere. Each territory
here starts from a *mechanism observed in high-trust financial software* (§3) and asks
what a Vietnamese personal ledger looks like if that mechanism is the point.

**What is deliberately not attempted.** No territory tries to make MoneyFlow look
richer, friendlier or more modern than it is. Phase D's promise is narrow —
ledger-derived figures trace to their records, ordinary mistakes are correctable — and
a territory that outruns it visually would recreate the problem Phase D exists to
prevent.

---

## 2. Locked Phase D constraints

Binding on all three territories. A territory that violates any of these is disqualified
regardless of how it looks.

| Locked | Consequence for a territory |
|---|---|
| Role: **trusted ledger** | not a bank, wallet, adviser, coach or assistant |
| Category frame: **sổ thu chi cá nhân** | a personal ledger, not a financial-management console |
| Primary promise | **ledger-derived** figures trace to records; ordinary mistakes are correctable. Not planning projections, demo figures or counts |
| Provenance | records come from deliberate manual entry **or** data the user supplied and accepted |
| Manual capture | remains the default product identity |
| Planning | optional; may never dominate |
| Advanced intake | secondary; never product identity |
| Anti-positioning | no AI adviser, bank-sync identity, wealth terminal, household network, envelope ideology or gamified coach |
| Personality | **Exact, Unhurried, Accountable, Deferential, Legible**, each with its stated NOT |
| Verbal | Vietnamese-first and native, never translated English |
| Money | never distinguishable by colour alone |
| Transfers | neutral; never income or expense |
| Runtime | demo and authenticated visibly distinct |
| Ownership | complete backup ≠ scoped report export |

### Fresh Blue

By owner decision of 2026-08-13, Phase E **may** explore outside Fresh Blue.

- Fresh Blue is **not** a required baseline for any candidate.
- Fresh Blue is **not** historical, and is **not** retired from production.
- It **remains the current shipped colour implementation** until a later
  owner-selected territory and an approved migration supersede it.
- Phase E selects no production palette. Each territory states a colour *direction*;
  none of them changes anything shipped.

Territory A stays close to a blue action family; B and C propose different ones. That
spread is deliberate, so the owner sees the real range rather than three variations on
what already exists.

### Explicitly not reachable through this phase

`docs/design/CALM_LEDGER_V2.md` (historical) and `docs/design/SIGNAL_LEDGER_V3.md`
(rejected 2026-08-02) may not return under a new name. Concretely, that rules out:

- Calm Ledger's thesis — a neutral card system carrying one brand accent, cards as the
  primary grouping device, 80%-neutral surfaces as the identity;
- Signal Ledger's thesis — a **warm paper canvas**, an **editorial** register, dark
  information stages, and a **"what needs attention next" decision system**.

§17 of each territory records what it refuses to copy, and the attention-triage framing
is refused by all three: it contradicts *Deferential*.

---

## 3. Research and reference ledger

Focused and mechanism-first. Each entry separates the observed fact from what MoneyFlow
should take and what it must not.

### R1 — Balance-to-journal drill-down in enterprise general ledgers

- **REFERENCE FACT:** Oracle General Ledger documents drilling down "from detail account
  balances to the journals that contribute to the balance, and from detail journals…
  further to subledger transactions." Microsoft Dynamics 365 documents the same shape:
  drill from a trial-balance line to the transactions that make up a general-ledger
  balance. [S1, S2]
- **Mechanism observed:** a financial total is treated as a *collapsed view* of the
  records beneath it, and the interface's job is to expand it. Trust comes from the
  path, not from the presentation of the number.
- **Why relevant:** this is exactly Phase D's D2, and Phase C's aggregate contract, in a
  product family where the mechanism has been load-bearing for decades. It is the
  strongest available evidence that traceability is a *navigational structure*, not a
  decoration.
- **What NOT to copy:** enterprise GL density, terminology (trial balance, subledger,
  posting batch), the multi-user accounting mental model, or any implication that
  MoneyFlow is accounting software — Phase D's A8 forbids it.

### R2 — Audit-trail codes and non-editable posted records

- **REFERENCE FACT:** Microsoft Business Central assigns audit-trail codes to posted
  transactions "allowing users to trace the posting sequence of a transaction back to
  its origin", and states that posted financial data cannot be edited. [S2]
- **Mechanism observed:** provenance as a *first-class attribute carried on the record*,
  plus correction-by-new-entry rather than correction-in-place.
- **Why relevant:** the provenance half transfers directly and is the seed of Territory
  B. It shows origin can be a visible property of a row rather than a hidden log.
- **What NOT to copy:** **immutability.** MoneyFlow deliberately allows edit-in-place
  with soft delete and undo, because a personal ledger's user is also its auditor.
  Copying non-editable posting would break Phase D's D3 and the *Accountable* trait.

### R3 — Plain-text accounting: history as a sequence of states

- **REFERENCE FACT:** plaintextaccounting.org describes immutable data under version
  control providing "an audit trail, unlimited 'undo', and collaboration"; Ledger and
  Beancount treat the journal as a file whose history is the record. [S3, S4, S5]
- **Mechanism observed:** the ledger is not only a set of rows but a *sequence of
  states*, and correction is a visible event in that sequence rather than an erasure.
- **Why relevant:** this is the seed of Territory C and the only reference that makes
  *recovery* the hero instead of a safety net.
- **What NOT to copy:** the text-file interface, command-line affordances, developer
  aesthetics, or genuine immutability. MoneyFlow's users do not write journal syntax and
  must not be made to feel they are operating a tool.

### R4 — Vietnamese diacritics and vertical space

- **REFERENCE FACT:** Vietnamese stacks a tone mark above a vowel that may already carry
  a diacritic (ế, ộ, ữ), and modern practice offsets the tone mark laterally rather than
  stacking it directly above the circumflex. Google Fonts' knowledge base treats
  diacritic support and vertical spacing as explicit design-system concerns. [S6, S7]
- **Mechanism observed:** Vietnamese needs more vertical headroom than Latin-1 at the
  same optical size, and a typeface must be *designed* for it rather than merely
  containing the codepoints.
- **Why relevant:** every territory's type direction and line-height rhythm must budget
  for this. A tight editorial leading that looks refined in English clips tone marks in
  Vietnamese — a legibility failure in the product's only language.
- **What NOT to copy:** nothing aesthetic. This is a constraint, not a reference.
- **Evidence limitation:** the Google Fonts pages are JavaScript-rendered and could not
  be fetched for direct quotation; the finding is recorded from the search result's
  summary of them, which is weaker evidence than a quoted primary source. Any territory
  taken forward must confirm diacritic behaviour by rendering real Vietnamese strings in
  the candidate face, not by trusting this note.

### Sources

| Ref | Source | Type |
|---|---|---|
| S1 | Oracle General Ledger User's Guide — [docs.oracle.com](https://docs.oracle.com/cd/E18727_01/doc.121/e13627/T312864T313560.htm) | first-party product documentation |
| S2 | Microsoft Learn — Dynamics 365 general-ledger journal/transaction views and Business Central audit trail — [learn.microsoft.com](https://learn.microsoft.com/en-us/dynamics365/finance/general-ledger/view-journal-entries-transactions) | first-party product documentation |
| S3 | plaintextaccounting.org — [plaintextaccounting.org](https://plaintextaccounting.org/What-is-Plain-Text-Accounting) | first-party community documentation |
| S4 | Ledger CLI documentation — [ledger-cli.org](https://ledger-cli.org/doc/ledger3.html) | first-party |
| S5 | Beancount — [beancount.github.io](https://beancount.github.io/) | first-party |
| S6 | Google Fonts Knowledge, diacritics and vertical spacing — [fonts.google.com](https://fonts.google.com/knowledge/using_type/vertical_spacing_and_line_height_in_design_systems) | first-party, **not directly fetchable**; see R4 limitation |
| S7 | Unicode combining diacritical marks — [unicode.org](https://www.unicode.org/charts/PDF/U0300.pdf) | standard |

**Research boundary.** Four mechanisms, read for structure rather than style. No
competitor screenshot, colour palette, typeface choice or layout was copied, and no
consumer finance app was used as an aesthetic reference. This is deliberately not a
visual-trend survey.

---

## 4. Territory A — **Sổ Cái** *(The Register)*

*Candidate name only. Not current authority.*

**1. Core thesis.** A trusted ledger earns trust by being **one continuous, inspectable
register** in which every figure is visibly a collapsed view of the rows beneath it — so
the interface's central object is the register itself, not a dashboard assembled from it.

**2. Hero idea.** The **collection**. What is visually central is the run of records with
their running position: date, kind, account, amount, and the balance the row produced.
An aggregate is a *heading over rows*, never a free-standing card.

**3. Visual metaphor.** The **ruled register spread** — the bound account book and the
bank passbook, where ruled lines and fixed columns do the organising work. Concretely:
horizontal rules that mean row boundaries, vertical alignment that means comparability,
and a right-hand position reserved for money. Not paper texture, not warmth, not
skeuomorphism — the *ruling system*, abstracted.

**4. Composition philosophy.**
- **Density:** high and deliberate. A phone screen shows many rows, not three cards.
- **Hierarchy:** established by rule weight and alignment rather than by size jumps or
  colour. A section heading is a heavier rule; a subtotal is a rule plus a shifted baseline.
- **Whitespace:** rhythmic rather than generous — consistent row height creates calm
  through repetition, which is how a register feels unhurried without being sparse.
- **Grouping:** by time band and by account, expressed as rule-bounded regions. **No
  cards** — cards are Calm Ledger's device and they fragment a register.
- **Information rhythm:** one scan direction (down the amount column), one comparison
  axis (across the row).
- **How evidence surfaces:** every aggregate is rendered as a header row that *expands
  in place* into its contributing rows. Traceability is literally the act of opening
  something.

**5. Colour direction.**
- **Primary family:** ink — a deep desaturated blue-black for text and rules, with a
  single mid-blue action colour. This is the one territory that stays近 the current
  Fresh Blue action family, deliberately, so the owner has a low-migration option.
- **Neutrals:** cool paper-white surfaces and a graduated rule scale (hairline, row,
  section, total). The neutral scale is the system.
- **Semantic money:** income, expense and transfer are **not** hue-first. Hue is a
  secondary confirmation only; see §11.
- **Light/dark:** dark mode inverts to near-black with the same rule hierarchy, which
  works because the system is structural. Rules must be re-tuned, not merely inverted —
  hairlines that read on white disappear on black.
- **Accessibility risks:** hairline rules are the whole hierarchy, so they must clear
  non-text contrast minimums at every step of the scale, and must survive user
  zoom and forced-colours mode. This is the territory's single biggest risk.

**6. Typography direction.**
- **Characteristics:** one grotesque family with a true tabular lining figure set,
  a real small-caps or all-caps label style for column heads, and at least four weights
  so hierarchy can come from weight rather than size.
- **Vietnamese:** the face must be *designed* for Vietnamese, with laterally offset tone
  marks; line-height budgeted for stacked marks at row density (R4). Row height is the
  constraint — this territory is the most likely of the three to clip diacritics.
- **Numerals:** tabular by default everywhere money appears, so columns align and digit
  changes do not reflow. Proportional figures only in prose.
- **Hierarchy character:** quiet and structural; size range narrow.
- **Why it fits:** *Exact* and *Legible* are carried by alignment and tabular figures;
  a narrow size range keeps it *Unhurried*.

**7. Graphic language.** Rules are the entire vocabulary: hairline (row), medium
(group), heavy (total). Surfaces are flat; elevation is reserved for genuine overlays.
Data marks are inline and small — a bar drawn *inside* a row rather than a separate
chart. Provenance appears as a compact origin column, not a badge. No illustration; no
photography.

**8. Iconography.** Minimal and monoline, at one weight matching the rule scale. Icons
are used for *actions*, never to carry financial meaning. Money kinds get glyphs
(§11), not pictograms.

**9. Motion philosophy.** Motion communicates **expansion and lineage**: opening an
aggregate into its rows is the one animated idea, and the animation shows containment
(rows emerge from under their heading). Never animate: a money value counting up, a
balance changing, or a row's arrival at the top of the register. Reduced motion: the
expansion becomes instantaneous, never a fade-in of numbers.

**10. Money presentation.** Position + sign + glyph + weight, with hue last. See §11.

**11. Product implications.** *Overview* becomes a short set of expandable headings over
real rows rather than a card grid. *Transactions/history* is the flagship and needs the
least change conceptually. *Manual capture* stays a fast overlay that returns you to the
register with the new row visible in place. *Accounts* becomes a register per account
with running balance. *Reports* are register sections with a period heading and drill.
*Plan* is visually the weakest here and must be given its own quieter rhythm so it does
not read as ledger truth. *Advanced review* is a staging register, visually distinct
from the ledger. *Ownership/settings* is plain and unstyled by comparison.

**12. Mobile/desktop.** Mobile is the risk case: fixed columns must collapse to a
two-line row that preserves the amount's right alignment. Desktop gains real columns and
is where the territory is strongest. The same rule scale governs both.

**13. Brand-strategy fit.** *Exact* — alignment and tabular figures make comparison
exact. *Unhurried* — repetition, not drama. *Accountable* — the correction path sits in
the row that is wrong. *Deferential* — no triage, no verdicts, only records in order.
*Legible* — one term per column head, consistent everywhere.

**14. Deliberate risks.** It can read as a **spreadsheet**, which Phase D's personality
boundary explicitly excludes. Dense rows plus Vietnamese diacritics is a genuine
legibility risk. Hairline hierarchy is fragile in dark mode, at zoom and in
forced-colours. It flatters history and position and is least flattering to planning.

**15. Build/migration cost — LOW to MEDIUM.** The current product is already
route/table-shaped, the action-colour family is close to what ships, and Phase C's target
puts Transactions at the centre anyway. Cost concentrates in one place: building a real
expandable aggregate-to-rows mechanism, which does not exist today.

**16. Refuses to copy.** Calm Ledger's card grouping and single-accent identity.
Enterprise GL terminology and density. Any dashboard-of-cards convention. The
attention-triage framing.

---

## 5. Territory B — **Biên Nhận** *(The Attested Record)*

*Candidate name only. Not current authority.*

**1. Core thesis.** A trusted ledger earns trust **one record at a time** — each entry is
a small attested object that carries where it came from, who accepted it and when, so
provenance is visible on the record itself rather than reachable through navigation.

**2. Hero idea.** The **object**. The single record, examinable in full: its amount, its
account, its origin (typed by you / from a file you supplied), its amendment history, and
its effect on the balance. The register exists, but it is a *list of objects*, and the
object is where the design energy goes.

**3. Visual metaphor.** The **countersigned slip** — a receipt or voucher whose
authority comes from its marks: an origin stamp, a timestamp, a signature line. The
transferable idea from R2 is that origin is a *property printed on the thing*. Not
paper texture and not nostalgia; the **stamp-and-field structure** of an attested
document.

**4. Composition philosophy.**
- **Density:** moderate in the list, low and generous inside a record. The product
  breathes at the point where trust is established.
- **Hierarchy:** amount first, kind and account second, provenance marks third but always
  present — never hidden behind a "details" disclosure, because hiding provenance
  defeats the thesis.
- **Whitespace:** used as framing around the record object, giving it edges.
- **Grouping:** by record, then by day. A record is a bounded field-set, not a card with
  a shadow — the boundary is a defined edge and an internal field grid.
- **Information rhythm:** list → object → provenance, always the same three steps.
- **How evidence surfaces:** an aggregate links to the *set of attested records* that
  produced it, and each of those states its own origin. Traceability is established at
  the leaf rather than along the path.

**5. Colour direction.**
- **Primary family:** a desaturated ink-teal, deliberately away from Fresh Blue, so the
  owner sees a genuinely different option. Action colour is a single saturated step of
  that family.
- **Neutrals:** two neutral planes — a page plane and a record plane — separated by a
  small value step, not by shadow.
- **Provenance chroma:** a restrained secondary family reserved *only* for origin marks
  (typed / imported / restored). This is the territory's distinguishing colour idea and
  must never be reused for money.
- **Semantic money:** as §11; hue is confirmation only.
- **Light/dark:** the two-plane system inverts cleanly. The provenance family must be
  re-picked for dark, not merely lightened.
- **Accessibility risks:** two colour systems (money semantics and provenance) coexisting
  is the risk — they must never be confusable, and provenance must also be readable as
  text, never as colour alone.

**6. Typography direction.**
- **Characteristics:** a two-family pairing — a humanist text face for record fields and
  provenance notes, and a distinct numeric treatment for the attested amount. The amount
  should feel *inscribed* rather than merely set.
- **Vietnamese:** the text face carries most of the Vietnamese, at comfortable sizes with
  real leading — this territory has the most headroom for diacritics and is the safest
  of the three on R4.
- **Numerals:** tabular in lists; a larger, tighter-tracked lining set for the attested
  amount inside a record.
- **Hierarchy character:** wider size range than A, because the object needs internal
  hierarchy.
- **Why it fits:** *Accountable* is literally printed on the record; *Legible* benefits
  from generous text setting.

**7. Graphic language.** Field rules and label/value pairs; a defined record edge; an
origin mark set (a small typographic stamp, not an illustration). Data marks are rare —
this territory does not want charts near a record. Provenance cues are the graphic
system. No illustration; no photography.

**8. Iconography.** A small, deliberately restricted set: origin, amendment, recovery,
attachment. Icons here carry *meaning* and therefore always ship with a text label — no
icon-only provenance.

**9. Motion philosophy.** Motion communicates **attestation and amendment**: a record
committing, and a record being amended or restored. The list itself barely moves. Never
animate: an amount, a balance, or the origin marks. Reduced motion: state changes are
immediate; the record's new state is announced in text.

**10. Money presentation.** See §11 — this territory has the strongest non-colour story
because the record states its kind in words.

**11. Product implications.** *Overview* is the weakest fit and must resist becoming a
gallery of objects; it should stay a short summary that links into records. *Transactions*
becomes a list of compact attestations that open into full objects. *Manual capture*
gains the most: entry is the moment of attestation, so the capture form and the record
share one structure. *Accounts* is a position summary plus its records. *Reports* must be
careful — aggregates are not attested objects and must not borrow the record's visual
authority. *Plan* reads clearly as *not* a record, which is a strength. *Advanced review*
is where provenance already exists and fits naturally. *Ownership/settings* is plain.

**12. Mobile/desktop.** Strongest on mobile of the three — an object-per-screen model is
natively phone-shaped. Desktop must avoid becoming a sparse list with a lot of empty
space; it likely needs a list-plus-record two-pane arrangement.

**13. Brand-strategy fit.** *Exact* — every field is named and shown. *Unhurried* — the
record is examined, not skimmed. *Accountable* — provenance and amendment are on the
object. *Deferential* — the record states facts and offers no verdict. *Legible* — labels
in Vietnamese, always paired with values.

**14. Deliberate risks.** It can **over-ceremonialise routine entry**, which directly
threatens fast capture — the daily loop must stay quick, and a territory about
attestation can make a 5-second action feel weighty. Low list density weakens "know
current position" and period scanning. Two colour systems risk confusion. Provenance
marks on every row can become visual noise once most rows are simply "typed".

**15. Build/migration cost — MEDIUM to HIGH.** A record-object surface does not exist
today; provenance is currently a property of Inbox candidates rather than of ledger rows,
so surfacing origin on every record is a data-presentation change with a real
dependency. The colour direction is a full retoken.

**16. Refuses to copy.** Signal Ledger's warm paper and editorial register. Receipt
skeuomorphism — no torn edges, no perforations, no paper texture. Banking-app card
metaphors. Immutability from R2.

---

## 6. Territory C — **Bản Ghi & Bản Sửa** *(State and Amendment)*

*Candidate name only. Not current authority.*

**1. Core thesis.** A trusted ledger earns trust by being **honest about change** — the
current state is always clearly marked as current, every amendment is visible as an
event rather than an erasure, and any figure can be understood as "the state produced by
these records, as of now."

**2. Hero idea.** The **timeline of the ledger's own state**. What is visually central is
the distinction between *what is true now* and *what changed to make it true*.
Correction and recovery stop being a safety net and become the product's most
characteristic behaviour.

**3. Visual metaphor.** The **amended entry** — the struck-and-restated line and the
marginal correction, as used in a kept book where you may not erase. The transferable
mechanism from R3 is that history is a sequence of states and a correction is an event in
it. Concretely: a current-state layer and a superseded layer, visually distinct and both
legible.

**4. Composition philosophy.**
- **Density:** medium, with a persistent structural distinction between current and
  prior state.
- **Hierarchy:** current state is always dominant; superseded content is present but
  clearly demoted — never merely faded, because fade alone fails contrast.
- **Whitespace:** used to separate *time*, not to decorate — gaps mean "later".
- **Grouping:** by state-change event as well as by day.
- **Information rhythm:** state → what produced it → what changed.
- **How evidence surfaces:** an aggregate carries an explicit "as of" and can be examined
  against the records that produced it, including the ones that were corrected. This is
  the only territory where the *history of a number*, not just its composition, is
  expressible.

**5. Colour direction.**
- **Primary family:** a neutral-forward system with a single restrained accent —
  deliberately the least chromatic of the three, because chroma is spent on **state**,
  not identity. A muted amber-adjacent family marks amendment; the accent is a cool
  slate.
- **Neutrals:** a wide, carefully stepped neutral ramp is the core asset — current,
  demoted and disabled must each be distinguishable *and* each meet contrast.
- **Semantic money:** as §11, with the additional burden that a superseded amount must
  still be readable and still legible as income/expense/transfer.
- **Light/dark:** hardest of the three. The current/superseded distinction must survive
  inversion without collapsing into "grey on grey".
- **Accessibility risks:** the largest of the three. Demotion by opacity is the obvious
  implementation and the wrong one — it fails contrast and forced-colours. Strikethrough
  as the sole signal fails for screen readers unless the state is also in text.

**6. Typography direction.**
- **Characteristics:** one family with a genuinely wide weight and width range, so
  current versus superseded can be expressed typographically rather than only
  chromatically. Italics must be well-drawn, since amendment notes want them.
- **Vietnamese:** demanding — italic and light weights are where Vietnamese diacritics
  most often degrade, so the family must be verified in those styles specifically, not
  just in the regular.
- **Numerals:** tabular throughout; a superseded amount must remain tabular so it aligns
  with the value that replaced it.
- **Hierarchy character:** hierarchy carries *state*, which is unusual and is the point.
- **Why it fits:** *Accountable* becomes the typographic system itself.

**7. Graphic language.** State markers, amendment rules, and a timeline spine. The
struck-and-restated pattern is the signature mark. Data marks show change over time
rather than composition. Provenance is present but secondary to amendment. No
illustration; no photography.

**8. Iconography.** A small set concerned with time and change: amended, restored,
current, superseded. As in B, these always carry text.

**9. Motion philosophy.** Motion communicates **supersession**: the old value moving to
its demoted position while the new value takes the current slot. This is the only
territory where motion is doing semantic work, which is also a risk. Never animate: a
balance recalculating, or a deletion vanishing without leaving its state marker.
Reduced motion: current and superseded simply appear in their final positions — the
meaning must never live only in the transition.

**10. Money presentation.** See §11, plus a state dimension: an amount is current or
superseded, and that is never expressed by colour or opacity alone.

**11. Product implications.** *Overview* gains an honest "as of" and loses any implication
of live truth. *Transactions* shows amendment history inline, which is a real change to
how a row is composed. *Manual capture* is unremarkable here — a strength, since it stays
fast. *Accounts* shows balance as a stated state. *Reports* can express "this period, as
recorded now", which is the most honest reporting of the three. *Plan* fits well, because
expectation-versus-actual is already a state comparison. *Advanced review* fits naturally
— candidates are pre-state. *Ownership/settings* is where restore lives and finally has a
visual home consistent with the rest of the product.

**12. Mobile/desktop.** Medium risk on mobile: showing two states in a narrow column
without doubling row height needs care, and the obvious answer (disclosure) hides the
thing the territory is about. Desktop can show state side by side.

**13. Brand-strategy fit.** *Exact* — every figure states its as-of. *Unhurried* — change
is shown as record, never as alert. *Accountable* — the strongest of the three by a wide
margin. *Deferential* — it reports what changed without judging it. *Legible* — depends
entirely on getting the current/superseded vocabulary right in Vietnamese.

**14. Deliberate risks.** It can make the product feel **preoccupied with mistakes**,
which threatens *Unhurried* and could make a user anxious about a ledger that keeps
showing them their corrections. It risks implying an immutability MoneyFlow does not
have (R2's "what not to copy"). Accessibility is the hardest of the three. And for the
many users who rarely correct anything, the hero mechanism is invisible in daily use —
a territory whose central idea most users may seldom see.

**15. Build/migration cost — HIGH.** Amendment history is not currently a presentable
property of a transaction; there is a mutation-audit concept in the data model but no
user-facing state history, so this territory depends on product capability that would
have to be specified and built. It is the only one of the three whose full expression is
blocked on more than presentation work.

**16. Refuses to copy.** Version-control and developer-tool aesthetics — no diff gutters,
no monospace-by-default, no commit-log styling. Plain-text-accounting's file metaphor.
Signal Ledger's attention triage, which would turn amendments into alerts.

---

## 7. Three-territory comparison matrix

Assessments are relative to each other, not absolute scores. No ranking is implied and
no winner is indicated.

| Criterion | A — Sổ Cái | B — Biên Nhận | C — Bản Ghi & Bản Sửa |
|---|---|---|---|
| **Distinctness of stance** | collection / spatial | object / attestational | timeline / temporal |
| **Phase D fit** | strong on Exact and Legible | strong on Accountable and Deferential | strongest on Accountable; most strain on Unhurried |
| **Manual-first fit** | good — capture returns to the register | **strongest** — entry *is* attestation | neutral — capture is unremarkable |
| **Traceability expression** | **strongest** — drill is the interface | strong at the leaf, weaker along the path | strong, and uniquely expresses a figure's *history* |
| **Correction/recovery expression** | present, undramatic | good — re-attestation is visible | **strongest** — it is the hero |
| **Vietnamese legibility** | **highest risk** — dense rows versus stacked tone marks | **safest** — generous text setting | risky in light/italic styles specifically |
| **Financial density** | **highest** | lowest in list, deep per record | medium, doubled by state |
| **Mobile robustness** | weakest — columns must collapse | **strongest** — object-per-screen is phone-shaped | medium — two states in a narrow column |
| **Accessibility risk** | hairline-rule contrast; forced-colours | two colour systems coexisting | **highest** — demotion by opacity/strikethrough is the trap |
| **Implementation cost** | **LOW–MEDIUM** | MEDIUM–HIGH | **HIGH** |
| **Legacy-replacement difficulty** | lowest — closest to shipped structure and action colour | medium — full retoken, new record surface | highest — needs product capability, not just presentation |
| **Long-term system potential** | scales well to any tabular surface; may feel narrow if the product ever broadens | strong identity; scales poorly to dense analysis | most distinctive long-term idea; most expensive to hold to |

---

## 8. Accessibility, Vietnamese and money-legibility comparison

### Money without colour — required of all three

The non-chromatic rule is not satisfied by "we also use a minus sign". Each territory
must distinguish **income, expense, transfer and balance** by at least two non-chromatic
channels.

| Channel | A — Sổ Cái | B — Biên Nhận | C — Bản Ghi & Bản Sửa |
|---|---|---|---|
| Sign | explicit `+` / `−`; transfer neither | explicit on the attested amount | explicit, on both current and superseded values |
| Position/structure | **column position** is the primary channel; transfers occupy a distinct column treatment | field label inside the record names the kind in Vietnamese | current/superseded slot, plus sign |
| Glyph | small directional mark per kind, one weight | kind mark in the origin/kind field | kind mark plus state mark |
| Typographic weight | totals heavier; transfers set at text weight to recede from income/expense | attested amount inscribed; transfer amount set plainly | current bolder than superseded — but never *only* that |
| Text | column head names the kind | **the record states its kind in words** — strongest of the three | state stated in words: "đã sửa", "hiện tại" |
| Hue | confirmation only, never the sole carrier | confirmation only; provenance chroma must never be mistaken for money | confirmation only; chroma is spent on state, not kind |

**Balance** is distinguished in all three by being a *running or stated position* rather
than a signed movement — it never takes a `+`/`−`, which is itself a non-chromatic signal.

### Vietnamese

| Concern | A | B | C |
|---|---|---|---|
| Stacked tone marks at row density | **highest risk** — must budget line-height for ế/ộ/ữ at the chosen row height | comfortable | risky specifically in light and italic styles |
| Vietnamese string length in narrow columns | high risk — labels must be real Vietnamese, never abbreviated English | manageable | manageable |
| Diacritics against rules/strikethrough | tone marks must not collide with a row rule above | low | **strikethrough must not cross diacritics** — a real collision risk |
| Verification required before adoption | render real Vietnamese at the true row height | render at record sizes | render in light/italic/struck states |

Common requirement: no territory may be evaluated on English placeholder text. A board
or mock that reads convincingly in English and clips in Vietnamese has proved nothing.

### Accessibility requirements common to all three

- Non-text contrast for rules, edges, state markers and origin marks — not just text.
- Forced-colours mode must preserve every meaning that a rule, opacity step or chroma
  carries; anything that survives only as colour or opacity is a defect.
- Reduced motion must never remove meaning, only transition.
- Every icon carrying financial or provenance meaning ships with a text equivalent.
- Focus visibility must survive on dense rows (A), on record edges (B) and on demoted
  content (C).

---

## 9. Migration-cost comparison

Cost is relative and covers presentation, tokens, components and any product capability
a territory depends on. None of this is authorised by Phase E.

| Dimension | A — Sổ Cái | B — Biên Nhận | C — Bản Ghi & Bản Sửa |
|---|---|---|---|
| Token change | small — neutral ramp and rule scale extend the current system; action family stays close to Fresh Blue | large — new primary family, plus a provenance family that does not exist | large — wide neutral ramp plus a state family |
| Component change | medium — expandable aggregate rows are new | large — a record-object surface is new | large — inline amendment presentation is new |
| Route/IA change | low — matches Phase C's target already | medium — list/record split affects several routes | medium |
| Product capability needed | none beyond drill-down wiring | provenance must become a presentable property of ledger rows | **user-facing amendment history must be specified and built** |
| Legacy CSS retirement | most tractable — structural rules replace card styling | medium | medium |
| Risk to shipped behaviour | lowest | medium | highest |
| **Overall** | **LOW–MEDIUM** | **MEDIUM–HIGH** | **HIGH** |

A note the owner should weigh: **A's low cost is not an argument that A is right.** It is
the closest to what already ships, which makes it cheapest and also the least likely to
change how the product is perceived.

---

## 10. Owner decision pack

### A — Sổ Cái *(The Register)*

- **Strongest reason to choose:** it makes the brand's central promise *structural* —
  traceability becomes the way you navigate, not a claim. It is also the cheapest to
  reach and the closest to Phase C's target architecture.
- **Strongest reason not to choose:** it is the most likely to read as a spreadsheet,
  which Phase D explicitly excludes, and it carries the highest Vietnamese legibility
  risk at the density that makes it work.
- **What you would be committing to:** density as an identity; building a real
  aggregate-to-rows drill mechanism; and disciplined rule-contrast work across light,
  dark, zoom and forced-colours.

### B — Biên Nhận *(The Attested Record)*

- **Strongest reason to choose:** it is the only territory where provenance is visible
  without navigating anywhere, it is the strongest on mobile, and it makes manual capture
  — the product's default identity — the moment the brand is most itself.
- **Strongest reason not to choose:** it risks making a five-second daily action feel
  ceremonial, and its low list density is a poor fit for scanning a period or a position.
- **What you would be committing to:** a full retoken; making origin a presentable
  property of every ledger row; and holding two colour systems apart forever.

### C — Bản Ghi & Bản Sửa *(State and Amendment)*

- **Strongest reason to choose:** it is the most distinctive idea available and the
  strongest possible expression of *Accountable* — a product that is visibly honest about
  its own changes is very hard for a competitor to imitate.
- **Strongest reason not to choose:** it is the most expensive, the hardest to make
  accessible, it depends on product capability that does not yet exist, and its hero
  mechanism is invisible to users who rarely correct anything.
- **What you would be committing to:** specifying and building user-facing amendment
  history; solving current-versus-superseded accessibly without relying on opacity or
  strikethrough; and accepting that the brand's signature is a behaviour some users will
  seldom trigger.

### OWNER SELECTION: PENDING

No territory is recommended. Phase E does not select, and no recommendation will be
offered unless the owner asks for one after reading this.

---

## 11. Decisions deliberately NOT made

1. **Which territory wins.** Owner decision.
2. **Any production palette, token value, hex or ramp.** Colour *directions* are
   described; no value is specified and none is authorised.
3. **Any typeface.** Characteristics and Vietnamese requirements are stated; no family is
   named, licensed or chosen.
4. **Any component, layout, route or screen design.** Product implications describe
   consequence, not design.
5. **Whether Fresh Blue is replaced.** It remains the shipped implementation. A
   territory's colour direction is a proposal, and only an owner selection plus an
   approved migration could change what ships.
6. **Motion timing, easing or duration.** Only what motion may mean.
7. **Icon set, illustration style or photography.** Only stance.
8. **Design System v3, Design Harness changes, or any token authority.** Untouched.
9. **Whether amendment history should be built** (C's dependency). That is a product
   decision that would follow selection, not precede it.

---

## 12. Phase F handoff — conditional on owner selection

**Phase F does not start, and cannot start, until the owner selects a territory.** This
section describes what would then be true; it is not an instruction to proceed.

On selection, Phase F would need to:

1. Record the selection in `docs/design/DESIGN_DIRECTION_STATUS.md`, which owns colour
   direction, and state explicitly what it supersedes and when — Fresh Blue remains
   shipped until an approved migration replaces it.
2. Convert the selected territory's *direction* into candidate tokens, verified against
   the non-chromatic money rule and contrast requirements in both themes, at zoom and in
   forced-colours.
3. Verify the type direction by rendering **real Vietnamese** — including stacked tone
   marks in the exact styles the territory relies on — at the true sizes and row heights,
   before any family is chosen.
4. Respect A0's replace-and-retire guardrail: the new presentation may not be added as
   another root or global layer, and the owning slice must declare which legacy owner
   remains and when its deletion becomes safe.
5. Follow Phase C's target architecture for what belongs where; Phase E changes no
   information architecture.
6. Treat C's amendment history, if C is selected, as a **product capability to specify
   first** — not as a presentation problem.

Unchanged regardless of selection: Phase D's locked strategy, Phase C's architecture,
the non-chromatic money rule, transfer neutrality, the demo/authenticated boundary, and
the backup-versus-scoped-export distinction.
