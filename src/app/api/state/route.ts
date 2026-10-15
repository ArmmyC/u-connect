import { getDemoStore } from '@/lib/server/store';
import { jsonResponse, responseForError } from '@/lib/server/http';

export async function GET(request: Request) {
  try {
    const store = await getDemoStore();
    const actorId = new URL(request.url).searchParams.get('actorId') ?? undefined;
    return jsonResponse(await store.getSnapshot(actorId));
  } catch (error) {
    return responseForError(error);
  }
}
