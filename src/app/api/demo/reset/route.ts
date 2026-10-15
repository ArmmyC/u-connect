import { getDemoStore } from '@/lib/server/store';
import { jsonResponse, responseForError } from '@/lib/server/http';

export async function POST() {
  try {
    const store = await getDemoStore();
    return jsonResponse(await store.reset());
  } catch (error) {
    return responseForError(error);
  }
}
