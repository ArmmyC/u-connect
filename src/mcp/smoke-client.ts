import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { resolve } from 'node:path';
import process from 'node:process';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const root = process.cwd();
  const env: Record<string, string> = {};
  for (const name of ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'PATHEXT']) {
    const value = process.env[name];
    if (value) env[name] = value;
  }
  env.U_CONNECT_MCP_ACTOR_ID = 'mem-ada';
  env.U_CONNECT_DEMO_STATE_PATH = resolve(root, 'data', 'demo-state.json');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'), resolve(root, 'src', 'mcp', 'server.ts')],
    cwd: root,
    env,
  });
  const client = new Client({ name: 'u-connect-smoke-client', version: '0.1.0' });

  try {
    await client.connect(transport);
    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name).sort();
    const expected = [
      'create_project',
      'get_member_profile',
      'match_candidates',
      'recommend_team',
      'request_introduction',
      'search_members',
      'search_opportunities',
    ].sort();
    assert(JSON.stringify(names) === JSON.stringify(expected), `Expected seven tools, received: ${names.join(', ')}`);

    const search = await client.callTool({ name: 'search_members', arguments: { query: 'React' } });
    const searchResult = search.structuredContent;
    assert(search.isError !== true, 'search_members returned an MCP error.');
    assert(record(searchResult) && searchResult.ok === true && searchResult.tool === 'search_members', 'search_members omitted structured success content.');
    assert(Array.isArray(searchResult.result) && searchResult.result.length > 0, 'search_members returned no local catalog results.');
    const serializedSearch = JSON.stringify(searchResult);
    assert(!serializedSearch.includes('email') && !serializedSearch.includes('phone'), 'A public search result included private contact fields.');

    const error = await client.callTool({ name: 'get_member_profile', arguments: { memberId: 'mem-not-in-catalog' } });
    const errorText = error.content.find((item) => item.type === 'text');
    assert(error.isError === true, 'The missing profile call did not mark its MCP result as an error.');
    assert(errorText?.type === 'text', 'The error response omitted its JSON text block.');
    const parsedError: unknown = JSON.parse(errorText.text);
    assert(record(parsedError) && parsedError.ok === false && record(parsedError.error), 'The text error was not a structured tool failure.');
    assert(parsedError.error.code === 'NOT_FOUND', 'The missing profile error did not preserve the NOT_FOUND code.');
    assert(record(error.structuredContent) && record(error.structuredContent.error), 'The error response omitted structured content.');
    assert(error.structuredContent.error.code === 'NOT_FOUND', 'The structured error did not preserve the NOT_FOUND code.');

    const forbidden = await client.callTool({
      name: 'create_project',
      arguments: {
        ownerId: 'mem-erin',
        title: 'Should not be created',
        description: 'This request checks the configured MCP actor boundary.',
        skills: ['React'],
      },
    });
    assert(forbidden.isError === true, 'A project owned by a different actor was not rejected.');
    assert(record(forbidden.structuredContent) && record(forbidden.structuredContent.error), 'The forbidden response omitted structured content.');
    assert(forbidden.structuredContent.error.code === 'FORBIDDEN', 'The MCP actor check returned the wrong error code.');

    console.log(JSON.stringify({
      status: 'passed',
      listedTools: names,
      searchMembers: { returned: searchResult.result.length, privateContacts: 'absent' },
      structuredError: { code: error.structuredContent.error.code, textBlock: 'valid JSON' },
      actorScopeError: forbidden.structuredContent.error.code,
    }, null, 2));
  } finally {
    await client.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'MCP smoke client failed.');
  process.exitCode = 1;
});
