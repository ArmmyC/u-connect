import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDemoStore } from '@/lib/server/store';

const temporaryPaths: string[] = [];

async function createTemporaryStore() {
  const directory = await mkdtemp(join(tmpdir(), 'u-connect-store-'));
  temporaryPaths.push(directory);
  return { directory, store: await createDemoStore(join(directory, 'state.json')) };
}

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('createDemoStore', () => {
  it('initializes a seed-backed state file with no private contacts', async () => {
    const { directory, store } = await createTemporaryStore();
    const snapshot = await store.getSnapshot();

    expect(snapshot.members).toHaveLength(18);
    expect(snapshot.opportunities).toHaveLength(12);
    expect(snapshot.projects).toEqual([]);
    expect(snapshot.introductions).toEqual([]);
    expect(snapshot.sharedContacts).toEqual({});
    expect(JSON.stringify(snapshot)).not.toMatch(/@u-connect\.example\.test/);
    expect(JSON.parse(await readFile(join(directory, 'state.json'), 'utf8'))).toMatchObject({ projects: [], introductions: [], interests: [] });
  });

  it('creates a project owned by a known member and a pending introduction', async () => {
    const { store } = await createTemporaryStore();
    const project = await store.createProject({
      ownerId: 'mem-ada', title: 'Accessible launch MVP', description: 'Build a demo MVP.', skills: ['React'], budgetTHB: 50000,
    });
    const introduction = await store.requestIntroduction({ projectId: project.id, memberId: 'mem-ben', requesterId: 'mem-ada' });

    expect(project).toMatchObject({ ownerId: 'mem-ada', title: 'Accessible launch MVP' });
    expect(introduction).toMatchObject({ projectId: project.id, memberId: 'mem-ben', status: 'pending' });
  });

  it('rejects a duplicate introduction for the same project and candidate', async () => {
    const { store } = await createTemporaryStore();
    const project = await store.createProject({ ownerId: 'mem-ada', title: 'Demo', description: 'Demo project.', skills: [] });
    await store.requestIntroduction({ projectId: project.id, memberId: 'mem-ben', requesterId: 'mem-ada' });

    await expect(store.requestIntroduction({ projectId: project.id, memberId: 'mem-ben', requesterId: 'mem-ada' }))
      .rejects.toMatchObject({ code: 'DUPLICATE_INTRO' });
  });

  it('enforces candidate and owner actors through accept, confirm, and contact share', async () => {
    const { store } = await createTemporaryStore();
    const project = await store.createProject({ ownerId: 'mem-ada', title: 'Demo', description: 'Demo project.', skills: [] });
    const introduction = await store.requestIntroduction({ projectId: project.id, memberId: 'mem-ben', requesterId: 'mem-ada' });

    await expect(store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ada', action: 'accept' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ben', action: 'confirm' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ada', action: 'confirm' }))
      .rejects.toMatchObject({ code: 'INVALID_TRANSITION' });

    await store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ben', action: 'accept' });
    const acceptedSnapshot = await store.getSnapshot();
    expect(acceptedSnapshot.introductions[0].status).toBe('accepted');
    expect(acceptedSnapshot.sharedContacts).toEqual({});

    await store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ada', action: 'confirm' });
    await expect(store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ben', action: 'share_contact' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    await store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ada', action: 'share_contact' });
    const sharedSnapshot = await store.getSnapshot();

    expect(sharedSnapshot.introductions[0].status).toBe('shared');
    expect(sharedSnapshot.sharedContacts['mem-ben']).toMatchObject({ email: 'mem-ben@u-connect.example.test' });
  });

  it('records unique interest and preserves state across reloads', async () => {
    const { directory, store } = await createTemporaryStore();
    const first = await store.recordInterest({ opportunityId: 'opp-marketplace', memberId: 'mem-ben' });
    const duplicate = await store.recordInterest({ opportunityId: 'opp-marketplace', memberId: 'mem-ben' });
    await store.createProject({ ownerId: 'mem-ada', title: 'Persisted project', description: 'Survives a reload.', skills: [] });

    const reloaded = await createDemoStore(join(directory, 'state.json'));
    const snapshot = await reloaded.getSnapshot();

    expect(duplicate).toEqual(first);
    expect(snapshot.interests).toHaveLength(1);
    expect(snapshot.interests[0]).toEqual(first);
    expect(snapshot.projects.map(({ title }) => title)).toContain('Persisted project');
  });

  it('rejects a non-owner request creator and resets to seed state', async () => {
    const { store } = await createTemporaryStore();
    const project = await store.createProject({ ownerId: 'mem-ada', title: 'Demo', description: 'Demo project.', skills: [] });
    await expect(store.requestIntroduction({ projectId: project.id, memberId: 'mem-ben', requesterId: 'mem-chai' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });

    await store.recordInterest({ opportunityId: 'opp-marketplace', memberId: 'mem-ben' });
    const resetSnapshot = await store.reset();

    expect(resetSnapshot.projects).toEqual([]);
    expect(resetSnapshot.introductions).toEqual([]);
    expect(resetSnapshot.interests).toEqual([]);
    expect(resetSnapshot.members).toHaveLength(18);
  });

  it('allows the requested candidate to decline and blocks owner confirmation afterward', async () => {
    const { store } = await createTemporaryStore();
    const project = await store.createProject({ ownerId: 'mem-ada', title: 'Demo', description: 'Demo project.', skills: [] });
    const introduction = await store.requestIntroduction({ projectId: project.id, memberId: 'mem-ben', requesterId: 'mem-ada' });

    const declined = await store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ben', action: 'decline' });
    expect(declined.status).toBe('declined');
    await expect(store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ada', action: 'confirm' }))
      .rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});
