import { members, opportunities } from './seed';
import type { Availability, CompensationUnit, Member, Opportunity, OpportunityType } from './types';

export interface SearchMemberOptions { query?: string; role?: string; skills?: string[]; availability?: Availability; budgetTHB?: number; budgetUnit?: CompensationUnit; }
export interface SearchOpportunityOptions { query?: string; type?: OpportunityType; skills?: string[]; budgetTHB?: number; budgetUnit?: CompensationUnit; }
export interface MatchResult { member: Member; score: number; reasons: string[]; }
export interface TeamOptions { roles?: string[]; skills?: string[]; budgetTHB?: number; budgetUnit?: CompensationUnit; count?: number; }
export interface TeamRecommendation extends MatchResult { requestedRole: string | null; }
export interface TeamResult { recommendations: TeamRecommendation[]; filledRoles: string[]; unfilledRoles: string[]; }

const normalize = (value: string) => value.trim().toLowerCase();
const includesAll = (haystack: string[], requested: string[]) => requested.every((wanted) => haystack.some((value) => normalize(value) === normalize(wanted)));
const textMatches = (values: string[], query: string) => values.join(' ').toLowerCase().includes(normalize(query));

const roleFamilies: Array<{ family: string; pattern: RegExp }> = [
  { family: 'engineering', pattern: /engineer|developer|frontend|front-end|backend|back-end|software|technical/i },
  { family: 'design', pattern: /design|designer|ui|ux|visual/i },
  { family: 'marketing', pattern: /marketing|growth|content|brand/i },
  { family: 'recruiting', pattern: /recruit|talent|people operations|human resources|\bhr\b/i },
  { family: 'business', pattern: /business|finance|founder|founding|operator|partnership|community/i },
];

const skillFamilies: Record<string, string> = {
  'react': 'engineering', 'next.js': 'engineering', 'typescript': 'engineering', 'tailwind css': 'engineering',
  'node.js': 'engineering', 'postgresql': 'engineering', 'python': 'engineering', 'fastapi': 'engineering',
  'docker': 'engineering', 'machine learning': 'engineering', 'pytorch': 'engineering', 'data analysis': 'engineering',
  'javascript': 'engineering', 'blockchain': 'engineering', 'sql': 'engineering', 'data engineering': 'engineering',
  'airflow': 'engineering', 'react native': 'engineering', 'ios': 'engineering', 'android': 'engineering',
  'ui/ux': 'design', 'figma': 'design', 'prototyping': 'design', 'design systems': 'design',
  'user research': 'design', 'accessibility': 'design', 'visual design': 'design', 'brand identity': 'design',
  'digital marketing': 'marketing', 'seo': 'marketing', 'content strategy': 'marketing', 'analytics': 'marketing',
  'copywriting': 'marketing', 'social media': 'marketing', 'brand strategy': 'marketing',
  'recruiting': 'recruiting', 'talent sourcing': 'recruiting', 'interviewing': 'recruiting',
  'people operations': 'recruiting', 'hr': 'recruiting', 'onboarding': 'recruiting',
  'product strategy': 'business', 'fundraising': 'business', 'operations': 'business',
  'business development': 'business', 'partnerships': 'business', 'sales': 'business', 'negotiation': 'business',
  'financial modeling': 'business', 'business analysis': 'business', 'excel': 'business',
  'community building': 'business', 'events': 'business', 'communications': 'business',
};

function roleFamily(value: string): string | undefined {
  return roleFamilies.find(({ pattern }) => pattern.test(value))?.family;
}

function skillsForRole(role: string, requestedSkills: string[]): string[] {
  const family = roleFamily(role);
  if (!family) return requestedSkills.filter((skill) => !skillFamilies[normalize(skill)]);
  return requestedSkills.filter((skill) => {
    const skillFamily = skillFamilies[normalize(skill)];
    return skillFamily === family || skillFamily === undefined;
  });
}

function memberMatchesRole(member: Member, role: string): boolean {
  return normalize(member.role) === normalize(role) || normalize(member.headline).includes(normalize(role));
}

export function searchMembers(options: SearchMemberOptions = {}, catalog: Member[] = members): Member[] {
  if ((options.budgetTHB === undefined) !== (options.budgetUnit === undefined)) throw new Error('budgetTHB and budgetUnit must be supplied together.');
  return catalog.filter((member) =>
    (!options.query || textMatches([member.name, member.headline, member.bio, ...member.skills, ...member.projects, ...member.interests], options.query)) &&
    (!options.role || normalize(member.role) === normalize(options.role) || normalize(member.headline).includes(normalize(options.role))) &&
    (!options.skills?.length || includesAll(member.skills, options.skills)) &&
    (!options.availability || member.availability === options.availability) &&
    (options.budgetTHB === undefined || (member.compensationAmountTHB !== undefined && member.compensationUnit === options.budgetUnit && member.compensationAmountTHB <= options.budgetTHB)),
  );
}

export function searchOpportunities(options: SearchOpportunityOptions = {}, catalog: Opportunity[] = opportunities): Opportunity[] {
  return catalog.filter((item) =>
    (!options.query || textMatches([item.title, item.role, item.description, ...item.requiredSkills], options.query)) &&
    (!options.type || item.type === options.type) &&
    (!options.skills?.length || includesAll(item.requiredSkills, options.skills)) &&
    (options.budgetTHB === undefined || (item.budgetTHB !== undefined && item.budgetUnit === options.budgetUnit && item.budgetTHB <= options.budgetTHB)),
  );
}

function scoreMember(member: Member, requiredSkills: string[], budgetTHB?: number, budgetUnit?: CompensationUnit): MatchResult {
  const matched = requiredSkills.filter((skill) => member.skills.some((known) => normalize(known) === normalize(skill)));
  let score = requiredSkills.length ? Math.round((matched.length / requiredSkills.length) * 55) : 20;
  const reasons: string[] = [];
  if (matched.length) reasons.push(`Skills include ${matched.join(', ')}.`);
  if (member.projects.length) reasons.push(`Project evidence: ${member.projects[0]}`);
  if (member.availability === 'available') { score += 20; reasons.push('Profile lists availability as available.'); }
  else if (member.availability === 'part-time') { score += 10; reasons.push('Profile lists part-time availability.'); }
  if (budgetTHB !== undefined && budgetUnit && member.compensationAmountTHB !== undefined && member.compensationUnit === budgetUnit) {
    const unitLabel = budgetUnit === 'hourly' ? '/hour' : budgetUnit === 'monthly' ? '/month' : budgetUnit === 'project' ? ' for the project' : '';
    if (member.compensationAmountTHB <= budgetTHB) { score += 20; reasons.push(`Listed compensation ฿${member.compensationAmountTHB}${unitLabel} fits the ฿${budgetTHB}${unitLabel} budget.`); }
    else { score += 5; reasons.push(`Listed compensation ฿${member.compensationAmountTHB}${unitLabel} is above the ฿${budgetTHB}${unitLabel} budget.`); }
  }
  return { member, score, reasons };
}

export function matchCandidates(opportunity: Opportunity, catalog: Member[] = members): MatchResult[] {
  return catalog
    .filter((member) => member.availability !== 'busy' && includesAll(member.skills, opportunity.requiredSkills))
    .map((member) => scoreMember(member, opportunity.requiredSkills, opportunity.budgetTHB, opportunity.budgetUnit))
    .sort((a, b) => b.score - a.score || a.member.id.localeCompare(b.member.id));
}

export function recommendTeam(options: TeamOptions, catalog: Member[] = members): TeamResult {
  const roles = options.roles ?? [];
  const requiredSkills = options.skills ?? [];
  const byScore = (role: string) => {
    const roleSkills = skillsForRole(role, requiredSkills);
    return catalog
      .filter((member) => member.availability !== 'busy' && memberMatchesRole(member, role) && includesAll(member.skills, roleSkills))
      .map((member) => {
        const match = scoreMember(member, roleSkills, options.budgetTHB, options.budgetUnit);
        return { ...match, reasons: [`Profile role or headline matches ${role}.`, ...match.reasons], requestedRole: role };
      })
      .sort((a, b) => b.score - a.score || a.member.id.localeCompare(b.member.id));
  };
  if (roles.length) {
    const assignedMemberRole = new Map<string, number>();
    const assignedRoleMember = new Map<number, TeamRecommendation>();
    const assignRole = (roleIndex: number, seenMembers: Set<string>): boolean => {
      for (const candidate of byScore(roles[roleIndex])) {
        const memberId = candidate.member.id;
        if (seenMembers.has(memberId)) continue;
        seenMembers.add(memberId);
        const previousRole = assignedMemberRole.get(memberId);
        if (previousRole === undefined || assignRole(previousRole, seenMembers)) {
          assignedMemberRole.set(memberId, roleIndex);
          assignedRoleMember.set(roleIndex, candidate);
          return true;
        }
      }
      return false;
    };
    roles.forEach((_, roleIndex) => assignRole(roleIndex, new Set()));
    const recommendations: TeamRecommendation[] = [];
    const filledRoles: string[] = [];
    const unfilledRoles: string[] = [];
    roles.forEach((role, roleIndex) => {
      const candidate = assignedRoleMember.get(roleIndex);
      if (!candidate) { unfilledRoles.push(role); return; }
      recommendations.push(candidate);
      filledRoles.push(role);
    });
    return { recommendations, filledRoles, unfilledRoles };
  }
  const eligible = catalog.filter((member) => member.availability !== 'busy' && includesAll(member.skills, requiredSkills));
  const recommendations = eligible.map((member) => ({ ...scoreMember(member, requiredSkills, options.budgetTHB, options.budgetUnit), requestedRole: null }))
    .sort((a, b) => b.score - a.score || a.member.id.localeCompare(b.member.id))
    .slice(0, options.count ?? 5);
  return { recommendations, filledRoles: [], unfilledRoles: [] };
}
