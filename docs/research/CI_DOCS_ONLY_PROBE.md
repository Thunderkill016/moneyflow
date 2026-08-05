# CI documentation-only probe

This branch exists only to exercise the unselected database path of the PR #304 CI topology against a documentation-only pull-request diff.

Expected result:

- classifier: documentation-only;
- database required: false;
- database executor: skipped before runner/action setup;
- stable database summary: success.

The probe does not target `main`, does not deploy and does not change product/runtime behavior.
