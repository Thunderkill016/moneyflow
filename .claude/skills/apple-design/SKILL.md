---
name: apple-design
description: Concrete, execution-level Apple design knowledge — fluid-interface motion physics (springs, velocity handoff, momentum projection), typography tracking/leading, translucent materials, multimodal feedback, and the WWDC26 eight design foundations. Use when implementing or reviewing motion, touch targets, typography scale, or translucent surfaces, alongside (not instead of) MoneyFlow's own docs/DESIGN_HANDBOOK.md and docs/design/CALM_LEDGER_V2.md.
license: Complete terms in LICENSE.txt
---

# Apple Design — Complete Reference

This document distills Apple's fluid interface principles from WWDC talks (primarily *Designing Fluid Interfaces*, 2018) for web implementation. Adapted from [emilkowalski/skills](https://github.com/emilkowalski/skills) (MIT, see LICENSE.txt).

## MoneyFlow application notes

This skill is execution-level ("how does a spring/typography/material behave"), not policy-level. It does not replace or outrank:

- `docs/product/PRINCIPLES.md` and the financial invariants in `AGENTS.md` — never let a motion or material choice imply data that doesn't exist, or make a destructive action feel casual.
- `docs/DESIGN_HANDBOOK.md` and `docs/research/06_CODEX_APPLE_UI_WORKFLOW.md` — the policy-level translation of the same WWDC26 eight foundations (§16 below) into MoneyFlow's review rubric and Codex workflow.
- `docs/design/CALM_LEDGER_V2.md` and `docs/design-system.md` — MoneyFlow's own tokens and visual contract. Apple's specific pixel/easing values below are a reference point, not a mandate to copy Apple's visual style; "make it Apple-like" as a literal visual request is an anti-pattern (see §17 and `docs/research/06_CODEX_APPLE_UI_WORKFLOW.md`'s anti-patterns list).

Use this file when a task involves: touch target sizing, transition/animation timing, drag/swipe/sheet gestures, `prefers-reduced-motion` handling, letter-spacing/line-height on headings or large VND figures, or translucent surfaces (dialogs, nav, sheets).

## Core Philosophy

The central idea: **"When we align the interface to the way we think and move, something magical happens."** Interfaces feel alive when motion begins from the current on-screen state, incorporates user velocity, projects momentum, and remains interruptible at any moment. Springs accomplish this naturally.

Apple frames design around four human needs: safety/predictability, understanding, achievement, and joy.

## 1. Response — Eliminate Latency

Lag destroys the sense of directness immediately.

- Provide feedback on `pointerdown`, not release; highlight buttons instantly
- Audit and remove all non-essential latency (debounces, timers, transition delays, the ~300ms tap delay)
- Feedback must be **continuous during interaction**, not just at completion—update UI 1:1 with pointer movement during drags, sliders, drawers

## 2. Direct Manipulation — 1:1 Tracking

Touch and content must move together. When dragging, the grabbed point stays glued to the finger.

- Use Pointer Events with `setPointerCapture` for tracking beyond element bounds
- Maintain velocity/position history from recent `pointermove` events (needed for release velocity)
- Respect the grab offset; snapping to center breaks the illusion

## 3. Interruptibility — The Cornerstone Principle

**"The thought and the gesture happen in parallel."** Every animation must be grabbable and reversible mid-flight without waiting for completion.

- Never lock input during transitions
- Always animate **from the presentation (current) value**, never the target—on interrupt, read live on-screen transform and start the new animation there. Starting from the logical target causes visible jumps
- Avoid CSS transitions and `@keyframes` for gesture-driven interactions; they cannot be smoothly interrupted. Use springs (inherently velocity-aware and re-targetable)
- When reversing a gesture, blend velocity rather than hard-cutting it. Replacing one animation with another at reversal creates a velocity discontinuity; spring libraries that carry velocity through re-targeting avoid this
- Decompose 2D motion into independent X and Y springs—a single spring on 2D distance desynchronizes when components have different velocities

## 4. Behavior Over Animation — Springs

Pre-scripted, fixed-duration animations cannot respond to new input. Springs can—new input simply changes the target, motion stays continuous.

**Apple's parameters (more designer-friendly than mass/stiffness/damping):**

- **Damping ratio**: Controls overshoot. `1.0` = critically damped (no bounce, smooth settle); `< 1.0` = overshoot and oscillate; lower = bouncier
- **Response**: How quickly the value reaches target, in seconds. Lower = snappier. This is *not* duration; settle time emerges from parameters

**Guidelines:**

- Start most UI at **damping `1.0`** (critically damped)—graceful, non-distracting
- Add bounce (**damping ~`0.8`**) **only when the gesture carried momentum** (flick, throw, drag release). Overshoot on a fading menu feels wrong; overshoot on a flicked card feels right

**Concrete Apple values:**

| Interaction | Damping | Response |
|---|---|---|
| Move/reposition (PiP) | 1.0 | 0.4 |
| Rotation | 0.8 | 0.4 |
| Drawer/sheet | 0.8 | 0.3 |

Web mapping (Motion/Framer Motion): `bounce` + `duration` correspond closely to damping + response. Safe default: `damping: 1.0` springs everywhere; reserve bounce for momentum-driven, physical interactions.

## 5. Velocity Handoff — The Drag-to-Animation Seam

When a gesture ends, the animation must continue at the finger's exact release velocity—creating no visible seam between dragging and animating.

Pass the pointer's release velocity to the spring's initial velocity. Some spring APIs require **relative velocity**:

```
relativeVelocity = gestureVelocity / (targetValue − currentValue)
```

Example: element at `y=50`, target `y=150` (100px to go), finger moving 50px/s → initial spring velocity = `50 / 100 = 0.5`.

Framer Motion / Motion accept absolute px/s velocity directly (`velocity` option), so typically pass the raw value.

## 6. Momentum Projection — Animate to Where the Gesture Is Going

Don't snap to the nearest boundary from the release point. Use velocity to **project the resting position** (like scroll deceleration), then snap to the target nearest that projection.

Apple's projection function (from *Designing Fluid Interfaces* sample code):

```js
function project(initialVelocity /* px/s */, decelerationRate = 0.998) {
  return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
}

const projectedEndpoint = currentPosition + project(releaseVelocity);
const target = nearestSnapPoint(projectedEndpoint);
animateSpringTo(target, { velocity: releaseVelocity });
```

Note: this uses exponential decay, **not** the physics-textbook `v²/(2·decel)`. This is standard in quality bottom-sheets and carousels (Vaul, Embla).

## 7. Spatial Consistency — Symmetric Paths, Anchored Origins

**"If something disappears one way, we expect it to emerge from where it came."**

- Enter and exit along the same path. A panel sliding in from the right must dismiss to the right
- Anchor interactions to their source. Menus, popovers, sheets should originate from the triggering element; set `transform-origin` to the trigger
- Mirror easing on reversible transitions so the outbound path matches the return path (use inverse cubic-bézier control points)

## 8. Hint in the Direction of the Gesture

Humans predict final state from trajectory. Intermediate motion should telegraph the outcome—"Control Center modules grow up and out toward your finger." Make in-between frames point toward the result, not just interpolate blindly.

## 9. Rubber-Banding — Soft Boundaries

At an edge, resist progressively rather than stopping hard. Continuous resistance reads as "responsive, but there's nothing more here."

```js
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
```

## 10. Gesture Design Details — The "Feel" Checklist

- **Tap**: Highlight on touch-down (instant); commit on touch-up. Add ~10px hysteresis/hit padding; allow cancel-by-dragging-away-and-back
- **Drag/swipe**: Require small movement threshold (~10px) before committing to a direction; then track 1:1
- **Detect all plausible gestures in parallel** from the first move, then confidently cancel losers once intent clears. Avoid recognizers reporting only final state (`swipeleft` events)—they discard continuous tracking needed for feedback
- **Minimize disambiguation delays.** Double-tap detection unavoidably delays single taps; only pay that cost where double-tap truly exists

## 11. Frame-Level Smoothness

Smoothness is about *what's in the frames*, not just frame rate.

- Keep per-frame positional change below perception threshold to avoid strobing
- For very fast motion, subtle motion blur or stretch encodes speed better than a hard streak
- Use `requestAnimationFrame` (web's display-synced clock; Apple uses `CADisplayLink`)
- Animate only compositor-friendly properties (`transform`, `opacity`); hint with `will-change`

## 12. Materials & Depth — Translucency Conveys Hierarchy

Translucent materials function as floating, non-focus-stealing structural layers. Approximate on web with `backdrop-filter`.

- Build nav/toolbars/sheets as translucent layers (backdrop-filter: blur() + semi-transparent background) with content scrolling underneath—not opaque fixed strips
- Material weight encodes hierarchy: darker/heavier separates structural regions (sidebars); lighter draws attention to interactive elements. Never stack light translucent on another
- Bigger surfaces read as thicker: stronger blur + deeper shadow than small chips. Use context-aware shadow—heavier over busy/text content, lighter over plain backgrounds
- Dim to focus, separate to maintain flow. Modal tasks pair surface with dimming scrim, pushing background back/down. Parallel non-blocking panels use translucency + offset without scrim. Stacked sheets progressively dim and push back each parent
- Vibrancy keeps text legible over changing backgrounds. Over blurred/translucent surfaces, use higher contrast, slightly heavier weight, small letter-spacing bump; put color on solid layers
- Use scroll edge effects (fade/blur/gradient mask) instead of hard dividers where floating chrome overlaps content
- Materialize, don't just fade: animate blur radius + scale together on enter/exit so surfaces read as arriving materials, not plain opacity fades

```css
.toolbar {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.4); /* bright edge = light catching material */
}
```

## 13. Multimodal Feedback — Motion + Sound + Haptics

Three rules (from *Designing Audio-Haptic Experiences*):

1. **Causality**: Must be obvious what caused feedback. Trigger on the actual causal event (toggle flip, item snap); match character to action physicality
2. **Harmony**: Visual, sound, and haptic must fire on the **same frame**. Latency between them destroys illusion. Don't let CSS transitions lag audio/haptic (Vibration API)
3. **Utility**: Add feedback only where it earns its place. Reserve haptics/sound for meaningful moments (success, error, commit, snap)—over-feedback trains users to ignore it

## 14. Reduced Motion & Accessibility

Reduced motion doesn't mean no feedback—it means gentler, non-vestibular equivalents. Respond to three signals, baking them into components:

- **`prefers-reduced-motion: reduce`**: Replace slides/springs/parallax with short opacity cross-fades or static transitions. Drop elastic/overshoot. Keep opacity/color changes aiding comprehension
- **`prefers-reduced-transparency: reduce`**: Make translucent surfaces frostier/solid—raise background opacity, drop blur
- **`prefers-contrast: more`**: Near-solid backgrounds with defined, contrasting borders

Also avoid: full-viewport moving backgrounds, slow looping oscillations (near 0.2 Hz / one cycle per 5s), abrupt brightness jumps (ease dark↔light theme changes). Make large moving objects semi-transparent while traveling; fade big surfaces out during large repositioning and back in when settled.

```css
@media (prefers-reduced-motion: reduce) {
  .sheet { transition: opacity 200ms ease; transform: none !important; }
}
@media (prefers-reduced-transparency: reduce) {
  .toolbar { background: white; backdrop-filter: none; }
}
```

MoneyFlow already applies a blanket `* { transition-duration: .01ms !important; ... }` override under `@media (prefers-reduced-motion: reduce)` in `src/app/globals.css`; new motion work should stay compatible with that override rather than add a parallel mechanism.

## 15. Typography — Optical Sizing, Tracking, Leading

(From *The Details of UI Typography*, WWDC 2020.)

- **Tracking (letter-spacing) is size-specific**—never one value for all sizes. Large display text needs *negative* tracking (letters read too far apart as they grow); small text needs *positive* for legibility. Tighten headings; leave body near `0`
- **Leading (line-height) tracks size inversely**: tight on large headings, looser on body. Increase for scripts with tall ascenders/descenders; tighten for dense, information-heavy UI
- **Build hierarchy from weight + size + leading as a set**, not size alone. Emphasize with weight
- **Respect user's text-size setting** (Dynamic Type). Scale layout *with* text—use `rem`/`em`, not fixed px—so larger font doesn't break layout
- **Default to platform system font** before custom faces (already ships optical sizing, tracking tables, legibility tuning)

```css
:root { font: 100%/1.5 system-ui, sans-serif; }

.display {
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.05;        /* tight leading for large text */
  letter-spacing: -0.02em;  /* negative tracking */
  font-optical-sizing: auto;
}
```

MoneyFlow's `globals.css` headings and VND amounts already follow the negative-tracking-scales-with-size rule (e.g. `.welcome-row h1` at `-.045em`, `.safe-card h2` at `-.055em`, `.amount-field input` at `-.04em`) — match this pattern rather than introducing a flat letter-spacing value on new large text.

## 16. Design Foundations — Eight Principles

These principles (from *Principles of Great Design*, WWDC 2026) anchor all motion and craft:

1. **Purpose**: Make with intention; decide what *not* to build. Every feature asks for time, attention, trust—spend that budget only where it pays off
2. **Agency**: Keep people in control—offer choices, don't force single paths. Back it with forgiveness: easy undo for slips; confirmation dialogs only for genuinely irreversible actions (use sparingly)
3. **Responsibility**: Act in user's interest. Privacy: ask at right moment, only for what's needed, transparently. Safety: anticipate misuse/harm (especially with AI). Add previews, confirmations, disclaimers; cut features whose risk outweighs value
4. **Familiarity**: Build on what people know. Use metaphors neither too literal nor too abstract (trash can = delete), honor their physics. Be consistent: same appearance = same behavior, same place. Only break familiar patterns if provably better—test, don't assume
5. **Flexibility**: Design for different contexts, devices, abilities. Adapt to platform (iPhone = quick touch; desktop = deep workflows, precise pointer). Design inclusively. When no single layout fits all, let people personalize—rearrange controls, hide unused
6. **Simplicity — not minimalism**: Strip the unnecessary so core purpose shines. Be concise (plain language, no jargon, fewer steps) and clear (use hierarchy—order, spacing, contrast—so most important is most obvious). Every element earns its place. Sometimes *adding* context simplifies
7. **Craft**: Uncompromising detail builds trust. Beautiful typography, adaptive colors, clear icons, responsive animations giving immediate, natural feedback. Nothing is random—every spacing, timing, alignment is deliberate. Jittery scroll, misaligned icons, breaking layouts read as carelessness. Craft needs iteration and longevity
8. **Delight**: The result of getting the other seven right, not confetti tacked on. Decide the emotion you want people to feel (calm, confident, excited) and reinforce it in every decision

**Tactical rules serving these:**

- **Feedback kinds**: status, completion, warning, error. Confirm meaningful actions; expose ongoing status; warn before problems; validate inline (not on submit)
- **Wayfinding**: Every screen answers: Where am I? Where can I go? What's there? How do I get out? Never trap the user
- **Grouping & mapping**: Proximity implies relationship. Place controls near what they affect; arrange to mirror what they change. If a label is needed to explain a control, the mapping is weak
- **Direct, specific labels beat safe generic ones**: Name nav items for their contents ("Progress", "Library"), not vague umbrellas ("Home")

These same eight foundations are translated to MoneyFlow's product/financial context (with "calm confidence" as the target delight emotion) in `docs/research/06_CODEX_APPLE_UI_WORKFLOW.md`; treat that file as the authoritative MoneyFlow-specific reading of this list.

## 17. Process

- **Prototype interactively**—an interactive demo outweighs "a million static designs." Discover the interface by building and playing with it; working prototypes set concrete bars preventing mediocre final implementations
- **Design interaction and visuals together**: **"You shouldn't be able to tell where one ends and the other begins."** Motion is not a layer added after pixels
- **Test with real people in real context**; review motion with fresh eyes—play in slow motion / frame-by-frame to catch what's invisible at full speed

Anti-pattern for MoneyFlow specifically: treating "Apple-like" as a literal visual/material request (glass, platform chrome, SF Symbols) rather than as these behavioral/craft principles — see the anti-patterns list in `docs/research/06_CODEX_APPLE_UI_WORKFLOW.md`.

## Quick Reference Table

| Need | Technique | Concrete value |
|---|---|---|
| Default UI spring | Critically damped, no overshoot | damping 1.0, response 0.3–0.4 |
| Momentum/flick spring | Under-damped, slight bounce | damping ~0.8, response 0.3–0.4 |
| Gesture → spring velocity | Hand off release velocity | gestureVelocity / (target − current) if normalized |
| Flick landing point | Project momentum | current + (v/1000)·d/(1−d), d ≈ 0.998 |
| Interrupt cleanly | Start from presentation value | read on-screen transform |
| Avoid reversal "brick wall" | Carry velocity through re-target | spring blending velocity |
| Reversible transition | Mirror easing curve | inverse cubic-bézier |
| Decide reverse vs. commit | Use velocity **sign**, not position | at release |
| 1:1 drag | Pointer Events + capture | respect grab offset |
| Feedback | On pointer-down, continuous | never only at end |
| Boundary | Rubber-band, don't hard-stop | progressive resistance |
| Translucent chrome | `backdrop-filter` layer | content scrolls under |
| Type tracking | Size-specific, never fixed | tighten large text (−0.02em), body near 0 |
| Reduced motion | Cross-fade, not slide/spring | @media (prefers-reduced-motion) |
| Touch target | Minimum tappable area | 44×44 CSS px |

This reference preserves all concrete rules, checklists, code examples, and guidance from the source for direct application to product work.
