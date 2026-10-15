import { describe, expect, it } from 'vitest';
import { parseAgentRequest, runMockAgent } from '@/lib/agent';
import { members } from '@/lib/seed';

describe('parseAgentRequest', () => {
  it.each([
    ['Find a React freelance developer', 'members', ['engineering'], ['React']],
    ['Build a startup MVP team with frontend and UI/UX', 'team', ['frontend', 'design'], ['frontend', 'UI/UX']],
    ['Find Python/AI opportunities', 'opportunities', [], ['Python', 'AI']],
    ['Recommend a blockchain team', 'team', ['engineering'], ['blockchain']],
    ['Find digital marketing people', 'members', ['marketing'], ['digital marketing']],
  ])('parses %s', (text, mode, roles, skills) => {
    const result = parseAgentRequest(text);
    expect(result.mode).toBe(mode);
    expect(result.roles).toEqual(expect.arrayContaining(roles));
    expect(result.skills).toEqual(expect.arrayContaining(skills));
    expect(result.intent.length).toBeGreaterThan(0);
    expect(result.rationale.length).toBeGreaterThan(0);
  });
  it('parses explicit project budget units and count', () => {
    expect(parseAgentRequest('Recommend 3 teammates under ฿50,000 per project')).toMatchObject({ count: 3, budgetTHB: 50000, budgetUnit: 'project' });
  });
  it('runs through the shared dispatcher and returns seed catalog results', async () => {
    const result = await runMockAgent('Find a React freelance developer');
    expect(result.toolCalls[0].tool).toBe('search_members');
    expect(result.toolCalls[0].output.ok).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.every((item: any) => members.some((member) => member.id === item.id))).toBe(true);
    expect(result.nextSteps.length).toBeGreaterThan(0);
  });
});
