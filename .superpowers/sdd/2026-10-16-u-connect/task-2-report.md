# Task 2 report: seed data and core matching

## Files changed

- `src/lib/types.ts`: shared public member, opportunity, workflow, status, and state contracts.
- `src/lib/seed.ts`: 18 fictional profiles and 12 fictional opportunities, with unique ID and owner-reference guards. No private contact values are included.
- `src/lib/matching.ts`: deterministic member/opportunity search, opportunity candidate ranking, and team recommendations.
- `tests/seed.test.ts`, `tests/matching.test.ts`: focused catalog and matching behavior coverage.

## TDD evidence and commands

- Before seed implementation: `npm test -- --run tests/seed.test.ts` failed during collection with `Cannot find module '@/lib/seed'` (expected missing-module red).
- After adding types and seed: the same command passed (3 tests).
- Before matching implementation: `npm test -- --run tests/matching.test.ts` failed during collection with `Cannot find module '@/lib/matching'` (expected feature-missing red).
- After implementation: `npm test -- --run tests/seed.test.ts tests/matching.test.ts` passed (2 files, 8 tests).
- `npm run typecheck` passed.
- `git diff --check` passed.

## Interfaces for later tasks

- Use `Member`/`MemberProfile`, `Opportunity`, `Project`, `Introduction`, `Interest`, and `DemoState` from `@/lib/types`.
- Seed arrays are exported as `members` and `opportunities` from `@/lib/seed`.
- `searchMembers({ query?, role?, skills?, availability? }, catalog?)` and `searchOpportunities({ query?, type?, skills?, budgetTHB? }, catalog?)` return filtered arrays.
- `matchCandidates(opportunity, catalog?)` returns `{ member, score, reasons }[]`; all required opportunity skills are hard filters, and busy members are excluded.
- Members use `compensationUnit` and optional `compensationAmountTHB`; opportunities use `budgetUnit` and optional `budgetTHB`. Units are typed as hourly, monthly, project, equity, or negotiable. Numeric budget scoring occurs only when both sides have numeric values and identical units. Opportunity budget search also requires an explicit matching `budgetUnit`.
- `recommendTeam({ roles?, skills?, budgetTHB?, budgetUnit?, count? }, catalog?)` returns `{ recommendations, filledRoles, unfilledRoles }`. Each recommendation includes `requestedRole`; when roles are requested, each is filled at most once with a distinct person and every unavailable slot appears in `unfilledRoles`. When no roles are requested, it returns the top `count` (default 5) eligible candidates, with `requestedRole: null` and empty role status arrays.
- Team skills remain collective candidate preferences; opportunity matching remains the all-required-skills hard filter. Scores and reasons are deterministic. Reasons cite member skills, stated availability, unit-compatible listed compensation, or a seed project description. No external verification is implied.

## Limitations

- The entire catalog and every portfolio/project entry are fictional demo records; `.example.test` links are placeholders.
- Budget fit only compares values with the same declared unit. These fictional amounts are illustrative, not validated quotes.
- Search comparisons are exact for skill names (case-insensitive); free-text query matching uses a simple case-insensitive substring check.

## Reviewer fix round

- Added tests first for same-unit versus incompatible-unit budget scoring and role-slot assignment/reporting. The initial matching run showed the expected failures: incompatible compensation scored 95 versus the no-budget score of 75, and the old array return did not expose role coverage or unfilled slots.
- Updated `npm test -- --run tests/seed.test.ts tests/matching.test.ts`: passed (2 files, 11 tests).
- Updated `npm run typecheck`: passed.
- Updated `git diff --check`: passed.
- Replaced all fictional `github.com` links with `github.example.test` placeholders. None are claimed as real or verified accounts.
- Follow-up assignment test: before the fix, `npm test -- --run tests/matching.test.ts` failed because greedy assignment filled only `frontend`, leaving `designer` unfilled despite an available full assignment.
- Replaced greedy role assignment with augmenting-path maximum-cardinality matching. Candidate alternatives are considered in descending deterministic score order; coverage is prioritized and output retains requested-role order, distinct member IDs, and explicit `filledRoles`/`unfilledRoles`.
- Final verification: `npm test -- --run tests/seed.test.ts tests/matching.test.ts` passed (2 files, 12 tests); `npm run typecheck` passed; `git diff --check` passed.
