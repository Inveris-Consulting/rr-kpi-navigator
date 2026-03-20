import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { KPIBlockedStatus } from '@/lib/taskTypes';

interface KPIBlockWarningProps {
  status: KPIBlockedStatus;
}

export function KPIBlockWarning({ status }: KPIBlockWarningProps) {
  const navigate = useNavigate();

  if (!status.isBlocked) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-md shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-red-600 mt-1 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-red-900">
            KPI Submission Blocked
          </h3>
          <p className="text-red-800 mt-1 mb-4">
            You still have required recruiting tasks pending for today. Complete all mandatory checklist items before submitting your KPIs.
          </p>
          
          <div className="bg-white/60 rounded p-4 mb-4 border border-red-100">
            <h4 className="font-semibold text-red-900 mb-2">Pending Required Tasks ({status.unresolvedCount}):</h4>
            <ul className="space-y-2">
              {status.pendingTasks.map((task, idx) => (
                <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  <span>
                    <strong>{task.clientName}</strong> - {task.roleTitle}: <span className="italic">{task.taskTitle}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Button 
            onClick={() => navigate('/tasks')}
            className="bg-red-600 hover:bg-red-700 text-white shadow"
          >
            Go to Recruiting Task Management
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
