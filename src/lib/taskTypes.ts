export interface Client {
  id: string;
  name: string;
  isActive: boolean;
  ownerId?: string;
}

export interface Role {
  id: string;
  clientId: string;
  title: string;
  isActive: boolean;
  assignedRecruiters: string[];
  createdAt: string;
  status: 'open' | 'filled' | 'on_hold' | 'cancelled';
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  appliesTo: 'client' | 'role' | 'client_role';
  clientId?: string;
  roleId?: string;
  isActive: boolean;
}

export interface ChecklistTaskTemplate {
  id: string;
  templateId: string;
  title: string;
  description: string;
  category: string;
  isRequired: boolean;
  sortOrder: number;
  evidenceRequired?: boolean;
}

export interface ChecklistTaskInstance {
  id: string;
  clientId: string;
  roleId: string;
  recruiterId: string;
  templateTaskId: string;
  title: string;
  description: string;
  isRequired: boolean;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  notes?: string;
  evidenceUrl?: string;
  completedBy?: string;
  completedAt?: string;
  dueDate?: string;
}

export interface KPIBlockedStatus {
  isBlocked: boolean;
  unresolvedCount: number;
  pendingTasks: Array<{
    clientName: string;
    roleTitle: string;
    taskTitle: string;
  }>;
}
