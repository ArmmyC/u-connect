import { describe, expect, it, vi } from 'vitest';
import { dispatchTool } from '@/lib/tools';
import { members, opportunities } from '@/lib/seed';

describe('dispatchTool', () => {
  it('dispatches all seven tools to domain services', async () => {
    const services = {
      members, opportunities,
      createProject: vi.fn(async (input: any) => ({ id: 'p1', ...input })),
      requestIntroduction: vi.fn(async (input: any) => ({ id: 'i1', ...input, status: 'pending' as const, createdAt: '2026-01-01' })),
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
    expect((results[0] as any).result.length).toBeGreaterThan(0);
    expect((results[0] as any).result.every((item: any) => members.some((member) => member.id === item.id))).toBe(true);
    expect((results[1] as any).result.every((item: any) => opportunities.some((opportunity) => opportunity.id === item.id))).toBe(true);
    expect((results[2] as any).result.every((item: any) => members.some((member) => member.id === item.member.id))).toBe(true);
    expect((results[1] as any).result.length).toBeGreaterThan(0);
    expect((results[2] as any).result.length).toBeGreaterThan(0);
    expect((results[3] as any).result).toMatchObject({ filledRoles: ['Frontend engineer', 'Product designer'], unfilledRoles: [] });
    expect((results[3] as any).result.recommendations.every((item: any) => members.some((member) => member.id === item.member.id))).toBe(true);
    expect((results[3] as any).result.recommendations.length).toBe(2);
    expect((results[4] as any).result.id).toBe(members[0].id);
  });
  it('rejects unknown tools and malformed inputs with stable errors', async () => {
    expect(await dispatchTool('not_a_tool', {}, {} as any)).toMatchObject({ ok: false, error: { code: 'UNKNOWN_TOOL' } });
    expect(await dispatchTool('search_members', { availability: 'yesterday' }, {} as any)).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await dispatchTool('search_opportunities', { budgetTHB: 50000 }, {} as any)).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });
  it('does not expose private contact fields in public profiles', async () => {
    const result = await dispatchTool('get_member_profile', { memberId: members[0].id }, { members: [{ ...members[0], email: 'private@example.test', phone: '000' }] } as any);
    expect(result).toMatchObject({ ok: true });
    expect(JSON.stringify(result)).not.toContain('private@example.test');
    expect(result.ok && 'email' in (result.result as object)).toBe(false);
    expect(result.ok && 'phone' in (result.result as object)).toBe(false);
  });
  it('omits injected private fields from opportunity search results', async () => {
    const result = await dispatchTool('search_opportunities', { skills: ['Python'] }, {
      opportunities: [{ ...opportunities[0], requiredSkills: ['Python'], email: 'private@example.test', phone: '555', contact: 'secret' }] as any,
    });
    expect(result).toMatchObject({ ok: true });
    expect(JSON.stringify(result)).not.toContain('private@example.test');
    expect(JSON.stringify(result)).not.toContain('555');
    expect(JSON.stringify(result)).not.toContain('secret');
    expect((result as any).result[0]).toMatchObject({
      id: opportunities[0].id, title: opportunities[0].title, ownerId: opportunities[0].ownerId,
      requiredSkills: ['Python'],
    });
  });
  it('redacts contacts from workflow adapter results and enforces pending introductions', async () => {
    const project = await dispatchTool('create_project', { ownerId: members[0].id, title: 'Demo', description: 'Demo project', skills: [] }, {
      createProject: async () => ({ id: 'p1', ownerId: members[0].id, title: 'Demo', description: 'Demo project', skills: [], budgetTHB: 10, email: 'secret@example.test', phone: '555' } as any),
    });
    expect(project).toMatchObject({ ok: true, tool: 'create_project', result: { id: 'p1', title: 'Demo' } });
    expect(JSON.stringify(project)).not.toContain('secret@example.test');
    expect(JSON.stringify(project)).not.toContain('555');
    const intro = await dispatchTool('request_introduction', { projectId: 'p1', memberId: members[0].id }, {
      requestIntroduction: async () => ({ id: 'i1', projectId: 'p1', memberId: members[0].id, status: 'pending', createdAt: '2026-01-01', email: 'secret@example.test', phone: '555' } as any),
    });
    expect(intro).toMatchObject({ ok: true, result: { id: 'i1', projectId: 'p1', memberId: members[0].id, status: 'pending' } });
    expect(JSON.stringify(intro)).not.toContain('secret@example.test');
    expect(JSON.stringify(intro)).not.toContain('555');
    const invalid = await dispatchTool('request_introduction', { projectId: 'p1', memberId: members[0].id }, {
      requestIntroduction: async () => ({ id: 'i2', projectId: 'p1', memberId: members[0].id, status: 'shared', createdAt: '2026-01-01' } as any),
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
