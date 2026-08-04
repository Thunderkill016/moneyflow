# MoneyFlow — current-state audit for Neon Blue study

**Status:** design evidence — not implementation authority  
**Audit target:** current `main` before any Neon Blue replacement  
**Production authority during study:** Fresh Blue

## 1. Audit purpose

This audit answers one question: what must a Neon Blue system improve, preserve or avoid before any production token is changed?

The owner has already selected Neon Blue as the hue family to investigate. The unresolved decision is how it should be applied across identity, actions, navigation, product proof, workspace states and charts.

## 2. Current strengths to preserve

- One semantic theme authority owns project-wide brand, interaction and financial roles.
- Public routes are Light-only; the signed-in workspace restores Light, Dark or System preference.
- The B3.2 symbol is shared across landing, authentication and the signed-in shell.
- Income, expense, warning, transfer and information use separate semantic roles.
- Landing and authentication have responsive browser contracts and mode-specific recovery copy.
- The current landing uses a linear guided story instead of an overlapping mobile collage.
- Financial meaning is not supposed to rely on color alone.

## 3. Current weaknesses the new system must address

### 3.1 Engineering acceptance is not visual acceptance

The latest public-entry work passed automated gates but did not satisfy the owner's visual-quality expectation. A Neon Blue replacement cannot be treated as successful merely because tokens compile and browser tests pass.

Required correction: visual design must be reviewed before implementation becomes mergeable.

### 3.2 Brand expression is narrow

The active system concentrates brand color in logo arms, primary actions, links, focus and selected states. This creates consistency, but the overall character remains dependent on layout, typography and neutral surfaces.

Required correction: each candidate must define a coherent visual language, not only a new hex value.

### 3.3 Existing layout must not silently become permanent

The current guided-story landing is production behavior, not automatic design authority for every future brand study. Candidate directions may preserve its information order while changing composition, emphasis and brand distribution.

Required correction: compare directions on the same content and user decisions so the owner can judge the visual system rather than copy differences.

### 3.4 Saturation risk

`#3445FB` is more saturated and visually dominant than the current Fresh Blue family. Replacing every current blue role one-for-one can create:

- excessive attention competition;
- large high-chroma surfaces that overpower financial content;
- dark-mode vibration;
- weak distinction between action, selection and decoration;
- a product that looks promotional inside the workspace.

Required correction: define a usage budget and separate identity, action, subtle surface and selected-state roles.

### 3.5 Logo treatment is under-specified

Changing only the flow-arm color does not define how the mark behaves on neutral, Neon Blue and dark surfaces.

Required correction: every direction must show:

- primary light lockup;
- inverse lockup;
- dark-workspace lockup;
- app/browser icon treatment;
- minimum-size and forced-colors behavior.

### 3.6 Chart and financial-state integration is not yet designed

A project-wide palette decision affects selected series, focus, navigation and supporting data colors. Neon Blue must not consume the visual space needed by income, expense, warning and transfer.

Required correction: each direction must include one representative financial-status row and one chart/legend treatment.

## 4. Representative surfaces for comparison

Every direction must use the same content and decisions:

1. Landing hero and first guided-story section.
2. Login and recovery state.
3. Workspace navigation and primary transaction action.
4. Account summary with income, expense and transfer examples.
5. Transaction list with selected, focused and error states.
6. One chart with direct labels or legend.
7. Logo on light, dark and Neon Blue surfaces.

## 5. Mobile-first findings

At `320px` and `390px`, Neon Blue should not:

- fill multiple competing regions in the first viewport;
- reduce the visibility of the primary action by surrounding it with equally strong accents;
- turn every selected card into a large saturated block;
- create blue-on-blue focus ambiguity;
- hide long Vietnamese labels or monetary values.

The selected direction must retain one obvious primary action per viewport and linear reading order.

## 6. Accessibility and financial-truth findings

Before adoption, the chosen direction requires:

- text/control contrast on the effective composited background;
- keyboard focus that remains distinct from selection;
- forced-colors behavior;
- deuteranopia, protanopia and tritanopia simulation;
- income, expense, transfer and warning comprehension when color is removed;
- adjacent chart-series distinction;
- Light and Dark workspace evidence;
- physical Android review before claiming mobile readiness.

## 7. Scope boundary

This study does not change:

- balances, amounts, transactions, transfers or reconciliation logic;
- database, RLS, authentication providers or production data;
- landing claims or product capabilities;
- B3.2 logo geometry;
- the rule that public routes are Light-only.

## 8. Audit conclusion

The correct next step is not token migration. It is to compare three genuinely different **application systems** for the same Neon Blue hue on the same representative screens, then let the owner choose one before an annotated token/component specification is written.