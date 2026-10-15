# U-Connect Design Specification

**Date:** 2026-10-16  
**Status:** Approved for autonomous implementation under the user's build objective

## Product shape

U-Connect is a local-first community opportunity platform. The first screen is a working dashboard, and the primary path turns a natural-language team request into explainable member matches, a saved project, and introduction requests. Directory, opportunities, networking, team builder, and agent playground remain directly reachable from a persistent responsive shell.

The app uses fictional records only. It does not claim that an LLM, U-Bot, authentication provider, payment system, or external identity check is connected.

## Options considered

1. **Single-page client mock:** fastest to sketch, but weak URL/navigation behavior and duplicated logic between the screen and agent tools.
2. **Hosted database and service backend:** appropriate for production collaboration, but adds credentials and infrastructure outside this hackathon brief.
3. **Local-first Next.js app with a shared domain layer and local JSON store (selected):** keeps UI and REST/MCP calls on the same business rules, persists the local demo across refreshes/restarts, and needs no external service. The store is intentionally a single-process demo adapter that can later be replaced.

## Architecture

- Next.js App Router provides the page shell, screens, and REST route handlers.
- TypeScript domain modules own the member/opportunity/project/introduction models, deterministic natural-language parsing, matching, and tool dispatch. They contain no React or filesystem dependencies.
- Seed modules contain at least 15 fictional members and 10 opportunities, including public portfolio links and project evidence. Private contact values are isolated from public profile results.
- A server-only JSON store reads/writes `data/demo-state.json`, creating it from the seed state on first use. Writes use a temporary file plus rename. A reset endpoint restores the seed state.
- `/api/tools/[tool]` validates JSON and dispatches the seven named tools plus workflow helpers through the same domain functions. `/api/state` returns only public state and explicitly shared contacts. Introduction status changes and interest actions use that same store.
- The browser uses a context provider for loading and mutations. Actions call the REST API and refresh the snapshot; the demo actor/mode is held in browser storage. Server routes never expose private contact data before the explicit share action.
- A separate stdio process in `src/mcp/server.ts` registers the same tool schemas and calls the shared dispatcher with the same server store. It is optional to the web app and has no U-Bot-specific dependency.

## Core flows

### Search and matching

Member and opportunity lists support text search and role/type filters. The matching engine first excludes records that fail requested hard skills, role availability, or stated budget constraints. Remaining candidates receive a transparent score from skill fit, relevant seed-project evidence, availability, role compatibility, and budget fit. Every result exposes reason strings grounded in seed fields.

### Agent and team builder

The deterministic parser identifies whether the request is for people, opportunities, or a team; extracts skills, role phrases, project type, budget, and requested count; and calls `search_members`, `search_opportunities`, `match_candidates`, or `recommend_team`. The reply contains the interpreted intent, visible tool-call records, ranked results, and next actions. Team creation is a separate user action that calls `create_project`, then `request_introduction` for selected candidates.

### Introductions and consent

An introduction starts pending. A candidate may accept or decline. An owner can then explicitly confirm collaboration. Sharing contact details is a separate owner-triggered action after acceptance; until then the API returns no private contact. The UI distinguishes requested, accepted, declined, confirmed, and shared states. Role switching changes the acting fictional member for the demo only; it is not authentication.

## Screens and visual system

- Dashboard: welcome/actor context, opportunity stats, AI prompt, recommended members/opportunities, activity, and pending introductions.
- Members: searchable/filterable cards and full profile details.
- Opportunities: searchable/type-filtered cards and detail view with fit reasons and interest action.
- AI agent: conversational request/response, visible tool steps, match explanations, and create-project/intro actions.
- Team builder: project brief inputs, parsed roles/skills/budget, visual proposed team, and intro actions.
- Network: actor switcher, project list, introduction controls, and status timeline.
- Agent playground: tool selector, editable structured JSON input, call action, response/error JSON, and tool documentation.

Use a compact dark-first palette with deep ink backgrounds, layered slate surfaces, crisp borders, mint accent, and restrained amber/coral status colors. Use readable system typography, consistent spacing/radii, Lucide icons, small Framer Motion transitions, and accessible focus/contrast. Responsive behavior prioritizes a collapsible/sidebar-to-drawer navigation and single-column cards at narrow widths. Provide a working light/dark toggle.

## Error handling and validation

All tools validate the request before touching state and return `{ ok: true, tool, result }` or `{ ok: false, error: { code, message } }`. Unknown tools, missing IDs, invalid types, and invalid state transitions return actionable 4xx JSON. UI mutations show a pending state and a visible success/error result. Seeded data and user-created demo state are separated so reset is deterministic.

## Verification

- Unit tests cover hard filtering, explainable ordering, natural-language intent parsing, team recommendations, validation, and state transitions.
- Run lint/type-check/tests/build and exercise the owner-to-candidate demo journey against the running app.
- Capture desktop and mobile browser screenshots and inspect console/network/visual lint findings.

## Acceptance criteria

1. A fresh install starts locally with one documented command and no external credentials.
2. Seed counts meet 15 members and 10 opportunities; search, filters, details, and interest work.
3. The prompt “I need a frontend developer and UI/UX designer to launch my startup MVP” produces matches from seed records, with visible tool calls and evidence-based reasons.
4. A user can create the project, request intros, switch to a candidate, accept, switch back, confirm collaboration, and explicitly share contact details.
5. State survives reloads; Reset Demo restores the initial seed state.
6. The seven named REST tools work with structured JSON and meaningful validation, and MCP exposes the same underlying operations where the current SDK allows it.
7. No private contact value appears in public profiles, tool search results, or initial state snapshots.
8. The app remains legible and actionable at desktop and mobile viewport sizes.

## Constraints and known limit

No real payments, authentication, wallet/blockchain work, Utopia-App integration, or actual U-Bot integration. The JSON store is for a single local demo process; simultaneous deployment to multiple server instances is outside scope. Fictional projects and portfolios are examples, not independently verified claims.
