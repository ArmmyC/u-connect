import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { resolve } from 'node:path';
import { dispatchTool, type ToolResult } from '../lib/tools';
import { getDemoStore, StoreError } from '../lib/server/store';
import { playgroundToolDescriptions } from '../lib/playground';
import { toolSchemas, type ToolName } from '../lib/validation';

export const defaultMcpActorId = 'mem-ada';

function failure(code: string, message: string): ToolResult {
  return { ok: false, error: { code, message } };
}

function configuredActorId(): string {
  return process.env.U_CONNECT_MCP_ACTOR_ID?.trim() || defaultMcpActorId;
}

function storeFilePath(): string | undefined {
  const configuredPath = process.env.U_CONNECT_DEMO_STATE_PATH;
  return configuredPath ? resolve(configuredPath) : undefined;
}

async function runTool(tool: ToolName, input: unknown, actorId: string): Promise<ToolResult> {
  const configuredPath = storeFilePath();
  const store = configuredPath ? await getDemoStore(configuredPath) : await getDemoStore();
  const snapshot = await store.getSnapshot();

  if (tool === 'create_project') {
    const parsed = toolSchemas.create_project.safeParse(input);
    if (!parsed.success) return dispatchTool(tool, input);

    if (!snapshot.members.some((member) => member.id === actorId)) {
      return failure('FORBIDDEN', 'The configured MCP actor is not a member in the local demo catalog.');
    }
    if (parsed.data.ownerId !== actorId) {
      return failure('FORBIDDEN', 'Only the configured MCP actor can own a created project.');
    }
    if (!snapshot.members.some((member) => member.id === parsed.data.ownerId)) {
      return failure('NOT_FOUND', 'Member was not found.');
    }
    return dispatchTool(tool, input, { createProject: (projectInput) => store.createProject(projectInput) });
  }

  if (tool === 'request_introduction') {
    const parsed = toolSchemas.request_introduction.safeParse(input);
    if (!parsed.success) return dispatchTool(tool, input);

    if (!snapshot.members.some((member) => member.id === actorId)) {
      return failure('FORBIDDEN', 'The configured MCP actor is not a member in the local demo catalog.');
    }
    const project = snapshot.projects.find((entry) => entry.id === parsed.data.projectId);
    if (!project) return failure('NOT_FOUND', 'Project was not found.');
    if (project.ownerId !== actorId) {
      return failure('FORBIDDEN', 'Only the project owner can request an introduction.');
    }
    if (!snapshot.members.some((member) => member.id === parsed.data.memberId)) {
      return failure('NOT_FOUND', 'Member was not found.');
    }

    const captured = { error: null as StoreError | null };
    const result = await dispatchTool(tool, input, {
      requestIntroduction: async (introInput) => {
        try {
          return await store.requestIntroduction({ ...introInput, requesterId: actorId });
        } catch (error) {
          if (error instanceof StoreError) captured.error = error;
          throw error;
        }
      },
    });
    return captured.error ? failure(captured.error.code, captured.error.message) : result;
  }

  return dispatchTool(tool, input, { members: snapshot.members, opportunities: snapshot.opportunities });
}

function toolHandler(tool: ToolName, actorId: string) {
  return async (input: unknown) => {
    let result: ToolResult;
    try {
      result = await runTool(tool, input, actorId);
    } catch {
      result = failure('SERVICE_ERROR', 'The local demo service could not complete the request.');
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
      ...(!result.ok ? { isError: true } : {}),
    };
  };
}

export function createUConnectMcpServer(actorId = configuredActorId()): McpServer {
  const server = new McpServer({ name: 'u-connect-local-demo', version: '0.1.0' });

  server.registerTool('search_members', { description: playgroundToolDescriptions.search_members, inputSchema: toolSchemas.search_members }, toolHandler('search_members', actorId));
  server.registerTool('search_opportunities', { description: playgroundToolDescriptions.search_opportunities, inputSchema: toolSchemas.search_opportunities }, toolHandler('search_opportunities', actorId));
  server.registerTool('match_candidates', { description: playgroundToolDescriptions.match_candidates, inputSchema: toolSchemas.match_candidates }, toolHandler('match_candidates', actorId));
  server.registerTool('recommend_team', { description: playgroundToolDescriptions.recommend_team, inputSchema: toolSchemas.recommend_team }, toolHandler('recommend_team', actorId));
  server.registerTool('create_project', { description: playgroundToolDescriptions.create_project, inputSchema: toolSchemas.create_project }, toolHandler('create_project', actorId));
  server.registerTool('request_introduction', { description: playgroundToolDescriptions.request_introduction, inputSchema: toolSchemas.request_introduction }, toolHandler('request_introduction', actorId));
  server.registerTool('get_member_profile', { description: playgroundToolDescriptions.get_member_profile, inputSchema: toolSchemas.get_member_profile }, toolHandler('get_member_profile', actorId));

  return server;
}

void serveStdio(() => createUConnectMcpServer());
