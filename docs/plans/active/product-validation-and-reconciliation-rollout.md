# Competitive capability maturation roadmap

- **Execution state:** superseded
- **Active role:** product owner direction recorded
- **Permission scope:** branch_write + repository_read
- **Owner:** Thunderkill016
- **PR:** #215
- **Date:** 2026-08-02

## Repository reconnaissance

This packet originally made a seven-day owner trial the blocking gate before feature development.

The owner explicitly changed direction on 2026-08-02:

> Continue developing the capabilities already present in MoneyFlow until their depth is competitive with comparable products. Validation remains required inside each workstream, but it must not freeze capability development.

## Research

The competitive memory already shows that MoneyFlow has broad MVP coverage but several existing modules remain basic or partial:

- account reconciliation is absent;
- transaction review is Inbox-specific rather than ledger-wide;
- budgets, recurring commitments and savings goals are basic;
- authenticated rules are not persisted;
- reports lack competitor-level depth;
- public-beta provider controls and physical mobile evidence remain incomplete.

## Specification

This packet is no longer the active implementation roadmap.

A replacement roadmap must:

1. identify gaps by existing MoneyFlow capability;
2. prioritize feature depth rather than new product categories;
3. allow parallel workstreams where financial boundaries are independent;
4. require tests and product evidence inside every PR;
5. keep bank sync, AI advice, OCR, household finance, investments, multi-currency and native applications outside current scope.

## Implementation plan

Close PR #215 without merge and replace it with a focused competitive-capability gap matrix plus an implementation roadmap on a new branch.

## Tasks

- [x] Record the owner direction change.
- [x] Mark the validation-first rollout as superseded.
- [ ] Close PR #215 without merge.
- [ ] Create the replacement capability-maturation roadmap.

## Evaluation

No product, schema, provider or production behavior changes are included. This packet exists only to preserve why the original plan was abandoned.

## Handoff record

| Time | From | To | State | Evidence |
|---|---|---|---|---|
| 2026-08-02 | planner | owner review | planned | Validation-first rollout proposed |
| 2026-08-02 | owner | product planner | superseded | Owner rejected validation-first sequencing and requested competitive maturation of existing capabilities |
