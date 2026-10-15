import { z } from 'zod';

const nonempty = z.string().trim().min(1);
const budget = z.number().finite().nonnegative();
const unit = z.enum(['hourly', 'monthly', 'project', 'equity', 'negotiable']);
export const toolSchemas = {
  search_members: z.object({ query: nonempty.optional(), role: nonempty.optional(), skills: z.array(nonempty).optional(), availability: z.enum(['available', 'part-time', 'busy']).optional() }).strict(),
  search_opportunities: z.object({ query: nonempty.optional(), type: z.enum(['project', 'job', 'freelance', 'collaboration', 'cofounder']).optional(), skills: z.array(nonempty).optional(), budgetTHB: budget.optional(), budgetUnit: unit.optional() }).strict().refine((value) => value.budgetTHB === undefined || value.budgetUnit !== undefined, 'budgetUnit is required when budgetTHB is supplied'),
  match_candidates: z.object({ opportunityId: nonempty }).strict(),
  recommend_team: z.object({ roles: z.array(nonempty).optional(), skills: z.array(nonempty).optional(), budgetTHB: budget.optional(), budgetUnit: unit.optional(), count: z.number().int().positive().max(50).optional() }).strict(),
  create_project: z.object({ ownerId: nonempty, title: nonempty, description: nonempty, skills: z.array(nonempty), budgetTHB: budget.optional() }).strict(),
  request_introduction: z.object({ projectId: nonempty, memberId: nonempty }).strict(),
  get_member_profile: z.object({ memberId: nonempty }).strict(),
} as const;

export type ToolName = keyof typeof toolSchemas;
