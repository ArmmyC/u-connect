import { describe, expect, it } from 'vitest';
import { members, opportunities } from '@/lib/seed';

describe('fictional seed catalog', () => {
  it('has enough public members and opportunities', () => {
    expect(members.length).toBeGreaterThanOrEqual(15);
    expect(opportunities.length).toBeGreaterThanOrEqual(10);
  });

  it('uses unique fixture IDs and valid opportunity owners', () => {
    const memberIds = members.map((member) => member.id);
    const opportunityIds = opportunities.map((opportunity) => opportunity.id);
    expect(new Set(memberIds).size).toBe(memberIds.length);
    expect(new Set(opportunityIds).size).toBe(opportunityIds.length);
    expect(opportunities.every((item) => memberIds.includes(item.ownerId))).toBe(true);
  });

  it('does not expose private contact fields on public members', () => {
    for (const member of members) {
      expect(member).not.toHaveProperty('email');
      expect(member).not.toHaveProperty('phone');
      expect(member).not.toHaveProperty('privateContact');
    }
  });
});
