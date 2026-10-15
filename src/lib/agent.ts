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
const dictionary: [RegExp, string, string?][] = [
  [/ui\s*\/?\s*ux|ui\/ux/i, 'UI/UX', 'design'], [/react(?:\.js)?/i, 'React', 'engineering'], [/front[- ]?end/i, 'frontend', 'engineering'], [/back[- ]?end/i, 'backend', 'engineering'], [/python/i, 'Python', 'engineering'], [/\bai\b|artificial intelligence/i, 'AI', 'engineering'], [/blockchain|web3/i, 'blockchain', 'engineering'], [/digital marketing/i, 'digital marketing', 'marketing'], [/marketing/i, 'marketing', 'marketing'], [/design(?:er)?/i, 'design', 'design'], [/javascript/i, 'JavaScript', 'engineering'], [/startup/i, 'startup'],
];
export function parseAgentRequest(text: string): ParsedAgentRequest {
  const source = text.trim();
  const roles = new Set<string>(); const skills = new Set<string>();
  for (const [pattern, value, role] of dictionary) if (pattern.test(source)) { if (role) roles.add(value === 'frontend' || value === 'backend' ? value : role); if (!role || value !== 'startup') skills.add(value); }
  if (/startup.{0,40}(team|mvp)|(team|mvp).{0,40}startup/i.test(source)) roles.add('engineering');
  if (/freelance/i.test(source) && !roles.size) roles.add('engineering');
  if (/marketing/i.test(source)) roles.add('marketing');
  if (/team|teammate|startup|mvp|blockchain/i.test(source)) { if (!roles.size) roles.add('engineering'); }
  const mode: ParsedAgentRequest['mode'] = /opportunit|job|project listing/i.test(source) ? 'opportunities' : /team|teammate|startup|mvp|recommend/i.test(source) ? 'team' : 'members';
  const budgetMatch = source.match(/(?:฿|thb\s*)([\d,]+)|([\d,]+)\s*(?:thb|baht|฿)/i);
  const budgetTHB = budgetMatch ? Number((budgetMatch[1] ?? budgetMatch[2]).replaceAll(',', '')) : undefined;
  const budgetUnit: CompensationUnit | undefined = budgetTHB === undefined ? undefined : /(?:per|under|below|less than)\s*hour|hourly|\/\s*hour/i.test(source) ? 'hourly' : /(?:per|under|below|less than)\s*month|monthly|\/\s*month/i.test(source) ? 'monthly' : /(?:per|under|below|less than)\s*project|project/i.test(source) ? 'project' : undefined;
  const count = Number(source.match(/\b(\d+)\s+(?:people|members|teammates|candidates)/i)?.[1] ?? 5);
  return { intent: source || 'Search the U-Connect catalog', mode, roles: [...roles], skills: [...skills], ...(budgetTHB !== undefined ? { budgetTHB } : {}), ...(budgetUnit ? { budgetUnit } : {}), count, rationale: `Selected ${mode} search from the request wording${skills.size ? `; matched skills: ${[...skills].join(', ')}` : ''}.` };
}

export async function runMockAgent(text: string, services: ToolServices = {}) {
  const parsed = parseAgentRequest(text);
  const tool = parsed.mode === 'team' ? 'recommend_team' : parsed.mode === 'opportunities' ? 'search_opportunities' : 'search_members';
  const input = tool === 'recommend_team' ? { roles: parsed.roles, skills: parsed.skills, count: parsed.count, budgetTHB: parsed.budgetTHB, budgetUnit: parsed.budgetUnit }
    : tool === 'search_opportunities' ? { query: parsed.skills.length ? undefined : text, skills: parsed.skills.length ? parsed.skills : undefined, budgetTHB: parsed.budgetTHB, budgetUnit: parsed.budgetUnit }
      : { query: parsed.skills.length ? undefined : text, role: parsed.roles[0], skills: parsed.skills.length ? parsed.skills : undefined, budgetTHB: parsed.budgetTHB, budgetUnit: parsed.budgetUnit };
  const output: ToolResult = await dispatchTool(tool, input, services);
  const result = output.ok ? output.result : [];
  const rows = Array.isArray(result) ? result : (result as any)?.recommendations ?? [];
  return { parsed, toolCalls: [{ tool, input, output }], results: rows, nextSteps: output.ok ? (parsed.mode === 'team' ? ['Review role coverage and unfilled roles.', 'Create a project to record your team plan.', 'Request introductions; sharing contact details requires approval.'] : ['Review the ranked catalog results.', 'Request an introduction when you find a fit. Contact details are shared only after approval.']) : [output.error.message] };
}
