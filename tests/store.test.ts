import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDemoStore } from '@/lib/server/store';
import { members, opportunities } from '@/lib/seed';
import type { OpportunityStatus } from '@/lib/types';

const temporaryPaths: string[] = [];

async function createTemporaryStore(opportunityStatus?: OpportunityStatus) {
  const directory = await mkdtemp(join(tmpdir(), 'u-connect-store-'));
  temporaryPaths.push(directory);
  const statePath = join(directory, 'state.json');
  if (opportunityStatus) {
    const state = {
      members,
      opportunities: opportunities.map((opportunity) => opportunity.id === 'opp-marketplace'
        ? { ...opportunity, status: opportunityStatus }
        : opportunity),
      projects: [],
      introductions: [],
      interests: [],
    };
    await writeFile(statePath, JSON.stringify(state), 'utf8');
  }
  return { directory, store: await createDemoStore(statePath) };
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
    await expect(store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ada', action: 'share_contact' }))
      .rejects.toMatchObject({ code: 'INVALID_TRANSITION', status: 409 });
    expect((await store.getSnapshot()).sharedContacts).toEqual({});

    await store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ada', action: 'confirm' });
    await expect(store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ben', action: 'share_contact' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    await store.transitionIntroduction({ introductionId: introduction.id, actorId: 'mem-ada', action: 'share_contact' });
    const sharedSnapshot = await store.getSnapshot();

    expect(sharedSnapshot.introductions[0].status).toBe('shared');
    expect(sharedSnapshot.sharedContacts).toEqual({});
    expect((await store.getSnapshot('mem-ada')).sharedContacts['mem-ben']).toMatchObject({ email: 'mem-ben@u-connect.example.test' });
    expect((await store.getSnapshot('mem-ben')).sharedContacts['mem-ben']).toMatchObject({ email: 'mem-ben@u-connect.example.test' });
    expect((await store.getSnapshot('mem-erin')).sharedContacts).toEqual({});
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

  it('rejects interest from an opportunity owner', async () => {
    const { store } = await createTemporaryStore();

    await expect(store.recordInterest({ opportunityId: 'opp-marketplace', memberId: 'mem-inn' }))
      .rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Opportunity owners cannot express interest in their own listing.',
        status: 403,
      });
  });

  it.each(['closed', 'in-progress'] as const)('rejects interest in a %s opportunity', async (status) => {
    const { store } = await createTemporaryStore(status);

    await expect(store.recordInterest({ opportunityId: 'opp-marketplace', memberId: 'mem-ben' }))
      .rejects.toMatchObject({
        code: 'OPPORTUNITY_NOT_OPEN',
        message: 'Interest can only be expressed in open opportunities.',
        status: 409,
      });
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
