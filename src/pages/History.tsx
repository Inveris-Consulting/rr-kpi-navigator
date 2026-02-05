import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import FilterBar from '@/components/dashboard/FilterBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

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
    queryKey: ['kpiDefinitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .order('sector', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    }
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
        // We use normalization valid entries only, but we might encounter old data if not migrated. 
        // The query selects from kpi_entries. 
        // If 'kpi_id' is null (old data which we haven't dropped yet?), we skip or handle?
        // The prompt asked to add functionality, we assume new data primarily.
        // If kpi_id is present:
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
          // Use KPI name as key for simplicity in rendering, or ID. Name is friendlier for generic table.
          // Using ID might be safer but headers need to match.
          // Let's use KPI ID mapped to Name for display, but use ID in data object to be robust?
          // Actually, simpler: Use KPI Name as key if unique, which they should be.
          entry[row.kpis.name] = row.value;
          entry.sector = row.sector; // Last one wins, but usually consistent per KPI? No, mixed sectors possible per day.
        }
      });

      return Array.from(pivotedMap.values());
    },
    enabled: !!user,
  });

  // Calculate calculated columns (e.g., Close Rate) if possible
  // This logic was previously hardcoded: (closes / openRequisitions).
  // We can try to replicate it if "Closes" and "Open Job Reqs" exist.
  const processedEntries = useMemo(() => {
    return entries.map(entry => {
      // Safe access helper
      const getVal = (name: string) => Number(entry[name] || 0);

      // Example: Rate = Closes / Open Job Reqs
      // Need to check exact names from Step 1/Migration
      // Names: 'Closes', 'Open Job Reqs'
      const closes = getVal('Closes'); // Janet has 'Closes', Amber ?? Amber has 'Closed Job Reqs'?
      // Amber has 'Closed Job Reqs'. Janet has 'Closes'.
      // Let's look at the migration:
      // Amber: 'Closed Job Reqs' (RAR)
      // Janet: 'Closes' (RAR)
      // The calculation logic might differ per user or we standardized?
      // The previous code had `closes` and `openRequisitions`.
      // Let's try to calculate generic 'Close Rate' if matching columns found.

      let closeRate = 0;
      // Try common pairs or just skip calculation for generic view now that it's dynamic
      if (entry['Closes'] && entry['Open Reqs']) { // Janet?
        const val = getVal('Open Reqs');
        if (val > 0) closeRate = (getVal('Closes') / val) * 100;
      } else if (entry['Closed Job Reqs'] && entry['Open Job Reqs']) { // Amber?
        const val = getVal('Open Job Reqs');
        if (val > 0) closeRate = (getVal('Closed Job Reqs') / val) * 100;
      }

      return {
        ...entry,
        _closeRate: closeRate
      };
    });
  }, [entries]);

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
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-semibold min-w-[120px]">Date</TableHead>
                    {isAdmin && <TableHead className="font-semibold min-w-[150px]">User</TableHead>}

                    {/* Dynamic Headers */}
                    {kpiDefinitions.map((kpi: any) => (
                      <TableHead key={kpi.id} className="text-right font-semibold whitespace-nowrap">
                        {kpi.name}
                        <span className="text-xs font-normal text-muted-foreground block">
                          {kpi.sector}
                        </span>
                      </TableHead>
                    ))}

                    {/* Calculated Headers */}
                    <TableHead className="text-right font-semibold">Close Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedEntries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-secondary/30">
                      <TableCell className="font-medium">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {entry.userName}
                          </Badge>
                        </TableCell>
                      )}

                      {/* Dynamic Values */}
                      {kpiDefinitions.map((kpi: any) => (
                        <TableCell key={kpi.id} className="text-right">
                          {entry[kpi.name] !== undefined ? entry[kpi.name] : '-'}
                        </TableCell>
                      ))}

                      {/* Calculated Values */}
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
                    </TableRow>
                  ))}
                  {processedEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={kpiDefinitions.length + 3} className="text-center h-24 text-muted-foreground">
                        No entries found for the selected period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {isLoading && (
              <div className="text-center py-4 text-muted-foreground">
                Loading history data...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default History;
