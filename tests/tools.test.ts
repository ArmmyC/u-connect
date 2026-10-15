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
});
