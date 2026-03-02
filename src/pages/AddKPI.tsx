import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useClients } from '@/hooks/useOperationalCosts';

interface KPIDefinition {
  id: string;
  name: string;
  sector: string;
  is_client_specific: boolean;
}

const AddKPI = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: clients, isLoading: isLoadingClients } = useClients();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [context, setContext] = useState<string>('general');
  const [allAllowedKpis, setAllAllowedKpis] = useState<KPIDefinition[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoadingKpis, setIsLoadingKpis] = useState(true);
  const [isLoadingEntry, setIsLoadingEntry] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [existingEntries, setExistingEntries] = useState<Record<string, string>>({});
  const [submittedClientIds, setSubmittedClientIds] = useState<string[]>([]);

  const activeClients = useMemo(() => clients?.filter(c => c.is_active) || [], [clients]);

  // Helper: map sector name to client flag
  const clientMatchesSector = (client: typeof activeClients[0], sector: string) => {
    const s = sector.toLowerCase();
    if (s === 'placement') return client.is_placement;
    if (s === 'prospecting') return client.is_prospecting;
    if (s === 'rar') return client.is_rar;
    return false;
  };

  // Fetch user's allowed KPIs
  useEffect(() => {
    const fetchKpis = async () => {
      if (!user) return;
      setIsLoadingKpis(true);
      try {
        let kpis: KPIDefinition[] = [];

        if (isAdmin) {
          const { data, error } = await supabase.from('kpis').select('id, name, sector, is_client_specific');
          if (error) throw error;
          kpis = data || [];
        } else {
          const { data, error } = await supabase
            .from('user_kpis')
            .select(`kpis ( id, name, sector, is_client_specific )`)
            .eq('user_id', user.id);

          if (error) throw error;
          kpis = (data || []).map((item: any) => item.kpis);
        }

        const sortedKpis = kpis.sort((a, b) => {
          if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
          return a.name.localeCompare(b.name);
        });

        setAllAllowedKpis(sortedKpis);
      } catch (error) {
        console.error('Error fetching KPIs:', error);
        toast.error('Failed to load KPIs configuration');
      } finally {
        setIsLoadingKpis(false);
      }
    };
    fetchKpis();
  }, [user, isAdmin]);

  // Fetch existing entries and detect pending clients
  useEffect(() => {
    const fetchContextData = async () => {
      if (!user || !date) return;
      setIsLoadingEntry(true);
      try {
        const formattedDate = format(date, 'yyyy-MM-dd');

        // Fetch ALL entries for this user on this date to know which clients were submitted
        const { data: allDataToday, error: allDataError } = await supabase
          .from('kpi_entries')
          .select('id, kpi_id, value, client_id')
          .eq('user_id', user.id)
          .eq('date', formattedDate);

        if (allDataError) throw allDataError;

        // Determine tested clients
        const submittedContexts = Array.from(new Set(allDataToday?.map(e => e.client_id).filter(Boolean)));
        setSubmittedClientIds(submittedContexts as string[]);

        // Filter data for current context to populate form
        const currentData = allDataToday?.filter(e =>
          context === 'general' ? e.client_id === null : e.client_id === context
        );

        const newFormData: Record<string, string> = {};
        const newExistingEntries: Record<string, string> = {};

        currentData?.forEach((entry: any) => {
          if (entry.kpi_id) {
            newFormData[entry.kpi_id] = entry.value.toString();
            newExistingEntries[entry.kpi_id] = entry.id;
          }
        });

        setFormData(newFormData);
        setExistingEntries(newExistingEntries);
      } catch (error) {
        console.error("Error fetching context data", error);
      } finally {
        setIsLoadingEntry(false);
      }
    };

    fetchContextData();
  }, [date, user, context]);

  // Get the selected client object when a specific client is chosen
  const selectedClient = useMemo(() => {
    if (context === 'general') return null;
    return activeClients.find(c => c.id === context) || null;
  }, [context, activeClients]);

  const visibleKpis = useMemo(() => {
    if (context === 'general') {
      return allAllowedKpis.filter(k => !k.is_client_specific);
    } else {
      // When a client is selected, show only client-specific KPIs
      // AND only for sectors matching the client's flags
      return allAllowedKpis.filter(k => {
        if (!k.is_client_specific) return false;
        if (!selectedClient) return true;
        return clientMatchesSector(selectedClient, k.sector);
      });
    }
  }, [context, allAllowedKpis, selectedClient]);

  const kpisBySector = useMemo(() => {
    return visibleKpis.reduce((acc, kpi) => {
      if (!acc[kpi.sector]) acc[kpi.sector] = [];
      acc[kpi.sector].push(kpi);
      return acc;
    }, {} as Record<string, KPIDefinition[]>);
  }, [visibleKpis]);

  // Filter clients for the dropdown: only show clients that have at least one
  // sector flag AND the user has client-specific KPIs in those sectors
  const clientsForDropdown = useMemo(() => {
    const clientSpecificSectors = new Set(
      allAllowedKpis.filter(k => k.is_client_specific).map(k => k.sector.toLowerCase())
    );
    return activeClients.filter(c => {
      // Client must have at least one sector flag that matches a client-specific KPI sector
      if (c.is_placement && clientSpecificSectors.has('placement')) return true;
      if (c.is_prospecting && clientSpecificSectors.has('prospecting')) return true;
      if (c.is_rar && clientSpecificSectors.has('rar')) return true;
      return false;
    });
  }, [activeClients, allAllowedKpis]);

  const handleInputChange = (kpiId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [kpiId]: e.target.value }));
  };

  const handleReset = () => {
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const targetClientId = context === 'general' ? null : context;

      const promises = visibleKpis.map(async (kpi) => {
        const valueStr = formData[kpi.id];
        if (valueStr !== undefined && valueStr.trim() !== '') {
          const val = parseFloat(valueStr);
          const existingId = existingEntries[kpi.id];

          if (existingId) {
            const { error } = await supabase
              .from('kpi_entries')
              .update({ value: val, sector: kpi.sector })
              .eq('id', existingId);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('kpi_entries')
              .insert({
                user_id: user.id,
                date: formattedDate,
                kpi_id: kpi.id,
                sector: kpi.sector,
                value: val,
                client_id: targetClientId
              });
            if (error) throw error;
          }
        } else if (existingEntries[kpi.id]) {
          // Field was cleared, optionally delete entry? 
          // The requirement doesn't mandate deletion on clear, but commonly handled. 
          // We'll skip for safety.
        }
      });

      await Promise.all(promises);

      toast.success('KPI Entry Saved!');
      // Update local submitted states to show dynamic "pending" remove
      if (context !== 'general' && !submittedClientIds.includes(context)) {
        setSubmittedClientIds(prev => [...prev, context]);
      }
    } catch (error: any) {
      console.error('Error saving KPI:', error);
      toast.error('Failed to save entry', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pending clients: only from the filtered dropdown list (clients with matching sectors)
  const pendingClients = clientsForDropdown.filter(c => !submittedClientIds.includes(c.id));

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

        {pendingClients.length > 0 && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md flex items-start gap-3 shadow-sm">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="text-yellow-800 font-medium">Pending Clients for {format(date, 'MMM do')}</h4>
              <p className="text-sm text-yellow-700 mt-1">
                You have not submitted client-specific KPIs for: <br />
                <span className="font-semibold">{pendingClients.map(c => c.name).join(', ')}</span>
              </p>
            </div>
          </div>
        )}

        <Card className="animate-fade-in relative">
          {isLoadingEntry && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          <CardHeader>
            <CardTitle>Entry Context</CardTitle>
            <CardDescription>
              Select the date and the context (General or a specific Client) for your metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingKpis || isLoadingClients ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : allAllowedKpis.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No KPIs configured for this user. Please contact an admin.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
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

                  <div className="space-y-2">
                    <Label>Context (Client)</Label>
                    <Select value={context} onValueChange={setContext}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general" className="font-semibold text-primary">General (Internal KPIs)</SelectItem>
                        {clientsForDropdown.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} {submittedClientIds.includes(c.id) && "✓"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  {visibleKpis.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No KPIs available for this context.
                    </div>
                  ) : (
                    Object.entries(kpisBySector).map(([sector, kpis]) => (
                      <div key={sector} className="space-y-4 mb-6">
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
                    ))
                  )}
                </div>

                <div className="flex gap-4 pt-4 border-t">
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
                    disabled={isSubmitting || isLoadingEntry || visibleKpis.length === 0}
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
