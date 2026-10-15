export type MemberRole = 'engineering' | 'design' | 'marketing' | 'founding' | 'recruiting' | 'business';
export type OpportunityType = 'project' | 'job' | 'freelance' | 'collaboration' | 'cofounder';
export type Availability = 'available' | 'part-time' | 'busy';
export type OpportunityStatus = 'open' | 'in-progress' | 'closed';
export type IntroductionStatus = 'pending' | 'accepted' | 'declined' | 'confirmed' | 'shared';

export interface MemberProfile {
  id: string;
  name: string;
  headline: string;
  role: MemberRole;
  location: string;
  skills: string[];
  bio: string;
  projects: string[];
  portfolioUrl?: string;
  githubUrl?: string;
  availability: Availability;
  interests: string[];
  preferredWork: string[];
  compensation: string;
  hourlyRateTHB?: number;
  openToCollaborate: boolean;
  openToHire: boolean;
}

export interface Member extends MemberProfile {}

export interface Opportunity {
  id: string;
  ownerId: string;
  title: string;
  type: OpportunityType;
  role: string;
  description: string;
  requiredSkills: string[];
  compensation: string;
  budgetTHB?: number;
  deadline: string;
  status: OpportunityStatus;
}

export interface Project { id: string; ownerId: string; title: string; description: string; skills: string[]; budgetTHB?: number; }
export interface Introduction { id: string; projectId: string; memberId: string; status: IntroductionStatus; createdAt: string; }
export interface Interest { opportunityId: string; memberId: string; createdAt: string; }
export interface DemoState { members: Member[]; opportunities: Opportunity[]; projects: Project[]; introductions: Introduction[]; interests: Interest[]; }
