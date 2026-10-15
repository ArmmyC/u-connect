import { matchCandidates, recommendTeam, searchMembers, searchOpportunities } from './matching';
import { members, opportunities } from './seed';
import type { Introduction, Member, Opportunity, Project } from './types';
import { toolSchemas, type ToolName } from './validation';

export interface ToolServices {
  members?: Member[];
  opportunities?: Opportunity[];
  createProject?: (input: { ownerId: string; title: string; description: string; skills: string[]; budgetTHB?: number }) => Promise<Project> | Project;
  requestIntroduction?: (input: { projectId: string; memberId: string }) => Promise<Introduction> | Introduction;
}
export type ToolResult = { ok: true; tool: string; result: unknown } | { ok: false; error: { code: string; message: string } };
const failure = (code: string, message: string): ToolResult => ({ ok: false, error: { code, message } });
const publicMember = (member: Member) => ({
  id: member.id, name: member.name, headline: member.headline, role: member.role,
  location: member.location, skills: member.skills, bio: member.bio, projects: member.projects,
  portfolioUrl: member.portfolioUrl, githubUrl: member.githubUrl, availability: member.availability,
  interests: member.interests, preferredWork: member.preferredWork, compensation: member.compensation,
  compensationUnit: member.compensationUnit, compensationAmountTHB: member.compensationAmountTHB,
  openToCollaborate: member.openToCollaborate, openToHire: member.openToHire,
});

function projectPublic(value: Project) {
  return { id: value.id, ownerId: value.ownerId, title: value.title, description: value.description, skills: value.skills, ...(value.budgetTHB !== undefined ? { budgetTHB: value.budgetTHB } : {}) };
}
function introductionPublic(value: Introduction) {
  return { id: value.id, projectId: value.projectId, memberId: value.memberId, status: value.status, createdAt: value.createdAt };
}

async function dispatchToolUnchecked(name: string, input: unknown, services: ToolServices): Promise<ToolResult> {
  if (!Object.prototype.hasOwnProperty.call(toolSchemas, name)) return failure('UNKNOWN_TOOL', `Unknown tool: ${name}`);
  const tool = name as ToolName;
  const parsed = toolSchemas[tool].safeParse(input);
  if (!parsed.success) return failure('INVALID_INPUT', parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  const catalog = services.members ?? members;
  const opps = services.opportunities ?? opportunities;
  const args = parsed.data as Record<string, any>;
  switch (tool) {
    case 'search_members': return { ok: true, tool, result: searchMembers(args, catalog).map(publicMember) };
    case 'search_opportunities': return { ok: true, tool, result: searchOpportunities(args, opps) };
    case 'match_candidates': {
      const opportunity = opps.find((item) => item.id === args.opportunityId);
      return opportunity ? { ok: true, tool, result: matchCandidates(opportunity, catalog).map((item) => ({ ...item, member: publicMember(item.member) })) } : failure('NOT_FOUND', 'Opportunity was not found.');
    }
    case 'recommend_team': {
      const result = recommendTeam(args, catalog);
      return { ok: true, tool, result: { ...result, recommendations: result.recommendations.map((item) => ({ ...item, member: publicMember(item.member) })) } };
    }
    case 'get_member_profile': {
      const member = catalog.find((item) => item.id === args.memberId);
      return member ? { ok: true, tool, result: publicMember(member) } : failure('NOT_FOUND', 'Member was not found.');
    }
    case 'create_project': {
      if (!services.createProject) return failure('SERVICE_UNAVAILABLE', 'Project creation service is unavailable.');
      const project = await services.createProject(args as Parameters<NonNullable<ToolServices['createProject']>>[0]);
      return { ok: true, tool, result: projectPublic(project) };
    }
    case 'request_introduction': {
      if (!services.requestIntroduction) return failure('SERVICE_UNAVAILABLE', 'Introduction request service is unavailable.');
      const introduction = await services.requestIntroduction(args as Parameters<NonNullable<ToolServices['requestIntroduction']>>[0]);
      if (introduction.status !== 'pending') return failure('INVALID_SERVICE_RESULT', 'Introduction service must return a pending request.');
      return { ok: true, tool, result: introductionPublic(introduction) };
    }
  }
}

export async function dispatchTool(name: string, input: unknown, services: ToolServices = {}): Promise<ToolResult> {
  try { return await dispatchToolUnchecked(name, input, services); }
  catch { return failure('SERVICE_ERROR', 'Tool service failed.'); }
}
