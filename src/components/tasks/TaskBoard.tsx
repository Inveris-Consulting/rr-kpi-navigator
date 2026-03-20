import { useState } from 'react';
import { Client, Role, ChecklistTaskInstance } from '@/lib/taskTypes';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Briefcase } from 'lucide-react';
import { TaskRow } from './TaskRow';

interface TaskBoardProps {
  clients: Client[];
  roles: Role[];
  tasks: ChecklistTaskInstance[];
  onStatusChange: (id: string, status: ChecklistTaskInstance['status'], notes?: string) => Promise<void>;
  isLoading?: boolean;
}

export function TaskBoard({ clients, roles, tasks, onStatusChange, isLoading }: TaskBoardProps) {
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  const toggleClient = (id: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRole = (id: string) => {
    setExpandedRoles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
        <h3 className="text-lg font-medium text-foreground">No Active Clients</h3>
        <p className="text-muted-foreground mt-1">You do not have any active clients assigned at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {clients.map(client => {
        const clientRoles = roles.filter(r => r.clientId === client.id);
        const clientTasks = tasks.filter(t => t.clientId === client.id);
        const isClientExpanded = expandedClients.has(client.id);
        
        const reqTasks = clientTasks.filter(t => t.isRequired);
        const progress = reqTasks.length > 0 
          ? Math.round((reqTasks.filter(t => t.status === 'completed').length / reqTasks.length) * 100)
          : 0;

        return (
          <Card key={client.id} className="overflow-hidden border-border transition-colors hover:border-border/80">
            <div 
              className="px-6 py-4 flex items-center justify-between cursor-pointer bg-card hover:bg-muted/10 transition-colors"
              onClick={() => toggleClient(client.id)}
            >
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">
                  {isClientExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{client.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {clientRoles.length} Roles
                    </span>
                    <span>•</span>
                    <span>{reqTasks.filter(t => t.status !== 'completed').length} Pending Tasks</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 hidden sm:flex">
                <div className="w-32">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progress</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {isClientExpanded && (
              <CardContent className="pt-0 pb-4 px-6 bg-muted/5 border-t border-border">
                {clientRoles.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground text-sm">No roles found for this client.</p>
                ) : (
                  <div className="space-y-3 mt-4">
                    {clientRoles.map(role => {
                      const roleTasks = clientTasks.filter(t => t.roleId === role.id);
                      const isRoleExpanded = expandedRoles.has(role.id);
                      const roleReqTasks = roleTasks.filter(t => t.isRequired);
                      const roleProgress = roleReqTasks.length > 0 
                        ? Math.round((roleReqTasks.filter(t => t.status === 'completed').length / roleReqTasks.length) * 100)
                        : 0;

                      return (
                        <div key={role.id} className="border rounded-lg bg-card overflow-hidden">
                          <div 
                            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => toggleRole(role.id)}
                          >
                            <div className="flex items-center gap-2">
                              {isRoleExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              <div>
                                <h4 className="font-medium text-foreground">{role.title}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {roleTasks.filter(t => t.status === 'completed').length} / {roleTasks.length} total tasks completed
                                </p>
                              </div>
                            </div>
                            <div className="font-medium text-sm text-muted-foreground">
                              {roleProgress}%
                            </div>
                          </div>
                          
                          {isRoleExpanded && (
                            <div className="p-4 bg-background border-t space-y-3">
                              {roleTasks.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground">No tasks assigned.</p>
                              ) : (
                                <>
                                  <div className="grid gap-3">
                                    {roleTasks.map(task => (
                                      <TaskRow 
                                        key={task.id} 
                                        task={task} 
                                        onStatusChange={onStatusChange}
                                        isLoading={isLoading} 
                                      />
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
