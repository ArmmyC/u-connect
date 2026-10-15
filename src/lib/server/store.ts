import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { members, opportunities } from '../seed';
import type { DemoState, Introduction, IntroductionStatus, Interest, Member, Opportunity, Project } from '../types';

export interface SharedContact { email: string; }
export type PublicDemoState = Omit<DemoState, 'members'> & {
  members: Member[];
  sharedContacts: Record<string, SharedContact>;
};

export interface CreateProjectInput {
  ownerId: string;
  title: string;
  description: string;
  skills: string[];
  budgetTHB?: number;
}
export interface RequestIntroductionInput { projectId: string; memberId: string; requesterId: string; }
export type IntroductionAction = 'accept' | 'decline' | 'confirm' | 'share_contact';
export interface TransitionIntroductionInput { introductionId: string; actorId: string; action: IntroductionAction; }
export interface RecordInterestInput { opportunityId: string; memberId: string; }

export class StoreError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
    this.name = 'StoreError';
  }
}

const privateContacts = new Map<string, SharedContact>(
  members.map((member) => [member.id, { email: `${member.id}@u-connect.example.test` }]),
);

function initialState(): DemoState {
  return structuredClone({ members, opportunities, projects: [], introductions: [], interests: [] });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDemoState(value: unknown): value is DemoState {
  return isRecord(value) && Array.isArray(value.members) && Array.isArray(value.opportunities) &&
    Array.isArray(value.projects) && Array.isArray(value.introductions) && Array.isArray(value.interests);
}

function clone<T>(value: T): T { return structuredClone(value); }

function storeError(code: string, message: string, status: number): StoreError {
  return new StoreError(code, message, status);
}

function publicMember(member: Member): Member {
  return {
    id: member.id, name: member.name, headline: member.headline, role: member.role, location: member.location,
    skills: [...member.skills], bio: member.bio, projects: [...member.projects],
    ...(member.portfolioUrl ? { portfolioUrl: member.portfolioUrl } : {}),
    ...(member.githubUrl ? { githubUrl: member.githubUrl } : {}),
    availability: member.availability, interests: [...member.interests], preferredWork: [...member.preferredWork],
    compensation: member.compensation, compensationUnit: member.compensationUnit,
    ...(member.compensationAmountTHB !== undefined ? { compensationAmountTHB: member.compensationAmountTHB } : {}),
    openToCollaborate: member.openToCollaborate, openToHire: member.openToHire,
  };
}

function publicOpportunity(opportunity: Opportunity): Opportunity {
  return {
    id: opportunity.id, ownerId: opportunity.ownerId, title: opportunity.title, type: opportunity.type,
    role: opportunity.role, description: opportunity.description, requiredSkills: [...opportunity.requiredSkills],
    compensation: opportunity.compensation,
    ...(opportunity.budgetTHB !== undefined ? { budgetTHB: opportunity.budgetTHB } : {}),
    ...(opportunity.budgetUnit ? { budgetUnit: opportunity.budgetUnit } : {}),
    deadline: opportunity.deadline, status: opportunity.status,
  };
}

function publicProject(project: Project): Project {
  return {
    id: project.id, ownerId: project.ownerId, title: project.title, description: project.description,
    skills: [...project.skills], ...(project.budgetTHB !== undefined ? { budgetTHB: project.budgetTHB } : {}),
  };
}

function publicIntroduction(introduction: Introduction): Introduction {
  return {
    id: introduction.id, projectId: introduction.projectId, memberId: introduction.memberId,
    status: introduction.status, createdAt: introduction.createdAt,
  };
}

function publicInterest(interest: Interest): Interest {
  return { opportunityId: interest.opportunityId, memberId: interest.memberId, createdAt: interest.createdAt };
}

function projectSnapshot(state: DemoState): PublicDemoState {
  const sharedContacts: Record<string, SharedContact> = {};
  for (const introduction of state.introductions) {
    if (introduction.status !== 'shared') continue;
    const contact = privateContacts.get(introduction.memberId);
    if (contact) sharedContacts[introduction.memberId] = { ...contact };
  }
  return {
    members: state.members.map(publicMember),
    opportunities: state.opportunities.map(publicOpportunity),
    projects: state.projects.map(publicProject),
    introductions: state.introductions.map(publicIntroduction),
    interests: state.interests.map(publicInterest),
    sharedContacts,
  };
}

function missingMember(state: DemoState, memberId: string): void {
  if (!state.members.some((member) => member.id === memberId)) throw storeError('NOT_FOUND', 'Member was not found.', 404);
}

function findProject(state: DemoState, projectId: string): Project {
  const project = state.projects.find((entry) => entry.id === projectId);
  if (!project) throw storeError('NOT_FOUND', 'Project was not found.', 404);
  return project;
}

function findIntroduction(state: DemoState, introductionId: string): Introduction {
  const introduction = state.introductions.find((entry) => entry.id === introductionId);
  if (!introduction) throw storeError('NOT_FOUND', 'Introduction was not found.', 404);
  return introduction;
}

async function writeAtomically(filePath: string, state: DemoState): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

async function loadState(filePath: string): Promise<DemoState> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    if (!isDemoState(parsed)) throw storeError('INVALID_STATE', 'The local demo state file has an invalid shape.', 500);
    return parsed;
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') {
      const seedState = initialState();
      await writeAtomically(filePath, seedState);
      return seedState;
    }
    throw error;
  }
}

export interface DemoStore {
  getSnapshot(): Promise<PublicDemoState>;
  createProject(input: CreateProjectInput): Promise<Project>;
  requestIntroduction(input: RequestIntroductionInput): Promise<Introduction>;
  transitionIntroduction(input: TransitionIntroductionInput): Promise<Introduction>;
  recordInterest(input: RecordInterestInput): Promise<Interest>;
  reset(): Promise<PublicDemoState>;
}

export async function createDemoStore(path: string): Promise<DemoStore> {
  const filePath = resolve(path);
  let state = await loadState(filePath);
  let writeQueue: Promise<void> = Promise.resolve();

  function transact<T>(mutate: (draft: DemoState) => T): Promise<T> {
    const operation = writeQueue.then(async () => {
      const draft = clone(state);
      const result = mutate(draft);
      await writeAtomically(filePath, draft);
      state = draft;
      return clone(result);
    });
    writeQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  return {
    async getSnapshot() {
      await writeQueue;
      return projectSnapshot(state);
    },

    createProject(input) {
      return transact((draft) => {
        missingMember(draft, input.ownerId);
        const project: Project = {
          id: `project-${randomUUID()}`, ownerId: input.ownerId, title: input.title.trim(),
          description: input.description.trim(), skills: [...input.skills],
          ...(input.budgetTHB !== undefined ? { budgetTHB: input.budgetTHB } : {}),
        };
        draft.projects.push(project);
        return project;
      });
    },

    requestIntroduction(input) {
      return transact((draft) => {
        const project = findProject(draft, input.projectId);
        if (project.ownerId !== input.requesterId) throw storeError('FORBIDDEN', 'Only the project owner can request an introduction.', 403);
        missingMember(draft, input.memberId);
        if (draft.introductions.some((entry) => entry.projectId === input.projectId && entry.memberId === input.memberId)) {
          throw storeError('DUPLICATE_INTRO', 'An introduction was already requested for this project and member.', 409);
        }
        const introduction: Introduction = {
          id: `intro-${randomUUID()}`, projectId: input.projectId, memberId: input.memberId,
          status: 'pending', createdAt: new Date().toISOString(),
        };
        draft.introductions.push(introduction);
        return introduction;
      });
    },

    transitionIntroduction(input) {
      return transact((draft) => {
        const introduction = findIntroduction(draft, input.introductionId);
        const project = findProject(draft, introduction.projectId);
        const isOwner = input.actorId === project.ownerId;
        const isCandidate = input.actorId === introduction.memberId;
        const requireStatus = (allowed: IntroductionStatus[], action: string) => {
          if (!allowed.includes(introduction.status)) throw storeError('INVALID_TRANSITION', `Cannot ${action} an introduction in ${introduction.status} status.`, 409);
        };

        switch (input.action) {
          case 'accept':
          case 'decline':
            if (!isCandidate) throw storeError('FORBIDDEN', 'Only the requested candidate can accept or decline.', 403);
            requireStatus(['pending'], input.action);
            introduction.status = input.action === 'accept' ? 'accepted' : 'declined';
            break;
          case 'confirm':
            if (!isOwner) throw storeError('FORBIDDEN', 'Only the project owner can confirm collaboration.', 403);
            requireStatus(['accepted'], 'confirm');
            introduction.status = 'confirmed';
            break;
          case 'share_contact':
            if (!isOwner) throw storeError('FORBIDDEN', 'Only the project owner can share contact details.', 403);
            requireStatus(['accepted', 'confirmed'], 'share contact details for');
            introduction.status = 'shared';
            break;
        }
        return introduction;
      });
    },

    recordInterest(input) {
      return transact((draft) => {
        const opportunity = draft.opportunities.find((entry) => entry.id === input.opportunityId);
        if (!opportunity) throw storeError('NOT_FOUND', 'Opportunity was not found.', 404);
        missingMember(draft, input.memberId);
        if (opportunity.ownerId === input.memberId) {
          throw storeError('FORBIDDEN', 'Opportunity owners cannot express interest in their own listing.', 403);
        }
        if (opportunity.status !== 'open') {
          throw storeError('OPPORTUNITY_NOT_OPEN', 'Interest can only be expressed in open opportunities.', 409);
        }
        const existing = draft.interests.find((entry) => entry.opportunityId === input.opportunityId && entry.memberId === input.memberId);
        if (existing) return existing;
        const interest: Interest = { opportunityId: input.opportunityId, memberId: input.memberId, createdAt: new Date().toISOString() };
        draft.interests.push(interest);
        return interest;
      });
    },

    reset() {
      return transact((draft) => {
        const restored = initialState();
        draft.members = restored.members;
        draft.opportunities = restored.opportunities;
        draft.projects = restored.projects;
        draft.introductions = restored.introductions;
        draft.interests = restored.interests;
        return projectSnapshot(draft);
      }).then(() => projectSnapshot(state));
    },
  };
}

const stores = new Map<string, Promise<DemoStore>>();

export function getDemoStore(path = process.env.U_CONNECT_DEMO_STATE_PATH ?? resolve(process.cwd(), 'data', 'demo-state.json')): Promise<DemoStore> {
  const filePath = resolve(path);
  const existing = stores.get(filePath);
  if (existing) return existing;
  const created = createDemoStore(filePath).catch((error: unknown) => {
    stores.delete(filePath);
    throw error;
  });
  stores.set(filePath, created);
  return created;
}
