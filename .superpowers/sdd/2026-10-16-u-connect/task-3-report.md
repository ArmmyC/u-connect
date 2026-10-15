# Task 3 report: natural-language agent and tool dispatch

## Interface contracts

- `parseAgentRequest(text)` returns the source intent, one of `members | opportunities | team`, role and normalized skill arrays, optional `budgetTHB` and `budgetUnit`, a result count, and a short rationale. It uses phrase and regex dictionaries; it contains no seed-specific result IDs.
- `toolSchemas` in `src/lib/validation.ts` defines strict Zod input contracts for all seven tools: `search_members`, `search_opportunities`, `match_candidates`, `recommend_team`, `create_project`, `request_introduction`, and `get_member_profile`. Search and team budget amount/unit values must be supplied together. Member searches require at least one filter; team recommendations require a role or skill.
- `dispatchTool(name, input, services)` is the shared dispatcher and returns either `{ ok: true, tool, result }` or `{ ok: false, error: { code, message } }`. Search and matching calls use Task 2 domain functions. Member budget filters enforce same-unit numeric compensation at or below the cap. All profiles and workflow adapter results use explicit public-field allowlists. Introduction adapter results must be `pending`; other statuses return `INVALID_SERVICE_RESULT`.
- `ToolServices` provides seed/catalog overrides and optional `createProject` and `requestIntroduction` adapters. Those workflow tools return a service-unavailable error if no adapter was supplied; adapter exceptions return a generic `SERVICE_ERROR` without exception text. They do not create hidden side effects. Introduction requests remain pending through the caller adapter; contact details are not shared by this dispatcher.
- `runMockAgent(text, services)` parses intent, routes through `dispatchTool`, records tool input/output, returns seed-derived ranked results and user-facing next steps. It only searches/recommends; creating a project or requesting an introduction requires explicit dispatch by the caller.
- Team recommendation output preserves Task 2 `{ recommendations, filledRoles, unfilledRoles }` semantics.

## Files

- `src/lib/agent.ts`
- `src/lib/tools.ts`
- `src/lib/validation.ts`
- `tests/agent.test.ts`
- `tests/tools.test.ts`

## TDD and checks

- RED: the first focused test run failed to collect because `@/lib/agent` and `@/lib/tools` did not exist, confirming the requested functionality was missing.
- GREEN: the first implementation run passed the parser cases and dispatch tests but correctly failed the injected-contact-field profile test. The public-field allowlist fixed that leak.
- Review fix RED: focused tests failed on member budget filtering/parser propagation, private workflow adapter fields, inherited `toString` tool lookup, empty search schemas, and thrown adapter errors.
- Review fix GREEN: `npm test -- --run tests/agent.test.ts tests/tools.test.ts tests/matching.test.ts` passed (3 files, 26 tests).
- Privacy follow-up RED: `npm test -- --run tests/tools.test.ts` failed on an injected `email` field in the raw `search_opportunities` result, confirming catalog overrides could leak undeclared fields. Added an explicit public `Opportunity` projection preserving the established catalog fields; the injected `email`, `phone`, and `contact` fields are now absent.
- Strengthened the member-budget regression to assert the seed-backed in-budget `mem-ben` appears and the over-budget `mem-ada` does not.
- Follow-up GREEN: focused tools and matching tests pass after both changes.
- `npm run typecheck` passed.
- `git diff --check` passed.

Coverage also asserts seed-backed outputs for all five read tools, role coverage/unfilled team shape, and missing required fields for all seven tools.

## Limitations

- Phrase interpretation is intentionally deterministic and dictionary-based, not a language model; unusual wording may need additional aliases.
- Catalog records remain fictional demo data. No identity, portfolio, availability, compensation, or opportunity is verified.
- Project creation and introduction persistence depend on caller-provided local services. The agent itself has no external runtime dependency or implicit workflow mutation.
- Public profile output omits private contacts; participation confirmation and approved contact sharing remain separate human-controlled workflow steps.
