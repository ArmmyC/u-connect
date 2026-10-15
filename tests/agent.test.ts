import { describe, expect, it } from 'vitest';
import { parseAgentRequest, runMockAgent } from '@/lib/agent';
import { members } from '@/lib/seed';

function hasStringId(value: unknown): value is { id: string } {
  return typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
}

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
    expect(result.results.every((item) => hasStringId(item) && members.some((member) => member.id === item.id))).toBe(true);
    expect(result.nextSteps.length).toBeGreaterThan(0);
  });
  it('passes explicit member budget amounts and units through to filtering', async () => {
    const response = await runMockAgent('Find React freelancers under ฿500/hour');
    expect(response.parsed).toMatchObject({ budgetTHB: 500, budgetUnit: 'hourly' });
    expect(response.toolCalls[0].input).toMatchObject({ budgetTHB: 500, budgetUnit: 'hourly' });
    expect(response.results.every((item) => typeof item === 'object' && item !== null && 'compensationUnit' in item && item.compensationUnit === 'hourly' && 'compensationAmountTHB' in item && typeof item.compensationAmountTHB === 'number' && item.compensationAmountTHB <= 500)).toBe(true);
  });
  it('fills the frontend and UI/UX roles in the startup MVP brief', async () => {
    const response = await runMockAgent('I need a frontend developer and a UI/UX designer to launch my startup MVP');
    expect(response.parsed.roles).toEqual(expect.arrayContaining(['frontend', 'design']));
    expect(response.parsed.roles).not.toContain('engineering');
    const output = response.toolCalls[0].output;
    expect(output.ok).toBe(true);
    if (!output.ok || typeof output.result !== 'object' || output.result === null || !('filledRoles' in output.result) || !('unfilledRoles' in output.result)) throw new Error('Expected a team recommendation result');
    expect(output.result.filledRoles).toEqual(expect.arrayContaining(['frontend', 'design']));
    expect(output.result.unfilledRoles).toEqual([]);
    expect(response.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ member: expect.objectContaining({ id: 'mem-ben' }), requestedRole: 'frontend' }),
      expect.objectContaining({ member: expect.objectContaining({ id: 'mem-erin' }), requestedRole: 'design' }),
    ]));
  });
  it('finds the Python AI forecasting opportunity from the required example prompt', async () => {
    const response = await runMockAgent('Find Python/AI opportunities');
    expect(response.toolCalls[0].tool).toBe('search_opportunities');
    expect(response.results).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'opp-ai-forecast' })]));
  });
  it('uses the parsed role instead of adding the full sentence as a second filter', async () => {
    const response = await runMockAgent('Find a designer');
    expect(response.toolCalls[0].input).toMatchObject({ role: 'design' });
    expect(response.toolCalls[0].input).not.toHaveProperty('query');
    expect(response.results).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'mem-erin' })]));
  });
  it('treats a unitless Team Builder budget as a project budget', async () => {
    const response = await runMockAgent('Build a startup MVP team with a budget of ฿50,000');
    expect(response.parsed).toMatchObject({ budgetTHB: 50000, budgetUnit: 'project' });
    expect(response.toolCalls[0].input).toMatchObject({ budgetTHB: 50000, budgetUnit: 'project' });
    expect(response.toolCalls[0].output.ok).toBe(true);
  });
  it('adds grounded fit reasons to member-search results', async () => {
    const response = await runMockAgent('Find a React freelance developer');
    const ben = response.results.find((item) => typeof item === 'object' && item !== null && 'id' in item && item.id === 'mem-ben');
    expect(ben).toMatchObject({ reasons: expect.arrayContaining(['Skills include React.', 'Profile lists availability as available.']) });
  });
});
