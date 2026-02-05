import { useState, useEffect } from 'react';
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

interface KPIDefinition {
  id: string;
  name: string;
  sector: string;
}

const AddKPI = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [availableKpis, setAvailableKpis] = useState<KPIDefinition[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoadingKpis, setIsLoadingKpis] = useState(true);
  const [isLoadingEntry, setIsLoadingEntry] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // Store existing entry IDs if we need to update rows individually
  const [existingEntries, setExistingEntries] = useState<Record<string, string>>({});

  // 1. Fetch user's allowed KPIs (or all if admin)
  useEffect(() => {
    const fetchKpis = async () => {
      if (!user) return;

      try {
        let kpis: KPIDefinition[] = [];

        if (isAdmin) {
          // Admin sees all KPIs
          const { data, error } = await supabase.from('kpis').select('*');
          if (error) throw error;
          kpis = (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            sector: item.sector
          }));
        } else {
          // Regular user sees assigned KPIs
          const { data, error } = await supabase
            .from('user_kpis')
            .select(`
                kpis (
                id,
                name,
                sector
                )
            `)
            .eq('user_id', user.id);

          if (error) throw error;

          // Transform the nested data
          kpis = (data || []).map((item: any) => ({
            id: item.kpis.id,
            name: item.kpis.name,
            sector: item.kpis.sector
          }));
        }

        const sortedKpis = kpis.sort((a, b) => {
          // Sort by sector then name
          if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
          return a.name.localeCompare(b.name);
        });

        setAvailableKpis(sortedKpis);
      } catch (error) {
        console.error('Error fetching KPIs:', error);
        toast.error('Failed to load KPIs configuration');
      } finally {
        setIsLoadingKpis(false);
      }
    };

    fetchKpis();
  }, [user, isAdmin]);

  // 2. Fetch existing entries when Date changes or User changes (for admin switching context?) 
  // currently admin mimics current signed-in user or needs to select user? 
  // Requirement says "adicionei valores... aparecer para edição". 
  // Assuming logged in user edits THEIR data.
  // If admin, they are editing THEIR data unless we add a user selector here too.
  // For now, assume it's for the currently authenticated context user.
  useEffect(() => {
    const fetchEntries = async () => {
      if (!user || !date) return;
      setIsLoadingEntry(true);
      try {
        const formattedDate = format(date, 'yyyy-MM-dd');
        const { data, error } = await supabase
          .from('kpi_entries')
          .select('id, kpi_id, value')
          .eq('user_id', user.id)
          .eq('date', formattedDate);

        if (error) throw error;

        const newFormData: Record<string, string> = {};
        const newExistingEntries: Record<string, string> = {};

        data?.forEach((entry: any) => {
          if (entry.kpi_id) {
            newFormData[entry.kpi_id] = entry.value.toString();
            newExistingEntries[entry.kpi_id] = entry.id;
          }
        });

        setFormData(newFormData);
        setExistingEntries(newExistingEntries);
      } catch (error) {
        console.error("Error fetching existing entries", error);
      } finally {
        setIsLoadingEntry(false);
      }
    };

    fetchEntries();
  }, [date, user]);

  const handleInputChange = (kpiId: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [kpiId]: e.target.value,
    }));
  };

  const handleReset = () => {
    // Resetting only form data, not date? Or reset everything?
    // "Reset" button usually clears the form.
    setFormData({});
    setExistingEntries({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const formattedDate = format(date, 'yyyy-MM-dd');

      const promises = availableKpis.map(async (kpi) => {
        const valueStr = formData[kpi.id];
        if (valueStr !== undefined && valueStr.trim() !== '') {
          const val = parseFloat(valueStr);
          const existingId = existingEntries[kpi.id];

          if (existingId) {
            // Update existing
            const { error } = await supabase
              .from('kpi_entries')
              .update({ value: val, sector: kpi.sector })
              .eq('id', existingId);
            if (error) throw error;
          } else {
            // Insert new
            const { error } = await supabase
              .from('kpi_entries')
              .insert({
                user_id: user.id,
                date: formattedDate,
                kpi_id: kpi.id,
                sector: kpi.sector,
                value: val
              });
            if (error) throw error;
          }
        }
      });

      await Promise.all(promises);

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

  // Group KPIs by sector
  const kpisBySector = availableKpis.reduce((acc, kpi) => {
    if (!acc[kpi.sector]) {
      acc[kpi.sector] = [];
    }
    acc[kpi.sector].push(kpi);
    return acc;
  }, {} as Record<string, KPIDefinition[]>);

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

        <Card className="animate-fade-in relative">
          {/* Loading Overlay */}
          {isLoadingEntry && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          <CardHeader>
            <CardTitle>KPI Entry for {user?.name}</CardTitle>
            <CardDescription>
              Fill in your metrics for the selected date. All fields are optional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingKpis ? (
              <div className="py-8 text-center text-muted-foreground">Loading allowed KPIs...</div>
            ) : availableKpis.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No KPIs configured for this user. Please contact an admin.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-12",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => {
                          if (d) {
                            setDate(d);
                            setIsCalendarOpen(false);
                          }
                        }}
                        initialFocus
                        disabled={(d) => d > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Dynamic Inputs Grouped by Sector */}
                {Object.entries(kpisBySector).map(([sector, kpis]) => (
                  <div key={sector} className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary/80 border-b pb-1">{sector}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {kpis.map((kpi) => (
                        <div key={kpi.id} className="space-y-2">
                          <Label htmlFor={kpi.id}>{kpi.name}</Label>
                          <Input
                            id={kpi.id}
                            type="number"
                            min="0"
                            placeholder="..."
                            value={formData[kpi.id] || ''}
                            onChange={handleInputChange(kpi.id)}
                            className="h-12"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

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
                    disabled={isSubmitting || isLoadingEntry}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Saving...' : 'Save Entry'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AddKPI;
