import { describe, expect, it, vi } from 'vitest';
import { dispatchTool, type ToolResult } from '@/lib/tools';
import { members, opportunities } from '@/lib/seed';
import type { Introduction } from '@/lib/types';

function expectSuccess(result: ToolResult): asserts result is Extract<ToolResult, { ok: true }> {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected successful tool result');
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function hasStringId(value: unknown): value is { id: string } {
  return isRecord(value) && typeof value.id === 'string';
}
function idList(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every(hasStringId)) throw new Error('Expected rows with string IDs');
  return value.map((item) => item.id);
}
function hasCandidateMemberId(value: unknown): value is { member: { id: string } } {
  return isRecord(value) && isRecord(value.member) && typeof value.member.id === 'string';
}
function isCandidateList(value: unknown): value is { member: { id: string } }[] {
  return Array.isArray(value) && value.every(hasCandidateMemberId);
}

describe('dispatchTool', () => {
  it('dispatches all seven tools to domain services', async () => {
    const services = {
      members, opportunities,
      createProject: vi.fn(async (input) => ({ id: 'p1', ...input })),
      requestIntroduction: vi.fn(async (input) => ({ id: 'i1', ...input, status: 'pending' as const, createdAt: '2026-01-01' })),
    };
    const calls: [string, unknown][] = [
      ['search_members', { skills: ['React'] }], ['search_opportunities', { skills: ['Python'] }],
      ['match_candidates', { opportunityId: opportunities[0].id }], ['recommend_team', { roles: ['engineering'] }],
      ['get_member_profile', { memberId: members[0].id }], ['create_project', { ownerId: members[0].id, title: 'Demo', description: 'A demo', skills: [] }],
      ['request_introduction', { projectId: 'p1', memberId: members[0].id }],
    ];
    for (const [name, input] of calls) expect((await dispatchTool(name, input, services)).ok).toBe(true);
    expect(services.createProject).toHaveBeenCalledOnce();
    expect(services.requestIntroduction).toHaveBeenCalledOnce();
  });
  it('returns actual seed-backed results for each read tool', async () => {
    const cases: [string, unknown][] = [
      ['search_members', { skills: ['React'] }], ['search_opportunities', { skills: ['Python'] }],
      ['match_candidates', { opportunityId: 'opp-marketplace' }], ['recommend_team', { roles: ['Frontend engineer', 'Product designer'] }],
      ['get_member_profile', { memberId: members[0].id }],
    ];
    const results = await Promise.all(cases.map(([tool, input]) => dispatchTool(tool, input)));
    const [memberResult, opportunityResult, candidateResult, teamResult, profileResult] = results.map((result) => {
      expectSuccess(result);
      return result;
    });
    const memberIds = idList(memberResult.result);
    const opportunityIds = idList(opportunityResult.result);
    expect(memberIds.length).toBeGreaterThan(0);
    expect(memberIds.every((id) => members.some((member) => member.id === id))).toBe(true);
    expect(opportunityIds.every((id) => opportunities.some((opportunity) => opportunity.id === id))).toBe(true);
    expect(opportunityIds.length).toBeGreaterThan(0);
    if (!isCandidateList(candidateResult.result)) throw new Error('Expected candidate rows');
    expect(candidateResult.result.length).toBeGreaterThan(0);
    expect(candidateResult.result.every((row) => members.some((member) => member.id === row.member.id))).toBe(true);
    if (!isRecord(teamResult.result)) throw new Error('Expected team result');
    expect(teamResult.result).toMatchObject({ filledRoles: ['Frontend engineer', 'Product designer'], unfilledRoles: [] });
    if (!isCandidateList(teamResult.result.recommendations) || teamResult.result.recommendations.length !== 2) throw new Error('Expected recommendations');
    expect(teamResult.result.recommendations.every((row) => members.some((member) => member.id === row.member.id))).toBe(true);
    expect(isRecord(profileResult.result) && profileResult.result.id).toBe(members[0].id);
  });
  it('rejects unknown tools and malformed inputs with stable errors', async () => {
    expect(await dispatchTool('not_a_tool', {})).toMatchObject({ ok: false, error: { code: 'UNKNOWN_TOOL' } });
    expect(await dispatchTool('search_members', { availability: 'yesterday' })).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await dispatchTool('search_opportunities', { budgetTHB: 50000 })).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });
  it('does not expose private contact fields in public profiles', async () => {
    const result = await dispatchTool('get_member_profile', { memberId: members[0].id }, { members: [Object.assign({ ...members[0] }, { email: 'private@example.test', phone: '000' })] });
    expectSuccess(result);
    expect(JSON.stringify(result)).not.toContain('private@example.test');
    expect(isRecord(result.result) && 'email' in result.result).toBe(false);
    expect(isRecord(result.result) && 'phone' in result.result).toBe(false);
  });
  it('omits injected private fields from opportunity search results', async () => {
    const result = await dispatchTool('search_opportunities', { skills: ['Python'] }, {
      opportunities: [Object.assign({ ...opportunities[0], requiredSkills: ['Python'] }, { email: 'private@example.test', phone: '555', contact: 'secret' })],
    });
    expectSuccess(result);
    expect(JSON.stringify(result)).not.toContain('private@example.test');
    expect(JSON.stringify(result)).not.toContain('555');
    expect(JSON.stringify(result)).not.toContain('secret');
    if (!Array.isArray(result.result) || !isRecord(result.result[0])) throw new Error('Expected opportunity rows');
    expect(result.result[0]).toMatchObject({
      id: opportunities[0].id, title: opportunities[0].title, ownerId: opportunities[0].ownerId,
      requiredSkills: ['Python'],
    });
  });
  it('redacts contacts from workflow adapter results and enforces pending introductions', async () => {
    const project = await dispatchTool('create_project', { ownerId: members[0].id, title: 'Demo', description: 'Demo project', skills: [] }, {
      createProject: async () => Object.assign({ id: 'p1', ownerId: members[0].id, title: 'Demo', description: 'Demo project', skills: [], budgetTHB: 10 }, { email: 'secret@example.test', phone: '555' }),
    });
    expect(project).toMatchObject({ ok: true, tool: 'create_project', result: { id: 'p1', title: 'Demo' } });
    expect(JSON.stringify(project)).not.toContain('secret@example.test');
    expect(JSON.stringify(project)).not.toContain('555');
    const intro = await dispatchTool('request_introduction', { projectId: 'p1', memberId: members[0].id }, {
      requestIntroduction: async () => Object.assign({ id: 'i1', projectId: 'p1', memberId: members[0].id, status: 'pending' as const, createdAt: '2026-01-01' }, { email: 'secret@example.test', phone: '555' }),
    });
    expect(intro).toMatchObject({ ok: true, result: { id: 'i1', projectId: 'p1', memberId: members[0].id, status: 'pending' } });
    expect(JSON.stringify(intro)).not.toContain('secret@example.test');
    expect(JSON.stringify(intro)).not.toContain('555');
    const invalid = await dispatchTool('request_introduction', { projectId: 'p1', memberId: members[0].id }, {
      requestIntroduction: async () => ({ id: 'i2', projectId: 'p1', memberId: members[0].id, status: 'shared' as Introduction['status'], createdAt: '2026-01-01' }),
    });
    expect(invalid).toMatchObject({ ok: false, error: { code: 'INVALID_SERVICE_RESULT' } });
  });
  it('uses own tool names and hides adapter exceptions in a stable envelope', async () => {
    expect(await dispatchTool('toString', {})).toMatchObject({ ok: false, error: { code: 'UNKNOWN_TOOL' } });
    const result = await dispatchTool('create_project', { ownerId: members[0].id, title: 'Demo', description: 'Demo', skills: [] }, {
      createProject: async () => { throw new Error('secret@example.test phone 555'); },
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'SERVICE_ERROR' } });
    expect(JSON.stringify(result)).not.toContain('secret@example.test');
    expect(JSON.stringify(result)).not.toContain('555');
  });
  it('rejects missing required fields for every tool', async () => {
    const missingInputs: [string, unknown][] = [
      ['search_members', {}], ['search_opportunities', {}], ['match_candidates', {}], ['recommend_team', {}], ['create_project', {}], ['request_introduction', {}], ['get_member_profile', {}],
    ];
    for (const [name, input] of missingInputs) {
      const result = await dispatchTool(name, input);
      expect(result, name).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    }
    expect(await dispatchTool('recommend_team', { roles: ['engineering'], budgetTHB: 500 })).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });
});
