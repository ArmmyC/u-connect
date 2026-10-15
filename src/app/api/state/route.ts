import { getDemoStore } from '@/lib/server/store';
import { jsonResponse, responseForError } from '@/lib/server/http';

export async function GET() {
  try {
    const store = await getDemoStore();
    return jsonResponse(await store.getSnapshot());
  } catch (error) {
    return responseForError(error);
  }
}
