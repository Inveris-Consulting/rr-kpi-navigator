import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { taskService } from '@/lib/taskService';
import { Client, Role, ChecklistTaskInstance } from '@/lib/taskTypes';
import { TaskSummaryCards } from '@/components/tasks/TaskSummaryCards';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { AdminTemplateManager } from '@/components/tasks/AdminTemplateManager';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RecruitingTaskManagement() {
  const { user, isAdmin } = useAuth();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tasks, setTasks] = useState<ChecklistTaskInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'admin'>('tasks');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetchedClients = await taskService.getClients();
      const fetchedRoles = await taskService.getRolesForUser(user.id);
      const fetchedTasks = await taskService.getTasksForUser(user.id);

      setClients(fetchedClients);
      setRoles(fetchedRoles);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Failed to load tasks', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: ChecklistTaskInstance['status'], notes?: string) => {
    setIsUpdating(true);
    try {
      await taskService.updateTaskStatus(id, status, notes);
      
      setTasks(prev => prev.map(t => 
        t.id === id 
        ? { ...t, status, notes: notes !== undefined ? notes : t.notes, completedAt: status === 'completed' ? new Date().toISOString() : undefined } 
        : t
      ));
      
      if (status === 'completed') toast.success('Task marked as completed');
    } catch (error) {
      toast.error('Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Recruiting Task Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Complete required recruiting tasks by client and role before submitting daily KPIs.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="w-full">
            <div className="flex border-b border-border mb-6">
              <button 
                className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'tasks' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('tasks')}
              >
                My Tasks
              </button>
              {isAdmin && (
                <button 
                  className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'admin' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveTab('admin')}
                >
                  Template Management
                </button>
              )}
            </div>
            
            {activeTab === 'tasks' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <TaskSummaryCards clients={clients} roles={roles} tasks={tasks} />
                
                <div className="flex items-center justify-between mt-8 mb-4">
                  <h2 className="text-xl font-semibold">Active Client Roles</h2>
                </div>
                
                <TaskBoard 
                  clients={clients} 
                  roles={roles} 
                  tasks={tasks} 
                  onStatusChange={handleStatusChange}
                  isLoading={isUpdating}
                />
              </div>
            )}
            
            {activeTab === 'admin' && isAdmin && (
              <div className="animate-in fade-in slide-in-from-bottom-4">
                <AdminTemplateManager />
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
