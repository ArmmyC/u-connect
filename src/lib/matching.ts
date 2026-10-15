import { members, opportunities } from './seed';
import type { Availability, Member, Opportunity, OpportunityType } from './types';

export interface SearchMemberOptions { query?: string; role?: string; skills?: string[]; availability?: Availability; }
export interface SearchOpportunityOptions { query?: string; type?: OpportunityType; skills?: string[]; budgetTHB?: number; }
export interface MatchResult { member: Member; score: number; reasons: string[]; }
export interface TeamOptions { roles?: string[]; skills?: string[]; budgetTHB?: number; count?: number; }

const normalize = (value: string) => value.trim().toLowerCase();
const includesAll = (haystack: string[], requested: string[]) => requested.every((wanted) => haystack.some((value) => normalize(value) === normalize(wanted)));
const textMatches = (values: string[], query: string) => values.join(' ').toLowerCase().includes(normalize(query));

export function searchMembers(options: SearchMemberOptions = {}, catalog: Member[] = members): Member[] {
  return catalog.filter((member) =>
    (!options.query || textMatches([member.name, member.headline, member.bio, ...member.skills, ...member.projects, ...member.interests], options.query)) &&
    (!options.role || normalize(member.role) === normalize(options.role) || normalize(member.headline).includes(normalize(options.role))) &&
    (!options.skills?.length || includesAll(member.skills, options.skills)) &&
    (!options.availability || member.availability === options.availability),
  );
}

export function searchOpportunities(options: SearchOpportunityOptions = {}, catalog: Opportunity[] = opportunities): Opportunity[] {
  return catalog.filter((item) =>
    (!options.query || textMatches([item.title, item.role, item.description, ...item.requiredSkills], options.query)) &&
    (!options.type || item.type === options.type) &&
    (!options.skills?.length || includesAll(item.requiredSkills, options.skills)) &&
    (options.budgetTHB === undefined || (item.budgetTHB !== undefined && item.budgetTHB <= options.budgetTHB)),
  );
}

function scoreMember(member: Member, requiredSkills: string[], budgetTHB?: number): MatchResult {
  const matched = requiredSkills.filter((skill) => member.skills.some((known) => normalize(known) === normalize(skill)));
  let score = requiredSkills.length ? Math.round((matched.length / requiredSkills.length) * 55) : 20;
  const reasons: string[] = [];
  if (matched.length) reasons.push(`Skills include ${matched.join(', ')}.`);
  if (member.projects.length) reasons.push(`Project evidence: ${member.projects[0]}`);
  if (member.availability === 'available') { score += 20; reasons.push('Profile lists availability as available.'); }
  else if (member.availability === 'part-time') { score += 10; reasons.push('Profile lists part-time availability.'); }
  if (budgetTHB !== undefined && member.hourlyRateTHB !== undefined) {
    if (member.hourlyRateTHB <= budgetTHB) { score += 20; reasons.push(`Listed rate ฿${member.hourlyRateTHB}/hour fits the ฿${budgetTHB}/hour budget.`); }
    else { score += 5; reasons.push(`Listed rate ฿${member.hourlyRateTHB}/hour is above the ฿${budgetTHB}/hour budget.`); }
  }
  return { member, score, reasons };
}

export function matchCandidates(opportunity: Opportunity, catalog: Member[] = members): MatchResult[] {
  return catalog
    .filter((member) => member.availability !== 'busy' && includesAll(member.skills, opportunity.requiredSkills))
    .map((member) => scoreMember(member, opportunity.requiredSkills, opportunity.budgetTHB))
    .sort((a, b) => b.score - a.score || a.member.id.localeCompare(b.member.id));
}

export function recommendTeam(options: TeamOptions, catalog: Member[] = members): MatchResult[] {
  const roles = options.roles ?? [];
  const requiredSkills = options.skills ?? [];
  const candidates = catalog.filter((member) => member.availability !== 'busy' &&
    (!roles.length || roles.some((role) => normalize(member.role) === normalize(role) || normalize(member.headline).includes(normalize(role)))) &&
    (!requiredSkills.length || member.skills.some((skill) => requiredSkills.some((wanted) => normalize(skill) === normalize(wanted)))));
  return candidates.map((member) => scoreMember(member, requiredSkills, options.budgetTHB))
    .sort((a, b) => b.score - a.score || a.member.id.localeCompare(b.member.id))
    .slice(0, options.count ?? (roles.length || 5));
}
