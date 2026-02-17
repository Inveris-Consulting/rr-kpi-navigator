import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import FilterBar from '@/components/dashboard/FilterBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EditEntryModal } from '@/components/dashboard/EditEntryModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PivotedEntry {
  id: string;
  userId: string;
  userName: string;
  date: string;
  [key: string]: any; // Dynamic KPI values
}


const History = () => {
  const { user, isAdmin } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedUser, setSelectedUser] = useState(isAdmin ? 'all' : user?.id || '');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  // Fetch all KPIs to define table columns and order
  const { data: kpiDefinitions = [] } = useQuery({
    queryKey: ['kpiDefinitions', isAdmin, user?.id],
    queryFn: async () => {
      if (isAdmin) {
        // Admin sees all KPIs
        const { data, error } = await supabase
          .from('kpis')
          .select('*')
          .order('sector', { ascending: true })
          .order('name', { ascending: true });
        if (error) throw error;
        return data || [];
      } else {
        // Regular users only see assigned KPIs
        const { data, error } = await supabase
          .from('user_kpis')
          .select(`
            kpis (
              id,
              name,
              sector
            )
          `)
          .eq('user_id', user?.id);

        if (error) throw error;

        // Transform and sort
        const kpis = (data || []).map((item: any) => item.kpis);
        return kpis.sort((a: any, b: any) => {
          if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
          return a.name.localeCompare(b.name);
        });
      }
    },
    enabled: !!user
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['kpiHistory', selectedPeriod, selectedUser],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));

      let query = supabase
        .from('kpi_entries')
        .select(`
          *,
          users (name),
          kpis (id, name, sector)
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      // Order by date desc
      query = query.order('date', { ascending: false });

      if (selectedUser !== 'all') {
        const uid = selectedUser || user?.id;
        query = query.eq('user_id', uid);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Pivot Data
      const pivotedMap = new Map<string, PivotedEntry>();

      (data || []).forEach((row: any) => {
        if (row.kpis) {
          const key = `${row.date}_${row.user_id}`;
          if (!pivotedMap.has(key)) {
            pivotedMap.set(key, {
              id: key,
              userId: row.user_id,
              userName: row.users?.name || 'Unknown',
              date: row.date,
            });
          }
          const entry = pivotedMap.get(key)!;
          entry[row.kpis.name] = row.value;
        }
      });

      return Array.from(pivotedMap.values());
    },
    enabled: !!user,
  });

  // Calculate calculated columns (e.g., Close Rate) if possible
  const processedEntries = useMemo(() => {
    return entries.map(entry => {
      const getVal = (name: string) => Number(entry[name] || 0);
      let closeRate = 0;

      // Calculate Close Rate
      if (entry['Closes'] && entry['Open Reqs']) {
        const val = getVal('Open Reqs');
        if (val > 0) closeRate = (getVal('Closes') / val) * 100;
      } else if (entry['Closed Job Reqs'] && entry['Open Job Reqs']) {
        const val = getVal('Open Job Reqs');
        if (val > 0) closeRate = (getVal('Closed Job Reqs') / val) * 100;
      }

      return {
        ...entry,
        _closeRate: closeRate
      };
    });
  }, [entries]);

  const [editingEntry, setEditingEntry] = useState<PivotedEntry | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleEditClick = (entry: PivotedEntry) => {
    setEditingEntry(entry);
    setIsEditOpen(true);
  };

  const handleDelete = async (entry: PivotedEntry) => {
    try {
      const { error } = await supabase
        .from('kpi_entries')
        .delete()
        .eq('user_id', entry.userId)
        .eq('date', entry.date);

      if (error) throw error;

      toast.success('Entry deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['kpiHistory'] });
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  // Get unique sectors
  const sectors = useMemo(() => {
    const s = Array.from(new Set(kpiDefinitions.map((d: any) => d.sector)));
    return s.sort((a: any, b: any) => a.localeCompare(b));
  }, [kpiDefinitions]);

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            KPI History
          </h1>
          <p className="text-muted-foreground">
            View and analyze historical performance data
          </p>
        </div>

        {/* Filters */}
        <FilterBar
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          selectedUser={selectedUser}
          onUserChange={setSelectedUser}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          showUserFilter={isAdmin}
        />

        {/* Data Table */}
        <Card className="animate-fade-in overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Detailed Entries
              <Badge variant="secondary">{entries.length} records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading history data...
              </div>
            ) : (
              <Tabs defaultValue={sectors[0] || 'all'} className="w-full">
                <TabsList className="mb-4 flex flex-wrap h-auto gap-2 bg-transparent justify-start p-0">
                  {sectors.map((sector: any) => (
                    <TabsTrigger
                      key={sector}
                      value={sector}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2 rounded-full border border-border bg-card shadow-sm"
                    >
                      {sector}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {sectors.map((sector: any) => {
                  const sectorKpis = kpiDefinitions.filter((k: any) => k.sector === sector);

                  return (
                    <TabsContent key={sector} value={sector}>
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-secondary/50">
                              <TableHead className="font-semibold min-w-[120px]">Date</TableHead>
                              {isAdmin && <TableHead className="font-semibold min-w-[150px]">User</TableHead>}

                              {/* Dynamic Headers for this Sector */}
                              {sectorKpis.map((kpi: any) => (
                                <TableHead key={kpi.id} className="text-right font-semibold whitespace-nowrap">
                                  {kpi.name}
                                </TableHead>
                              ))}

                              {/* Calculated Headers - Only for RAR */}
                              {sector === 'RAR' && (
                                <TableHead className="text-right font-semibold">Close Rate</TableHead>
                              )}

                              {/* Actions Header */}
                              <TableHead className="w-[100px] text-right font-semibold sticky right-0 bg-background z-10 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {processedEntries.map((entry) => (
                              <TableRow key={entry.id} className="hover:bg-secondary/30 group relative">
                                <TableCell className="font-medium">
                                  {format(new Date(`${entry.date}T00:00:00`), 'MMM d, yyyy')}
                                </TableCell>
                                {isAdmin && (
                                  <TableCell>
                                    <Badge variant="outline" className="font-normal">
                                      {entry.userName}
                                    </Badge>
                                  </TableCell>
                                )}

                                {/* Dynamic Values for this Sector */}
                                {sectorKpis.map((kpi: any) => (
                                  <TableCell key={kpi.id} className="text-right">
                                    {entry[kpi.name] !== undefined ? entry[kpi.name] : '-'}
                                  </TableCell>
                                ))}

                                {/* Calculated Values - Only for RAR */}
                                {sector === 'RAR' && (
                                  <TableCell className="text-right">
                                    {entry._closeRate > 0 ? (
                                      <Badge
                                        variant={entry._closeRate >= 20 ? 'default' : 'secondary'}
                                        className={entry._closeRate >= 20 ? 'bg-success' : ''}
                                      >
                                        {entry._closeRate.toFixed(1)}%
                                      </Badge>
                                    ) : '-'}
                                  </TableCell>
                                )}

                                {/* Actions */}
                                <TableCell className="text-right sticky right-0 bg-background z-10 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                                      onClick={() => handleEditClick(entry)}
                                      title="Edit Entry"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                          title="Delete Entry"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete the entry for <span className="font-medium">{entry.userName}</span> on <span className="font-medium">{format(new Date(entry.date + 'T00:00:00'), 'MMM d, yyyy')}</span>?
                                            This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={() => handleDelete(entry)}
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {processedEntries.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={sectorKpis.length + (isAdmin ? 3 : 2) + (sector === 'RAR' ? 1 : 0)} className="text-center h-24 text-muted-foreground">
                                  No entries found for the selected period.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  )
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Edit Modal */}
        <EditEntryModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          entry={editingEntry}
          kpiDefinitions={kpiDefinitions}
        />
      </div>
    </MainLayout>
  );
};

export default History;
