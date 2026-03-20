import { supabase } from '@/lib/supabase';
import { Client, Role, ChecklistTemplate, ChecklistTaskTemplate, ChecklistTaskInstance, KPIBlockedStatus } from './taskTypes';

export const taskService = {
  // Fetch active clients
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    
    return data.map(c => ({
      id: c.id,
      name: c.name,
      isActive: c.is_active
    }));
  },

  // Fetch roles
  async getRolesForUser(userId: string): Promise<Role[]> {
    const { data, error } = await supabase
      .from('check_roles')
      .select('*')
      .order('title');
      
    if (error) throw error;
    
    return data.map(r => ({
      id: r.id,
      clientId: r.client_id,
      title: r.title,
      status: r.status as 'open' | 'closed' | 'on_hold'
    }));
  },

  // Fetch tasks
  async getTasksForUser(userId: string): Promise<ChecklistTaskInstance[]> {
    const { data, error } = await supabase
      .from('checklist_task_instances')
      .select('*, check_roles(title), clients(name)')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data.map(t => ({
      id: t.id,
      taskTemplateId: t.template_task_id,
      clientId: t.client_id,
      roleId: t.role_id,
      userId: t.user_id,
      title: t.title,
      description: t.description,
      isRequired: t.is_required,
      status: t.status as 'not_started' | 'completed' | 'blocked',
      completedAt: t.completed_at,
      notes: t.notes,
      
      clientName: t.clients?.name,
      roleTitle: t.check_roles?.title
    }));
  },

  // Update task status
  async updateTaskStatus(id: string, status: ChecklistTaskInstance['status'], notes?: string): Promise<void> {
    const updates: any = { status };
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }
    if (notes !== undefined) {
      updates.notes = notes;
    }

    const { error } = await supabase
      .from('checklist_task_instances')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  // Check KPI Blocking
  async checkKPIBlockedStatus(userId: string): Promise<KPIBlockedStatus> {
    try {
      const { data, error } = await supabase
        .from('checklist_task_instances')
        .select('*, check_roles(title), clients(name)')
        .eq('is_required', true)
        .neq('status', 'completed');
        
      if (error) throw error;
      
      const pendingCount = data ? data.length : 0;
      
      if (pendingCount === 0) {
        return { isBlocked: false, unresolvedCount: 0, pendingTasks: [] };
      }
      
      const pendingTasks = data.map(t => ({
        clientName: t.clients?.name || 'Unknown Client',
        roleTitle: t.check_roles?.title || 'Unknown Role',
        taskTitle: t.title
      }));
      
      return {
        isBlocked: true,
        unresolvedCount: pendingCount,
        pendingTasks
      };
    } catch (e) {
      console.error("Error checking blocked status", e);
      return { isBlocked: false, unresolvedCount: 0, pendingTasks: [] };
    }
  },

  async getTemplates(): Promise<ChecklistTemplate[]> {
    const { data, error } = await supabase
      .from('checklist_templates')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    return data.map(t => ({
      id: t.id,
      name: t.name,
      appliesTo: t.applies_to as 'client' | 'role'
    }));
  }
};
