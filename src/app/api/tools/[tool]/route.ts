import { dispatchTool } from '@/lib/tools';
import { getDemoStore } from '@/lib/server/store';
import { apiError, isRecord, jsonResponse, readJsonBody, responseForError, toolErrorStatus } from '@/lib/server/http';

interface RouteContext { params: Promise<{ tool: string }>; }

export async function POST(request: Request, context: RouteContext) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const { tool } = await context.params;
  const value = body.value;
  if (!isRecord(value)) return apiError('INVALID_INPUT', 'Request body must be a JSON object.', 400);

  const actorId = typeof value.actorId === 'string' ? value.actorId : undefined;
  const input = isRecord(value.input)
    ? value.input
    : Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'actorId'));

  try {
    const store = await getDemoStore();
    if (tool === 'create_project') {
      if (!actorId) return apiError('INVALID_INPUT', 'actorId is required to create a project.', 400);
      if (isRecord(input) && typeof input.ownerId === 'string' && input.ownerId !== actorId) {
        return apiError('FORBIDDEN', 'Only the acting member can own a created project.', 403);
      }
      if (isRecord(input) && typeof input.ownerId === 'string') {
        const snapshot = await store.getSnapshot();
        if (!snapshot.members.some((member) => member.id === input.ownerId)) return apiError('NOT_FOUND', 'Member was not found.', 404);
      }
      const result = await dispatchTool(tool, input, { createProject: (projectInput) => store.createProject(projectInput) });
      if (!result.ok) return jsonResponse(result, toolErrorStatus(result.error.code));
      return jsonResponse(result);
    }

    if (tool === 'request_introduction') {
      if (!actorId) return apiError('INVALID_INPUT', 'actorId is required to request an introduction.', 400);
      if (isRecord(input) && typeof input.projectId === 'string') {
        const snapshot = await store.getSnapshot();
        const project = snapshot.projects.find((entry) => entry.id === input.projectId);
        if (!project) return apiError('NOT_FOUND', 'Project was not found.', 404);
        if (project.ownerId !== actorId) return apiError('FORBIDDEN', 'Only the project owner can request an introduction.', 403);
        if (typeof input.memberId === 'string' && !snapshot.members.some((member) => member.id === input.memberId)) {
          return apiError('NOT_FOUND', 'Member was not found.', 404);
        }
        if (typeof input.memberId === 'string' && snapshot.introductions.some((entry) => entry.projectId === project.id && entry.memberId === input.memberId)) {
          return apiError('DUPLICATE_INTRO', 'An introduction was already requested for this project and member.', 409);
        }
      }
      const result = await dispatchTool(tool, input, {
        requestIntroduction: (introInput) => store.requestIntroduction({ ...introInput, requesterId: actorId }),
      });
      if (!result.ok) return jsonResponse(result, toolErrorStatus(result.error.code));
      return jsonResponse(result);
    }

    const result = await dispatchTool(tool, input);
    if (!result.ok) return jsonResponse(result, toolErrorStatus(result.error.code));
    return jsonResponse(result);
  } catch (error) {
    return responseForError(error);
  }
}
