import { dispatchTool, type ToolServices, type ToolResult } from './tools';
import type { CompensationUnit } from './types';

export interface ParsedAgentRequest {
  intent: string;
  mode: 'members' | 'opportunities' | 'team';
  roles: string[];
  skills: string[];
  budgetTHB?: number;
  budgetUnit?: CompensationUnit;
  count: number;
  rationale: string;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function agentResultRows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.recommendations)) return value.recommendations;
  return [];
}
const dictionary: Array<{ pattern: RegExp; value: string; role?: string; skill?: boolean }> = [
  { pattern: /ui\s*\/?\s*ux|ui\/ux/i, value: 'UI/UX', role: 'design' },
  { pattern: /react(?:\.js)?/i, value: 'React', role: 'engineering' },
  { pattern: /front[- ]?end/i, value: 'frontend', role: 'frontend', skill: false },
  { pattern: /back[- ]?end/i, value: 'backend', role: 'backend', skill: false },
  { pattern: /python/i, value: 'Python', role: 'engineering' },
  { pattern: /\bai\b|artificial intelligence/i, value: 'AI', role: 'engineering' },
  { pattern: /blockchain|web3/i, value: 'blockchain', role: 'engineering' },
  { pattern: /digital marketing/i, value: 'digital marketing', role: 'marketing' },
  { pattern: /marketing/i, value: 'marketing', role: 'marketing', skill: false },
  { pattern: /design(?:er)?/i, value: 'design', role: 'design', skill: false },
  { pattern: /javascript/i, value: 'JavaScript', role: 'engineering' },
  { pattern: /startup/i, value: 'startup', skill: false },
];
export function parseAgentRequest(text: string): ParsedAgentRequest {
  const source = text.trim();
  const roles = new Set<string>(); const skills = new Set<string>();
  for (const { pattern, value, role, skill = true } of dictionary) if (pattern.test(source)) { if (role) roles.add(role); if (skill) skills.add(value); }
  if (!roles.size && /startup.{0,40}(team|mvp)|(team|mvp).{0,40}startup/i.test(source)) roles.add('engineering');
  if (/freelance/i.test(source) && !roles.size) roles.add('engineering');
  if (/marketing/i.test(source)) roles.add('marketing');
  if (/team|teammate|startup|mvp|blockchain/i.test(source)) { if (!roles.size) roles.add('engineering'); }
  const mode: ParsedAgentRequest['mode'] = /opportunit|job|project listing/i.test(source) ? 'opportunities' : /team|teammate|startup|mvp|recommend/i.test(source) ? 'team' : 'members';
  const budgetMatch = source.match(/(?:฿|thb\s*)([\d,]+)|([\d,]+)\s*(?:thb|baht|฿)/i);
  const budgetTHB = budgetMatch ? Number((budgetMatch[1] ?? budgetMatch[2]).replaceAll(',', '')) : undefined;
  let budgetUnit: CompensationUnit | undefined;
  if (budgetTHB !== undefined) {
    if (/(?:per|under|below|less than)\s*hour|hourly|\/\s*hour/i.test(source)) budgetUnit = 'hourly';
    else if (/(?:per|under|below|less than)\s*month|monthly|\/\s*month/i.test(source)) budgetUnit = 'monthly';
    else if (/(?:per|under|below|less than)\s*project|project/i.test(source) || mode === 'team') budgetUnit = 'project';
  }
  const count = Number(source.match(/\b(\d+)\s+(?:people|members|teammates|candidates)/i)?.[1] ?? 5);
  return { intent: source || 'Search the U-Connect catalog', mode, roles: [...roles], skills: [...skills], ...(budgetTHB !== undefined ? { budgetTHB } : {}), ...(budgetUnit ? { budgetUnit } : {}), count, rationale: `Selected ${mode} search from the request wording${skills.size ? `; matched skills: ${[...skills].join(', ')}` : ''}.` };
}

function memberReasons(value: unknown, parsed: ParsedAgentRequest): unknown {
  if (!isRecord(value) || typeof value.id !== 'string') return value;
  const role = typeof value.role === 'string' ? value.role.toLowerCase() : '';
  const headline = typeof value.headline === 'string' ? value.headline.toLowerCase() : '';
  const skills = Array.isArray(value.skills) ? value.skills.filter((skill): skill is string => typeof skill === 'string') : [];
  const projects = Array.isArray(value.projects) ? value.projects.filter((project): project is string => typeof project === 'string') : [];
  const matchedRoles = parsed.roles.filter((wanted) => role === wanted.toLowerCase() || headline.includes(wanted.toLowerCase()));
  const matchedSkills = parsed.skills.filter((wanted) => skills.some((skill) => skill.toLowerCase() === wanted.toLowerCase()));
  const reasons: string[] = [];
  if (matchedRoles.length) reasons.push(`Profile role or headline matches ${matchedRoles.join(', ')}.`);
  if (matchedSkills.length) reasons.push(`Skills include ${matchedSkills.join(', ')}.`);
  if (projects[0]) reasons.push(`Project evidence: ${projects[0]}`);
  if (value.availability === 'available') reasons.push('Profile lists availability as available.');
  else if (value.availability === 'part-time') reasons.push('Profile lists part-time availability.');
  if (!reasons.length) reasons.push('Returned by the local catalog using the request filters.');
  return { ...value, reasons };
}

export async function runMockAgent(text: string, services: ToolServices = {}) {
  const parsed = parseAgentRequest(text);
  const tool = parsed.mode === 'team' ? 'recommend_team' : parsed.mode === 'opportunities' ? 'search_opportunities' : 'search_members';
  const aiMentioned = parsed.skills.includes('AI');
  const searchableSkills = parsed.skills.filter((skill) => skill !== 'AI');
  const query = aiMentioned ? 'AI' : searchableSkills.length || parsed.roles.length ? undefined : text;
  const queryFilter = query ? { query } : {};
  const skillsFilter = searchableSkills.length ? { skills: searchableSkills } : {};
  const budgetFilter = parsed.budgetTHB !== undefined && parsed.budgetUnit !== undefined
    ? { budgetTHB: parsed.budgetTHB, budgetUnit: parsed.budgetUnit }
    : {};
  const input = tool === 'recommend_team' ? { roles: parsed.roles, ...skillsFilter, count: parsed.count, ...budgetFilter }
    : tool === 'search_opportunities' ? { ...queryFilter, ...skillsFilter, ...budgetFilter }
      : { ...queryFilter, role: parsed.roles[0], ...skillsFilter, ...budgetFilter };
  const output: ToolResult = await dispatchTool(tool, input, services);
  const result = output.ok ? output.result : [];
  const rows = agentResultRows(result);
  const results = tool === 'search_members' && output.ok ? rows.map((member) => memberReasons(member, parsed)) : rows;
  return { parsed, toolCalls: [{ tool, input, output }], results, nextSteps: output.ok ? (parsed.mode === 'team' ? ['Review role coverage and unfilled roles.', 'Create a project to record your team plan.', 'Request introductions; sharing contact details requires approval.'] : ['Review the ranked catalog results.', 'Request an introduction when you find a fit. Contact details are shared only after approval.']) : [output.error.message] };
}
