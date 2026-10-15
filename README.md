# U-Connect

U-Connect is a local-first community opportunity demo. It combines fictional member and opportunity discovery, explainable deterministic matching, a consent-aware introduction flow, seven JSON tools, and an optional stdio MCP server. It requires no credentials or hosted services.

## Run locally

Requirements: Node.js 20.9 or later and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the sidebar to open Dashboard, Members, Opportunities, AI Agent, Team Builder, Network, or Agent Playground.

The first API request creates `data/demo-state.json` from the tracked fictional seed catalog. The file is ignored by Git and survives page reloads and app restarts. Use the **Reset Demo** action in the app or send:

```sh
curl -X POST http://localhost:3000/api/demo/reset
```

The in-app action restores the seed state and resets the saved demo identity to Owner · Ada, with Erin as the default candidate. Calling the API endpoint directly restores the seed data without changing the browser's saved actor or theme preference.

Useful checks:

```sh
npm test -- --run
npm run lint
npm run typecheck
npm run build
```

## Two-minute judge demo

1. On Dashboard, ask: `I need a frontend developer and a UI/UX designer to launch my startup MVP.` Review the parsed roles and the member evidence behind the recommendations.
2. Open Team Builder, keep Ben Wattan and Erin Ploy selected, and choose **Create project & request introductions**. The new project and pending requests appear in Network.
3. In Network, switch to candidate Ben and accept his request. Reload once to show that the accepted state persists.
4. Switch back to owner Ada Chantar, confirm the collaboration, then use the separate **Share contact** action. The fictional contact appears only after sharing.
5. Open Agent Playground, select `search_members`, and call the preloaded React search to show the validated REST response.

All profiles, opportunities, portfolios, and contact values are fictional demo data. Actor switching demonstrates workflow rules; it is not authentication or identity verification.

## Architecture and data flow

```text
Browser views
    └─ Next.js JSON route handlers
         ├─ Zod request validation
         ├─ shared dispatchTool → deterministic search and matching
         └─ workflow adapters → local JSON repository

MCP host → stdio MCP server → same tool schemas and dispatchTool
                              └─ local JSON repository
```

- `src/lib/seed.ts`, `matching.ts`, `agent.ts`, `validation.ts`, and `tools.ts` hold the fictional catalog, deterministic parsing/matching, schemas, and shared tool dispatcher.
- `src/lib/server/store.ts` persists projects, introductions, interests, and their statuses in `data/demo-state.json`. Writes are atomic within a single process.
- Next route handlers validate requests and call the shared dispatcher or store. The browser provider sends the current demo actor for owner/candidate checks.
- `src/mcp/server.ts` registers the same seven tools with the official MCP TypeScript SDK v2 and serves them over stdio. It does not connect to U-Bot or an external model.
- `@modelcontextprotocol/server` and `@modelcontextprotocol/client` are pinned to 2.3.1. The server uses the SDK's `registerTool` and `serveStdio`; the smoke client uses `Client`, `StdioClientTransport`, `listTools`, and `callTool`.

The JSON repository is a single-process demo adapter. A Next server and an MCP stdio server are separate processes and do not share an in-memory write queue. Run one writer against a given state path at a time; the local JSON file is not a multi-process database. Production or simultaneous web/MCP use needs a shared repository with cross-process transactions/locking.

## REST tool API

All tools use `POST /api/tools/{tool}`. Search and matching examples use public catalog data and need no actor. Workflow tools require the demo `actorId`; the nested `input` form below is the same shape used by the Playground. Responses follow `{ "ok": true, "tool": "…", "result": … }` or `{ "ok": false, "error": { "code": "…", "message": "…" } }`.

Examples below use a POSIX shell and `curl`. Each request is independently runnable; set `BASE` once:

```sh
BASE=http://localhost:3000
```

### `search_members`

```sh
curl -sS -X POST "$BASE/api/tools/search_members" \
  -H 'Content-Type: application/json' \
  -d '{"query":"React","availability":"available"}'
```

Other supported filters include `role`, `skills`, and a paired `budgetTHB` + `budgetUnit`.

### `search_opportunities`

```sh
curl -sS -X POST "$BASE/api/tools/search_opportunities" \
  -H 'Content-Type: application/json' \
  -d '{"query":"AI","type":"project"}'
```

### `match_candidates`

```sh
curl -sS -X POST "$BASE/api/tools/match_candidates" \
  -H 'Content-Type: application/json' \
  -d '{"opportunityId":"opp-marketplace"}'
```

### `recommend_team`

```sh
curl -sS -X POST "$BASE/api/tools/recommend_team" \
  -H 'Content-Type: application/json' \
  -d '{"roles":["frontend","design"],"skills":["React","UI/UX"],"count":4}'
```

### `create_project`

The `ownerId` must match the acting demo member. Copy the generated `result.id` for the introduction request below.

```sh
curl -sS -X POST "$BASE/api/tools/create_project" \
  -H 'Content-Type: application/json' \
  -d '{"actorId":"mem-ada","input":{"ownerId":"mem-ada","title":"Community marketplace MVP","description":"Prototype searchable listings and a seller workflow.","skills":["React","TypeScript"],"budgetTHB":90000}}'
```

### `request_introduction`

Replace `PROJECT_ID_FROM_CREATE_PROJECT` with the returned project ID. Only its owner can request introductions.

```sh
curl -sS -X POST "$BASE/api/tools/request_introduction" \
  -H 'Content-Type: application/json' \
  -d '{"actorId":"mem-ada","input":{"projectId":"PROJECT_ID_FROM_CREATE_PROJECT","memberId":"mem-ben"}}'
```

### `get_member_profile`

```sh
curl -sS -X POST "$BASE/api/tools/get_member_profile" \
  -H 'Content-Type: application/json' \
  -d '{"memberId":"mem-erin"}'
```

This returns public profile fields only. No REST tool returns private contact details.

Other useful routes are `GET /api/state?actorId=mem-ada`, `POST /api/agent` with `{ "text": "…" }`, `PATCH /api/intros/{id}` for the consent workflow, and `POST /api/demo/reset`.

## MCP stdio server

Run the MCP server from the repository root:

```sh
npm run mcp
```

It waits for an MCP host on stdin/stdout. Keep application logs off stdout; stdout is the protocol stream. The demo actor defaults to `mem-ada`. Set `U_CONNECT_MCP_ACTOR_ID` to another fictional member ID to use that actor for project creation and introduction requests. MCP inputs do not accept an actor override: project ownership is checked against the server's configured actor.

To verify it with the official SDK client:

```sh
npm run mcp:smoke
```

The smoke client starts its own stdio server process, confirms all seven tools are listed, calls `search_members` against the local catalog, checks that private contact fields are absent, and verifies a missing-profile error in both structured and JSON-text form.

For an MCP host that supports stdio servers, add a config entry like this and replace the placeholders with absolute paths. Forward slashes work in Windows JSON paths as well:

```json
{
  "mcpServers": {
    "u-connect-local": {
      "command": "node",
      "args": [
        "C:/ABSOLUTE/PATH/TO/UHackathon/node_modules/tsx/dist/cli.mjs",
        "C:/ABSOLUTE/PATH/TO/UHackathon/src/mcp/server.ts"
      ],
      "env": {
        "U_CONNECT_DEMO_STATE_PATH": "C:/ABSOLUTE/PATH/TO/UHackathon/data/demo-state.json",
        "U_CONNECT_MCP_ACTOR_ID": "mem-ada"
      }
    }
  }
}
```

When supplied as an absolute path, `U_CONNECT_DEMO_STATE_PATH` makes the state file independent of the host's working directory. The MCP process is a separate writer; stop the Next server before running it against the same state file, or give it a separate path. See the [official MCP TypeScript SDK server guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/first-server.md), [client guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/first-client.md), and [package/subpath guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/packages.md).

## Persistence and privacy

- The seed catalog contains fictional members and opportunities. `data/demo-state.json` stores mutable projects, introductions, interests, and statuses; atomic file replacement and a per-process queue protect writes made by that process.
- The private contact map is server-only and separate from public member records and persisted state. Public profiles and tool results use explicit projections and never include contact fields.
- An introduction begins `pending`. The requested candidate can accept or decline. The project owner can then confirm an accepted collaboration and separately share contact details.
- A contact is returned in `sharedContacts` only after the `shared` transition and only in an actor-scoped state snapshot for the candidate or project owner. Actor IDs are caller-supplied demo role values, not authentication credentials.
- The stdio MCP tool set intentionally has no accept, confirm, or contact-sharing tool. The seven named tools do not reveal private contacts.
- Fictional portfolios and profile claims are not externally verified. Do not use this local JSON adapter for concurrent production workloads.

## Implemented and future integrations

| Area | Status | Details |
| --- | --- | --- |
| Member and opportunity catalog | Implemented | Fictional local seed data with explainable deterministic matching. |
| Agent | Implemented | Phrase/rule parser; no external LLM or paid API. |
| REST tools | Implemented | Seven validated tools share one dispatcher. |
| MCP | Implemented | Official TypeScript SDK v2 stdio server and smoke client. |
| Introduction consent flow | Implemented | Candidate acceptance, owner confirmation, separate contact sharing, and actor-scoped snapshots. |
| U-Bot / Utopia-App | Future | No U-Bot connection or Utopia integration is implemented or claimed. |
| Production authentication and verified identity | Future | Demo actor switching is not a security boundary. |
| Shared production database and multi-process coordination | Future | Replace the single-process JSON repository before concurrent deployment. |
| Real email, payments, wallets, or blockchain operations | Future | No external contact delivery, payment, wallet, or chain integration is present. |
