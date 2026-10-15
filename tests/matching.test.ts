import { describe, expect, it } from 'vitest';
import { matchCandidates, recommendTeam, searchMembers, searchOpportunities } from '@/lib/matching';
import { members, opportunities } from '@/lib/seed';

describe('matching', () => {
  it('filters members by all requested hard skills and availability', () => {
    const result = searchMembers({ skills: ['React', 'TypeScript'], availability: 'available' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((member) => member.availability === 'available' && ['React','TypeScript'].every((skill) => member.skills.includes(skill)))).toBe(true);
  });

  it('filters opportunities by required skills and budget', () => {
    const result = searchOpportunities({ skills: ['Python'], budgetTHB: 60000, budgetUnit: 'project' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.requiredSkills.includes('Python') && (item.budgetTHB ?? Infinity) <= 60000)).toBe(true);
  });

  it('returns candidates in deterministic score order with evidence-based reasons', () => {
    const opportunity = opportunities.find((item) => item.id === 'opp-marketplace')!;
    const result = matchCandidates(opportunity, members);
    expect(result.length).toBeGreaterThan(0);
    expect(result.map(({score}) => score)).toEqual([...result.map(({score}) => score)].sort((a,b) => b-a));
    expect(result[0].member.skills).toContain('React');
    expect(result[0].reasons.join(' ')).toMatch(/React|TypeScript|project/i);
    expect(result.every(({reasons}) => reasons.length > 0)).toBe(true);
  });

  it('uses budget fit to order otherwise eligible candidates', () => {
    const opportunity = { ...opportunities.find((item) => item.id === 'opp-marketplace')!, requiredSkills: ['React'], budgetTHB: 900, budgetUnit: 'hourly' as const };
    const result = matchCandidates(opportunity, members.filter((member) => ['mem-ben','mem-ada'].includes(member.id)));
    expect(result[0].member.id).toBe('mem-ben');
    expect(result[0].reasons.join(' ')).toMatch(/budget|rate/i);
  });

  it('scores budget fit only when compensation units match', () => {
    const candidate = members.find((member) => member.id === 'mem-ben')!;
    const opportunity = { ...opportunities[0], requiredSkills: ['React'], budgetTHB: 900, budgetUnit: 'hourly' as const };
    const compatible = matchCandidates(opportunity, [candidate])[0];
    expect(compatible.reasons.join(' ')).toMatch(/fits the ฿900\/hour budget/);
    const incompatible = matchCandidates({ ...opportunity, budgetUnit: 'project' }, [candidate])[0];
    const withoutBudget = matchCandidates({ ...opportunity, budgetTHB: undefined, budgetUnit: undefined }, [candidate])[0];
    expect(incompatible.score).toBe(withoutBudget.score);
    expect(incompatible.reasons.join(' ')).not.toMatch(/budget|rate|฿\/hour/i);
  });

  it('recommends distinct role-compatible team members', () => {
    const result = recommendTeam({ roles: ['Frontend engineer', 'Product designer'], skills: ['React','UI/UX'], count: 2 });
    expect(result.recommendations).toHaveLength(2);
    expect(new Set(result.recommendations.map((item) => item.member.id)).size).toBe(2);
    expect(result.filledRoles).toEqual(['Frontend engineer', 'Product designer']);
    expect(result.unfilledRoles).toEqual([]);
  });

  it('fills each requested role once and reports unfilled roles', () => {
    const candidates = [
      { ...members[1], id: 'front-a', headline: 'Frontend engineer' },
      { ...members[1], id: 'front-b', headline: 'Frontend engineer' },
      { ...members[4], id: 'design-a', headline: 'Product designer' },
    ];
    const result = recommendTeam({ roles: ['Frontend engineer', 'Product designer', 'Recruiter'] }, candidates);
    expect(result.recommendations.map((item) => item.requestedRole)).toEqual(['Frontend engineer', 'Product designer']);
    expect(new Set(result.recommendations.map((item) => item.member.id)).size).toBe(2);
    expect(result.filledRoles).toEqual(['Frontend engineer', 'Product designer']);
    expect(result.unfilledRoles).toEqual(['Recruiter']);
  });

  it('returns a ranked fallback team when no roles are specified', () => {
    const result = recommendTeam({ count: 3 });
    expect(result.recommendations).toHaveLength(3);
    expect(result.recommendations.every((item) => item.requestedRole === null)).toBe(true);
    expect(result.filledRoles).toEqual([]);
    expect(result.unfilledRoles).toEqual([]);
  });

  it('covers all roles when a flexible candidate could otherwise take a scarce role', () => {
    const flexible = { ...members[1], id: 'flexible', headline: 'Frontend designer', availability: 'available' as const };
    const frontendOnly = { ...members[1], id: 'frontend-only', headline: 'Frontend engineer', availability: 'part-time' as const };
    const result = recommendTeam({ roles: ['frontend', 'designer'] }, [flexible, frontendOnly]);
    expect(result.filledRoles).toEqual(['frontend', 'designer']);
    expect(result.unfilledRoles).toEqual([]);
    expect(result.recommendations.map((item) => [item.requestedRole, item.member.id])).toEqual([
      ['frontend', 'frontend-only'],
      ['designer', 'flexible'],
    ]);
  });
});
