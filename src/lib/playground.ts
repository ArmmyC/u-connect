import { toolSchemas, type ToolName } from './validation';

export const playgroundToolNames = [
  'search_members',
  'search_opportunities',
  'match_candidates',
  'recommend_team',
  'create_project',
  'request_introduction',
  'get_member_profile',
] as const satisfies readonly ToolName[];

export const playgroundToolDescriptions: Record<ToolName, string> = {
  search_members: 'Find public fictional member profiles by query, role, skills, availability, or a matching compensation range.',
  search_opportunities: 'Search public fictional project, job, freelance, collaboration, and cofounder listings.',
  match_candidates: 'Rank eligible members for one opportunity and explain each score with catalog evidence.',
  recommend_team: 'Recommend a role-aware team from the available fictional member catalog.',
  create_project: 'Create a project owned by the current demo actor. This is a persistent workflow action.',
  request_introduction: 'Send a pending introduction request for a project owned by the current demo actor.',
  get_member_profile: 'Read one public member profile. Private contact details are never included.',
};

export const playgroundExamples: Record<ToolName, Record<string, unknown>> = {
  search_members: { query: 'React' },
  search_opportunities: { query: 'AI' },
  match_candidates: { opportunityId: 'opp-marketplace' },
  recommend_team: { roles: ['frontend', 'design'], skills: ['React', 'UI/UX'], count: 4 },
  create_project: {
    ownerId: 'mem-ada',
    title: 'Community marketplace MVP',
    description: 'Prototype searchable listings and a simple seller workflow.',
    skills: ['React', 'TypeScript'],
    budgetTHB: 90000,
  },
  request_introduction: { projectId: 'replace-with-created-project-id', memberId: 'mem-ben' },
  get_member_profile: { memberId: 'mem-erin' },
};

export type PlaygroundInputResult =
  | { ok: true; input: unknown }
  | { ok: false; kind: 'json' | 'schema'; message: string };

export function parsePlaygroundInput(tool: ToolName, rawText: string): PlaygroundInputResult {
  let value: unknown;
  try {
    value = JSON.parse(rawText) as unknown;
  } catch {
    return { ok: false, kind: 'json', message: 'Enter valid JSON before calling this tool.' };
  }

  const parsed = toolSchemas[tool].safeParse(value);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.length ? issue.path.join('.') : 'input'}: ${issue.message}`)
      .join('; ');
    return { ok: false, kind: 'schema', message };
  }

  return { ok: true, input: parsed.data };
}
