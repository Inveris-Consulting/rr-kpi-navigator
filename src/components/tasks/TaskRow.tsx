import { useState } from 'react';
import { ChecklistTaskInstance } from '@/lib/taskTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Check, X } from 'lucide-react';

interface TaskRowProps {
  task: ChecklistTaskInstance;
  onStatusChange: (id: string, status: ChecklistTaskInstance['status'], notes?: string) => Promise<void>;
  isLoading?: boolean;
}

export function TaskRow({ task, onStatusChange, isLoading }: TaskRowProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(task.notes || '');

  const handleToggle = async () => {
    const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
    await onStatusChange(task.id, newStatus);
  };

  const handleSaveNotes = async () => {
    await onStatusChange(task.id, task.status, notes);
    setIsEditingNotes(false);
  };

  const isCompleted = task.status === 'completed';

  return (
    <div className={`p-4 border rounded-lg transition-colors ${isCompleted ? 'bg-muted/30 border-muted' : 'bg-card border-border hover:border-primary/30'}`}>
      <div className="flex items-start gap-4">
        <div className="mt-1 flex-shrink-0">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-300 text-primary cursor-pointer focus:ring-primary disabled:opacity-50"
            checked={isCompleted}
            onChange={handleToggle}
            disabled={isLoading}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className={`font-medium ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {task.title}
            </h4>
            {task.isRequired ? (
              <span className="bg-red-100 text-red-800 text-[10px] uppercase px-2 py-0.5 rounded font-bold border border-red-200">Required</span>
            ) : (
              <span className="bg-gray-100 text-gray-800 text-[10px] uppercase px-2 py-0.5 rounded font-bold border border-gray-200">Optional</span>
            )}
            {isCompleted && task.completedAt && (
              <span className="text-xs text-muted-foreground ml-auto">
                Completed
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {task.description}
          </p>

          {!isEditingNotes ? (
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditingNotes(true)}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                {task.notes ? 'Edit Notes' : 'Add Notes'}
              </Button>
              {task.notes && (
                <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-md italic">
                  "{task.notes}"
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <Input 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Add notes..."
                className="h-8 text-sm max-w-sm"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveNotes()}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleSaveNotes} disabled={isLoading}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { setIsEditingNotes(false); setNotes(task.notes || ''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
