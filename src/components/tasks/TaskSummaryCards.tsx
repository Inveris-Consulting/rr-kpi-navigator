import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Briefcase, CheckCircle, AlertTriangle } from 'lucide-react';
import { Client, Role, ChecklistTaskInstance } from '@/lib/taskTypes';

interface TaskSummaryCardsProps {
  clients: Client[];
  roles: Role[];
  tasks: ChecklistTaskInstance[];
}

export function TaskSummaryCards({ clients, roles, tasks }: TaskSummaryCardsProps) {
  const activeClients = clients.filter(c => c.isActive).length;
  const activeRoles = roles.filter(r => r.status === 'open').length;
  
  const requiredTasks = tasks.filter(t => t.isRequired);
  const completedRequired = requiredTasks.filter(t => t.status === 'completed').length;
  const totalRequired = requiredTasks.length;
  
  const progressPercent = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
  const overdueOrBlocked = tasks.filter(t => t.status === 'blocked').length;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeClients}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Roles</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeRoles}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Task Progress</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{progressPercent}%</div>
          <p className="text-xs text-muted-foreground">
            {completedRequired} of {totalRequired} required
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Blocked/On Hold</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overdueOrBlocked}</div>
        </CardContent>
      </Card>
    </div>
  );
}
