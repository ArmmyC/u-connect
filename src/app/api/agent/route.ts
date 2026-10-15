import { runMockAgent } from '@/lib/agent';
import { apiError, isRecord, jsonResponse, readJsonBody } from '@/lib/server/http';

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isRecord(body.value) || typeof body.value.text !== 'string' || !body.value.text.trim()) {
    return apiError('INVALID_INPUT', 'A non-empty text field is required.', 400);
  }
  return jsonResponse(await runMockAgent(body.value.text));
}
