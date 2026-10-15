# Task 7 report: agent, Team Builder, and introduction flow

## Implementation

- Added `/agent`, `/team-builder`, and `/network` route views plus the shared `ToolCallCard`.
- The Agent accepts free-form text and five starter prompts, calls the existing provider agent API, and shows parsed intent/roles/skills/budget, tool input/output/status, candidate reasons, opportunity cards, and next steps.
- Team Builder parses a project brief, lets the owner select recommended members, and creates a project followed by sequential introduction requests. Each mutation reports pending/success/error; one failed intro does not prevent later selected requests.
- Network supports owner and candidate identities, request acceptance/decline, owner confirmation, a separate contact-share action, an introduction timeline, and per-action feedback. The view only renders contact data for `shared` introductions with a returned `sharedContacts` entry; the store now rejects sharing until the owner has confirmed.
- Browser exercise exposed that the required exact MVP prompt was parsed as a generic engineering role and returned only one of the two role-matched candidates. Added agent/parser and matching regressions, then adjusted role extraction and eligibility. The exact prompt now fills `design` and `frontend` with Erin Ploy and Ben Wattan. Also corrected the Python/AI opportunity example so “AI” is treated as a topical query rather than a catalog skill.

## Provider and API contract decisions

- The views use Task 5's `useDemo()` provider surface (`runAgent`, `createProject`, `requestIntroduction`, `transitionIntroduction`, `refresh`, actor state) and Task 4's `/api/agent`, tool dispatcher, introduction workflow, persisted snapshot, and privacy projection.
- `createProject` accepts a `ProjectDraft` without `ownerId`; the provider/API uses the current demo actor. Requests are made one at a time for unique selected IDs after project creation.
- Candidate actions use `accept`/`decline`; owner actions use `confirm` then the distinct `share_contact` transition. Contact comes only from the provider's post-share `sharedContacts` projection.

## TDD and checks

- Workflow tests cover sequential project/intro creation, de-duplication, continuing after one intro failure, and not sending intros after project creation fails: `npm test -- --run tests/team-builder-workflow.test.ts` — 3 tests passed.
- Parser/matching regressions were run RED before the browser-driven fix and GREEN afterward: exact MVP role coverage and Python/AI opportunity discovery. `npm test -- --run tests/agent.test.ts tests/matching.test.ts` — 21 tests passed.
- A read-only review identified role-only search over-filtering, budget validation when a unit is missing, missing grounded reasons on member-search cards, and an API path that could share before owner confirmation. Added regressions first: focused tests were RED with five failures, including direct store/API early-share attempts. Fixed role-only filters, infer a project unit for Team Builder budgets and omit unqualified unitless search filters, add profile-grounded member reasons, and require `confirmed` status at the store boundary before sharing. `npm test -- --run tests/agent.test.ts tests/store.test.ts tests/api.test.ts` — 3 files, 31 tests passed.
- Final full suite: `npm test -- --run` — 11 files, 64 tests passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed. Turbopack reports the existing dynamic-filesystem tracing warning in `src/lib/server/store.ts:287`.
- `git diff --check` — passed (Git printed its normal LF-to-CRLF working-copy notices for three edited files).

## Browser exercise

- At `/agent`, entered exactly: `I need a frontend developer and UI/UX designer to launch my startup MVP.` The trace showed `recommend_team`, role coverage `design` and `frontend`, no unfilled roles, and two grounded results: Erin (design) and Ben (frontend), with project evidence and match reasons.
- Followed the in-app Team Builder link. Both recommendations were selected; created the project and sent both introduction requests. Network showed both pending and no contact values.
- Switched to Ben, accepted his request, and reloaded. Candidate identity and accepted status persisted; the exact-flow introduction still showed contact hidden.
- Switched to Ada, confirmed the collaboration, and verified contact remained hidden with the separate Share action available. Clicked Share; Ben's fictional `mem-ben@u-connect.example.test` contact appeared.
- Reloaded again; the exact-prompt project and shared state remained, while Erin's pending request still had no revealed contact. This used only the local fictional `.test` demo store.
- The local demo store now contains the exact-flow project plus an earlier trial project; Task 9 should reset it before its independent acceptance pass.
- The browser console had no application errors; Next.js emitted its existing `scroll-behavior: smooth` route-transition warning from the shared shell stylesheet.

## Files

- `src/app/agent/page.tsx`
- `src/app/team-builder/page.tsx`
- `src/app/network/page.tsx`
- `src/components/views/agent-view.tsx`
- `src/components/views/team-builder-view.tsx`
- `src/components/views/network-view.tsx`
- `src/components/shared/tool-call-card.tsx`
- `src/lib/team-builder-workflow.ts`
- `src/lib/agent.ts`
- `src/lib/matching.ts`
- `src/lib/server/store.ts`
- `tests/team-builder-workflow.test.ts`
- `tests/agent.test.ts`
- `tests/store.test.ts`
- `tests/api.test.ts`
- `.superpowers/sdd/2026-10-16-u-connect/task-7-report.md`

The SDD ledger was not updated.
