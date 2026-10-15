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
- `recommendTeam({ roles?, skills?, budgetTHB?, count? }, catalog?)` returns distinct ranked `{ member, score, reasons }[]`. Team skills are collective preferences across role candidates; opportunity matching remains the all-required-skills hard filter.
- Scores and reasons are deterministic. Reasons cite member skills, stated availability, listed hourly rate, or a seed project description. No external verification is implied.

## Limitations

- The entire catalog and every portfolio/project entry are fictional demo records; `.example.test` links are placeholders.
- Budget fit uses `hourlyRateTHB` where present. Opportunity `budgetTHB` may represent a fixed project/monthly budget, so later UI or agent work should present units clearly and avoid treating it as a validated hourly quote.
- Search comparisons are exact for skill names (case-insensitive); free-text query matching uses a simple case-insensitive substring check.
