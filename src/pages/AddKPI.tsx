import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon, Save, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface KPIFormData {
  date: Date;
  callsMade: string;
  meetingsSet: string;
  meetingsCompleted: string;
  closes: string;
  openRequisitions: string;
  vipList: string;
}

const AddKPI = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<KPIFormData>({
    date: new Date(),
    callsMade: '0',
    meetingsSet: '0',
    meetingsCompleted: '0',
    closes: '0',
    openRequisitions: '0',
    vipList: '0',
  });

  const handleInputChange = (field: keyof KPIFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleReset = () => {
    setFormData({
      date: new Date(),
      callsMade: '0',
      meetingsSet: '0',
      meetingsCompleted: '0',
      closes: '0',
      openRequisitions: '0',
      vipList: '0',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      // Prepare data for Supabase
      const payload = {
        user_id: user.id,
        date: format(formData.date, 'yyyy-MM-dd'),
        calls_made: parseInt(formData.callsMade) || 0,
        meetings_set: parseInt(formData.meetingsSet) || 0,
        meetings_completed: parseInt(formData.meetingsCompleted) || 0,
        closes: parseInt(formData.closes) || 0,
        open_requisitions: parseInt(formData.openRequisitions) || 0,
        vip_list: parseInt(formData.vipList) || 0,
      };

      const { error } = await supabase
        .from('kpi_entries')
        .insert(payload);

      if (error) throw error;

      toast.success('KPI Entry Saved!');
      navigate('/');
    } catch (error: any) {
      console.error('Error saving KPI:', error);
      toast.error('Failed to save entry', {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputFields = [
    { id: 'callsMade', label: 'Calls Made', placeholder: 'e.g., 25' },
    { id: 'meetingsSet', label: 'Meetings Set', placeholder: 'e.g., 5' },
    { id: 'meetingsCompleted', label: 'Meetings Completed', placeholder: 'e.g., 3' },
    { id: 'closes', label: 'Closes', placeholder: 'e.g., 1' },
    { id: 'openRequisitions', label: 'Open Requisitions', placeholder: 'e.g., 10' },
    { id: 'vipList', label: 'Vip List', placeholder: 'e.g., 2' },
  ];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Add Daily KPI Entry
          </h1>
          <p className="text-muted-foreground">
            Record your daily performance metrics
          </p>
        </div>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>KPI Entry for {user?.name}</CardTitle>
            <CardDescription>
              Fill in your metrics for the selected date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-12",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                      initialFocus
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Numeric Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inputFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <Input
                      id={field.id}
                      type="number"
                      min="0"
                      placeholder={field.placeholder}
                      value={formData[field.id as keyof KPIFormData] as string}
                      onChange={handleInputChange(field.id as keyof KPIFormData)}
                      className="h-12"
                      required
                    />
                  </div>
                ))}
              </div>

              {/* Calculated Preview */}
              {formData.closes && formData.openRequisitions && (
                <div className="p-4 rounded-xl bg-secondary/50 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Calculated Values</p>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Req. Close Rate</p>
                      <p className="text-lg font-bold text-primary">
                        {((parseInt(formData.closes) / parseInt(formData.openRequisitions || '1')) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleReset}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gradient-primary"
                  disabled={isSubmitting}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AddKPI;
