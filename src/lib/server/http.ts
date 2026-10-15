import { StoreError } from './store';

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export function apiError(code: string, message: string, status: number): Response {
  return jsonResponse({ ok: false, error: { code, message } }, status);
}

export async function readJsonBody(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  try {
    const text = await request.text();
    return { ok: true, value: text.trim() ? JSON.parse(text) as unknown : {} };
  } catch {
    return { ok: false, response: apiError('INVALID_JSON', 'Request body must contain valid JSON.', 400) };
  }
}

export function responseForError(error: unknown): Response {
  if (error instanceof StoreError) return apiError(error.code, error.message, error.status);
  return apiError('INTERNAL_ERROR', 'The local demo service could not complete the request.', 500);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toolErrorStatus(code: string): number {
  switch (code) {
    case 'UNKNOWN_TOOL':
    case 'NOT_FOUND': return 404;
    case 'INVALID_INPUT': return 400;
    case 'SERVICE_UNAVAILABLE': return 503;
    case 'INVALID_SERVICE_RESULT':
    case 'SERVICE_ERROR': return 500;
    default: return 400;
  }
}
