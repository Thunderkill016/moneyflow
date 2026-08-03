# Design source — YouTube `gztp0z_yhI0`

- **Source URL:** https://www.youtube.com/watch?v=gztp0z_yhI0
- **Video ID:** `gztp0z_yhI0`
- **Creator named in owner notes:** Omar Farook
- **Example product:** Granular, an education platform
- **Registered:** 2026-08-03
- **Evidence added:** 2026-08-03
- **Status:** owner-supplied structured summary and timestamped notes recorded; title and full transcript remain independently unverified
- **Authority:** research input only; never overrides current code, MoneyFlow policy, active design status or owner decisions

## Why this source exists

This source was supplied by the owner to help a dedicated MoneyFlow design branch learn stronger product-design and design-engineering practices.

The goal is not to copy Granular's visual style, pixel treatment, logo or brand book. The useful subject is the demonstrated **iterative art-direction process**: begin with strategy, refine one controlled visual variable at a time, freeze the core mark before expanding the system, and only then package and publish the result.

## Evidence boundary

The notes below are grounded in the owner's timestamped summary of the video. They support claims about the process and examples explicitly described there.

They do not establish:

- the video's exact title, full wording or complete transcript;
- whether every generated artifact met professional accessibility, trademark or production standards;
- that one comprehensive prompt is sufficient without a previously resolved logo and clear art direction;
- that Claude, HTMLPub or any named tool is required for the workflow;
- that Granular's visual language is appropriate for MoneyFlow.

Any later claim that depends on exact wording, omitted steps or unshown results still requires transcript or direct video verification.

## Source-derived process

### 1. Strategy before visual generation — 0:32–1:23

The creator first establishes Granular's core philosophy around precision and design craft before asking for logo variations.

**Atomic observation:** initial generation is constrained by a defined brand idea rather than an isolated request for a good-looking logo.

**Category:** product principle and design workflow.

**What this establishes:** strategy gives the model a direction against which concepts can be judged.

**What it does not establish:** that a short philosophy alone is a complete brand strategy or substitutes for audience, positioning and competitive research.

### 2. Iterative art direction — 1:23–6:37

The creator uses multiple back-and-forth prompts instead of expecting a final identity from one prompt. Refinement focuses on explicit visual variables and observable defects.

Demonstrated refinements include:

- adjusting pixel-grid density at approximately 3:07;
- simplifying the `G` mark toward a retro-pixel treatment at approximately 4:47;
- balancing scale and padding and applying a squircle container at approximately 5:43.

**Atomic observation:** each iteration narrows the problem and changes named properties rather than asking the model to make it better in general.

**Category:** art direction, visual-system technique and AI collaboration workflow.

**What this establishes:** precise critique and controlled iteration can move an AI-generated concept toward a coherent resolved mark.

**What it does not establish:** that pixel density, retro-pixel styling or squircles are generally superior, or that they belong in MoneyFlow.

### 3. Expand only after the mark is resolved — 6:37–10:36

After finalizing the logo, the creator uses one comprehensive prompt to generate a broader brand-guideline system containing:

- brand philosophy and voice;
- typography;
- color palettes;
- logo usage rules, including do's and don'ts;
- mockups showing the brand in context.

**Atomic observation:** the large synthesis prompt comes after a sequence of small directional decisions; it packages an already established direction rather than discovering everything at once.

**Category:** brand-system documentation and workflow sequencing.

**What this establishes:** a comprehensive prompt is more useful after the identity's core decisions are stable.

**What it does not establish:** that generated guidelines are automatically internally consistent, accessible, legally safe or implementation-ready.

### 4. Publish the artifact — 11:30–13:01

The creator uses HTMLPub's MCP connector to publish the generated brand guidelines from Claude to a live, shareable URL.

**Atomic observation:** the workflow treats publishing and presentation as a final operational step after strategy, refinement and system generation.

**Category:** tool-specific implementation and design handoff.

**What this establishes:** an MCP-connected publishing tool can reduce friction between generated documentation and a reviewable live artifact.

**What it does not establish:** that HTMLPub is required, that the published page is the durable source of truth, or that live publishing proves design quality.

## Timestamped learning ledger

| Timestamp | Source-derived observation | Design category | MoneyFlow applicability | Evidence or experiment needed | Decision |
|---|---|---|---|---|---|
| 0:32–1:23 | Define philosophy around precision and craft before logo generation | Strategy / workflow | Define MoneyFlow user promise and design tension before generating marks or screens | Review against product principles and real user jobs | Retain as workflow principle |
| 1:23–3:07 | Refine through back-and-forth prompts rather than a single-shot request | Art direction | Replace vague prompts with named variables and explicit defects | Compare controlled iteration with broad regeneration on one bounded artifact | Retain as operating method |
| ~3:07 | Adjust pixel-grid density as one isolated variable | Visual technique | Learn variable isolation, not the pixel style itself | Record before/after and judge legibility at target sizes | Technique only; style not adopted |
| ~4:47 | Simplify the `G` mark toward a retro-pixel form | Logo refinement | Simplification may improve recognition, but must be tested for MoneyFlow's own mark | Test silhouette, small-size recognition and semantic fit | Hypothesis only |
| ~5:43 | Balance scale, padding and squircle containment | Composition / geometry | Use explicit optical-balance criteria for icons and app marks | Test multiple sizes and contexts; do not assume squircle is correct | Method retained; shape undecided |
| 6:37–10:36 | Generate philosophy, voice, type, color, usage rules and mockups after logo resolution | Brand-system synthesis | Build a full identity system only after owner selects the core direction | Check semantic colors, Vietnamese typography, accessibility and implementation tokens | Retain with validation requirement |
| 11:30–13:01 | Publish guidelines through HTMLPub MCP to a live URL | Handoff / publishing | A live review artifact may improve owner feedback | Ensure repository remains durable authority and no private material is exposed | Optional tool pattern |

## MoneyFlow translation

The reusable lesson is not “use Claude to generate a brand in one prompt.” The source demonstrates a staged sequence:

1. define the strategic idea;
2. generate multiple initial concepts;
3. select a promising direction provisionally;
4. critique observable properties;
5. change one or a small number of variables per iteration;
6. test scale, padding, recognition and contextual use;
7. freeze the selected core only after owner review;
8. generate the wider system from the resolved core;
9. validate typography, semantic color, accessibility and implementation feasibility;
10. publish a review artifact without replacing repository authority.

For MoneyFlow, this sequence should be applied to a bounded identity or interface problem. It must not silently replace the selected semantic color architecture or activate a new logo, layout or brand voice without owner approval.

## Prompting pattern extracted from the source

A useful art-direction prompt should contain:

- the strategic idea that must remain visible;
- the exact artifact and current candidate being discussed;
- one named problem or variable;
- the intended change;
- what must remain unchanged;
- the contexts or sizes in which the result must work;
- the criteria used to judge success.

Weak instruction:

> Make the logo more professional.

Source-informed instruction pattern:

> Preserve the current `G` concept and overall silhouette. Reduce the internal grid density, simplify competing details, and rebalance optical padding inside the container. Show the mark at favicon, app-icon and wordmark sizes. Do not change the approved color roles yet.

This is an adapted workflow pattern, not a quotation from the video.

## MoneyFlow constraints for interpretation

Any retained lesson must respect:

- manual-first Vietnamese income-and-expense ledger identity;
- integer-VND and truthful financial semantics;
- no invented balance, income, commitment, reserve or advice;
- mobile-first and long Vietnamese content;
- one primary action per viewport;
- financial meaning cannot rely on color alone;
- selected semantic color architecture in `docs/design/BRAND_COLOR_SYSTEM.md`;
- rejected named concepts are not defaults;
- owner selection before a candidate becomes active direction.

## Recommended first experiment

Use the art-direction loop on one bounded artifact rather than redesigning MoneyFlow wholesale.

Candidate experiment:

- define the job and strategic idea for the MoneyFlow app mark or one core screen;
- produce three structurally distinct directions;
- choose one provisional candidate for critique;
- run three to five iterations, each naming the exact variable being changed;
- create a compact usage sheet only after owner selection;
- test small size, long Vietnamese content, light/dark mode and non-color meaning where applicable;
- keep all generated output candidate-only until reviewed.
