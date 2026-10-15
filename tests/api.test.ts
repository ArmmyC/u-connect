import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GET as getState } from '@/app/api/state/route';
import { POST as postTool } from '@/app/api/tools/[tool]/route';
import { POST as postAgent } from '@/app/api/agent/route';
import { PATCH as patchIntro } from '@/app/api/intros/[id]/route';
import { POST as resetDemo } from '@/app/api/demo/reset/route';
import { POST as postInterest } from '@/app/api/opportunities/[id]/interest/route';
import { members, opportunities } from '@/lib/seed';
import type { OpportunityStatus } from '@/lib/types';

const temporaryPaths: string[] = [];

async function useTemporaryState(opportunityStatus?: OpportunityStatus) {
  const directory = await mkdtemp(join(tmpdir(), 'u-connect-api-'));
  temporaryPaths.push(directory);
  const statePath = join(directory, 'state.json');
  process.env.U_CONNECT_DEMO_STATE_PATH = statePath;
  if (opportunityStatus) {
    const state = {
      members,
      opportunities: opportunities.map((opportunity) => opportunity.id === 'opp-marketplace'
        ? { ...opportunity, status: opportunityStatus }
        : opportunity),
      projects: [],
      introductions: [],
      interests: [],
    };
    await writeFile(statePath, JSON.stringify(state), 'utf8');
  }
}

function jsonRequest(method: string, value: unknown) {
  return new Request('http://localhost/api/test', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });
}

function responseBody<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

afterEach(async () => {
  delete process.env.U_CONNECT_DEMO_STATE_PATH;
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('demo API routes', () => {
  it('returns seed state without private contacts before explicit sharing', async () => {
    await useTemporaryState();
    const response = await getState();
    const state = await responseBody<{ members: unknown[]; sharedContacts: Record<string, unknown> }>(response);

    expect(response.status).toBe(200);
    expect(state.members).toHaveLength(18);
    expect(state.sharedContacts).toEqual({});
    expect(JSON.stringify(state)).not.toContain('@u-connect.example.test');
  });

  it('returns meaningful unknown-tool, malformed-JSON, and missing-intro errors', async () => {
    await useTemporaryState();
    const unknown = await postTool(jsonRequest('POST', {}), { params: Promise.resolve({ tool: 'no_such_tool' }) });
    expect(unknown.status).toBe(404);
    expect(await responseBody(unknown)).toMatchObject({ ok: false, error: { code: 'UNKNOWN_TOOL' } });

    const malformed = await postAgent(new Request('http://localhost/api/agent', { method: 'POST', body: '{' }));
    expect(malformed.status).toBe(400);
    expect(await responseBody(malformed)).toMatchObject({ ok: false, error: { code: 'INVALID_JSON' } });

    const missing = await patchIntro(jsonRequest('PATCH', { actorId: 'mem-ada', action: 'accept' }), { params: Promise.resolve({ id: 'missing' }) });
    expect(missing.status).toBe(404);
    expect(await responseBody(missing)).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('runs a project and consent workflow through JSON routes without exposing contacts early', async () => {
    await useTemporaryState();
    const create = await postTool(jsonRequest('POST', {
      actorId: 'mem-ada',
      input: { ownerId: 'mem-ada', title: 'MVP', description: 'Launch the MVP.', skills: ['React'] },
    }), { params: Promise.resolve({ tool: 'create_project' }) });
    expect(create.status).toBe(200);
    const created = await responseBody<{ ok: true; result: { id: string } }>(create);

    const introResponse = await postTool(jsonRequest('POST', {
      actorId: 'mem-ada', input: { projectId: created.result.id, memberId: 'mem-ben' },
    }), { params: Promise.resolve({ tool: 'request_introduction' }) });
    expect(introResponse.status).toBe(200);
    const intro = await responseBody<{ ok: true; result: { id: string; status: string } }>(introResponse);
    expect(intro.result.status).toBe('pending');

    const wrongOwner = await postTool(jsonRequest('POST', {
      actorId: 'mem-chai', input: { projectId: created.result.id, memberId: 'mem-ben' },
    }), { params: Promise.resolve({ tool: 'request_introduction' }) });
    expect(wrongOwner.status).toBe(403);
    expect(await responseBody(wrongOwner)).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });

    const duplicate = await postTool(jsonRequest('POST', {
      actorId: 'mem-ada', input: { projectId: created.result.id, memberId: 'mem-ben' },
    }), { params: Promise.resolve({ tool: 'request_introduction' }) });
    expect(duplicate.status).toBe(409);
    expect(await responseBody(duplicate)).toMatchObject({ ok: false, error: { code: 'DUPLICATE_INTRO' } });

    const beforeShare = await getState();
    expect(JSON.stringify(await responseBody(beforeShare))).not.toContain('@u-connect.example.test');

    const denied = await patchIntro(jsonRequest('PATCH', { actorId: 'mem-ada', action: 'accept' }), { params: Promise.resolve({ id: intro.result.id }) });
    expect(denied.status).toBe(403);
    expect(await responseBody(denied)).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });

    const accepted = await patchIntro(jsonRequest('PATCH', { actorId: 'mem-ben', action: 'accept' }), { params: Promise.resolve({ id: intro.result.id }) });
    expect(accepted.status).toBe(200);
    const confirmed = await patchIntro(jsonRequest('PATCH', { actorId: 'mem-ada', action: 'confirm' }), { params: Promise.resolve({ id: intro.result.id }) });
    expect(confirmed.status).toBe(200);
    const shared = await patchIntro(jsonRequest('PATCH', { actorId: 'mem-ada', action: 'share_contact' }), { params: Promise.resolve({ id: intro.result.id }) });
    expect(shared.status).toBe(200);

    const afterShare = await getState();
    const state = await responseBody<{ sharedContacts: Record<string, { email: string }> }>(afterShare);
    expect(state.sharedContacts['mem-ben'].email).toBe('mem-ben@u-connect.example.test');
    const profile = await postTool(jsonRequest('POST', { memberId: 'mem-ben' }), { params: Promise.resolve({ tool: 'get_member_profile' }) });
    expect(JSON.stringify(await responseBody(profile))).not.toContain('@u-connect.example.test');
  });

  it('records interest for the acting member and resets the persisted state', async () => {
    await useTemporaryState();
    const response = await postInterest(jsonRequest('POST', { actorId: 'mem-ben' }), { params: Promise.resolve({ id: 'opp-marketplace' }) });
    expect(response.status).toBe(200);
    expect(await responseBody(response)).toMatchObject({ ok: true, interest: { opportunityId: 'opp-marketplace', memberId: 'mem-ben' } });

    const reset = await resetDemo();
    expect(reset.status).toBe(200);
    const state = await responseBody<{ interests: unknown[]; projects: unknown[] }>(reset);
    expect(state.interests).toEqual([]);
    expect(state.projects).toEqual([]);
  });

  it('rejects interest from the opportunity owner with a permission error', async () => {
    await useTemporaryState();
    const response = await postInterest(jsonRequest('POST', { actorId: 'mem-inn' }), { params: Promise.resolve({ id: 'opp-marketplace' }) });

    expect(response.status).toBe(403);
    expect(await responseBody(response)).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Opportunity owners cannot express interest in their own listing.' },
    });
  });

  it.each(['closed', 'in-progress'] as const)('rejects interest for a %s opportunity with a conflict error', async (status) => {
    await useTemporaryState(status);
    const response = await postInterest(jsonRequest('POST', { actorId: 'mem-ben' }), { params: Promise.resolve({ id: 'opp-marketplace' }) });

    expect(response.status).toBe(409);
    expect(await responseBody(response)).toMatchObject({
      ok: false,
      error: { code: 'OPPORTUNITY_NOT_OPEN', message: 'Interest can only be expressed in open opportunities.' },
    });
  });

  it('reports one duplicate when concurrent requests target the same project member', async () => {
    await useTemporaryState();
    const create = await postTool(jsonRequest('POST', {
      actorId: 'mem-ada',
      input: { ownerId: 'mem-ada', title: 'Concurrent MVP', description: 'Exercise request serialization.', skills: [] },
    }), { params: Promise.resolve({ tool: 'create_project' }) });
    const created = await responseBody<{ ok: true; result: { id: string } }>(create);
    const requestIntroduction = () => postTool(jsonRequest('POST', {
      actorId: 'mem-ada', input: { projectId: created.result.id, memberId: 'mem-ben' },
    }), { params: Promise.resolve({ tool: 'request_introduction' }) });

    const responses = await Promise.all([requestIntroduction(), requestIntroduction()]);
    const successful = responses.filter((response) => response.status === 200);
    const duplicate = responses.find((response) => response.status !== 200);

    expect(successful).toHaveLength(1);
    expect(duplicate?.status).toBe(409);
    if (!duplicate) throw new Error('Expected the concurrent request to be rejected as a duplicate.');
    expect(await responseBody(duplicate)).toMatchObject({ ok: false, error: { code: 'DUPLICATE_INTRO' } });
  });
});
