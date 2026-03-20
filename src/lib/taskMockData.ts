import { Client, Role, ChecklistTemplate, ChecklistTaskTemplate, ChecklistTaskInstance } from './taskTypes';

export const mockClients: Client[] = [
  { id: 'c1', name: 'Acme Corp', isActive: true },
  { id: 'c2', name: 'Global Tech', isActive: true },
  { id: 'c3', name: 'Startup Inc', isActive: false },
];

export const mockRoles: Role[] = [
  { id: 'r1', clientId: 'c1', title: 'Senior Frontend Engineer', isActive: true, assignedRecruiters: ['1', '2'], createdAt: '2026-03-01T00:00:00Z', status: 'open' },
  { id: 'r2', clientId: 'c1', title: 'Product Manager', isActive: true, assignedRecruiters: ['1'], createdAt: '2026-03-05T00:00:00Z', status: 'open' },
  { id: 'r3', clientId: 'c2', title: 'DevOps Specialist', isActive: true, assignedRecruiters: ['2'], createdAt: '2026-03-10T00:00:00Z', status: 'open' },
];

export const mockTemplates: ChecklistTemplate[] = [
  { id: 't1', name: 'Standard Engineering Role Checklist', appliesTo: 'role', isActive: true },
];

export const mockTaskTemplates: ChecklistTaskTemplate[] = [
  { id: 'tt1', templateId: 't1', title: 'Review job requisition details', description: 'Read through the job description and align with hiring manager.', category: 'Preparation', isRequired: true, sortOrder: 1 },
  { id: 'tt2', templateId: 't1', title: 'Post role to required job boards', description: 'Publish to LinkedIn, Indeed, etc.', category: 'Sourcing', isRequired: true, sortOrder: 2 },
  { id: 'tt3', templateId: 't1', title: 'Confirm sourcing strategy', description: 'Outline where candidates will be sourced.', category: 'Sourcing', isRequired: true, sortOrder: 3 },
  { id: 'tt4', templateId: 't1', title: 'Document outreach activity', description: 'Log outbound messaging.', category: 'Execution', isRequired: false, sortOrder: 4 },
];

// Combine to create instances
export const initialMockInstances: ChecklistTaskInstance[] = [
  // User 1 (Amber), Role 1 (Acme - Sr Frontend) -> 2 tasks complete, 1 pending
  { id: 'i1', clientId: 'c1', roleId: 'r1', recruiterId: '1', templateTaskId: 'tt1', title: 'Review job requisition details', description: 'Read through the job description.', isRequired: true, status: 'completed', completedBy: '1', completedAt: '2026-03-15T10:00:00Z' },
  { id: 'i2', clientId: 'c1', roleId: 'r1', recruiterId: '1', templateTaskId: 'tt2', title: 'Post role to required job boards', description: 'Publish to LinkedIn.', isRequired: true, status: 'completed', completedBy: '1', completedAt: '2026-03-16T11:00:00Z' },
  { id: 'i3', clientId: 'c1', roleId: 'r1', recruiterId: '1', templateTaskId: 'tt3', title: 'Confirm sourcing strategy', description: 'Outline where candidates will be sourced.', isRequired: true, status: 'not_started' },
  
  // User 1 (Amber), Role 2 (Acme - Product Manager) -> 0 tasks complete (making her blocked)
  { id: 'i4', clientId: 'c1', roleId: 'r2', recruiterId: '1', templateTaskId: 'tt1', title: 'Review job requisition details', description: 'Read through the job description.', isRequired: true, status: 'not_started' },
  
  // User 2 (Janet), Role 1 (Acme - Sr Frontend) -> All tasks complete
  { id: 'i5', clientId: 'c1', roleId: 'r1', recruiterId: '2', templateTaskId: 'tt1', title: 'Review job requisition details', description: 'Read through the job description.', isRequired: true, status: 'completed' },
  { id: 'i6', clientId: 'c1', roleId: 'r1', recruiterId: '2', templateTaskId: 'tt2', title: 'Post role to required job boards', description: 'Publish to LinkedIn.', isRequired: true, status: 'completed' },
  { id: 'i7', clientId: 'c1', roleId: 'r1', recruiterId: '2', templateTaskId: 'tt3', title: 'Confirm sourcing strategy', description: 'Outline where candidates will be sourced.', isRequired: true, status: 'completed' },
];
