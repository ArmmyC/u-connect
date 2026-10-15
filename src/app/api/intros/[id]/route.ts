import type { IntroductionAction } from '@/lib/server/store';
import { getDemoStore } from '@/lib/server/store';
import { apiError, isRecord, jsonResponse, readJsonBody, responseForError } from '@/lib/server/http';

interface RouteContext { params: Promise<{ id: string }>; }
const actions = new Set<IntroductionAction>(['accept', 'decline', 'confirm', 'share_contact']);

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) return apiError('INVALID_INPUT', 'An introduction ID is required.', 400);
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value) || typeof body.value.actorId !== 'string' || !actions.has(body.value.action as IntroductionAction)) {
    return apiError('INVALID_INPUT', 'actorId and a supported introduction action are required.', 400);
  }
  try {
    const store = await getDemoStore();
    const introduction = await store.transitionIntroduction({
      introductionId: id, actorId: body.value.actorId, action: body.value.action as IntroductionAction,
    });
    return jsonResponse({ ok: true, introduction });
  } catch (error) {
    return responseForError(error);
  }
}
