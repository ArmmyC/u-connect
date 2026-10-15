import { getDemoStore } from '@/lib/server/store';
import { apiError, isRecord, jsonResponse, readJsonBody, responseForError } from '@/lib/server/http';

interface RouteContext { params: Promise<{ id: string }>; }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) return apiError('INVALID_INPUT', 'An opportunity ID is required.', 400);
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value) || typeof body.value.actorId !== 'string' || !body.value.actorId.trim()) {
    return apiError('INVALID_INPUT', 'actorId is required to record interest.', 400);
  }
  try {
    const store = await getDemoStore();
    const interest = await store.recordInterest({ opportunityId: id, memberId: body.value.actorId });
    return jsonResponse({ ok: true, interest });
  } catch (error) {
    return responseForError(error);
  }
}
