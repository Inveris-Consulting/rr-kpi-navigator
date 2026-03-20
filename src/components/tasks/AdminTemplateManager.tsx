import { useState, useEffect } from 'react';
import { ChecklistTemplate } from '@/lib/taskTypes';
import { taskService } from '@/lib/taskService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronRight, Plus, Copy, Trash2, Edit } from 'lucide-react';

export function AdminTemplateManager() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);

  useEffect(() => {
    taskService.getTemplates().then(setTemplates);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Checklist Templates</h2>
          <p className="text-muted-foreground text-sm">Manage standard, required tasks for clients and roles.</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map(t => (
          <Card key={t.id} className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{t.name}</CardTitle>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <CardDescription>Applies to: <span className="capitalize">{t.appliesTo.replace('_', ' ')}</span></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mt-2 pt-4 border-t text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Copy className="h-3 w-3" /> 4 Tasks</span>
                <span className="flex items-center text-primary group-hover:underline">Edit Tasks <ChevronRight className="h-4 w-4 ml-1" /></span>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-12 bg-muted/20 rounded-lg border border-dashed">
            <h3 className="text-lg font-medium text-foreground">No Templates Found</h3>
            <p className="text-muted-foreground mt-1">Create your first checklist template to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
