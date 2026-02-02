import { useState } from 'react';
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
import { KPIEntry } from '@/lib/mockData';

interface HistoryEntry extends KPIEntry {
  userName?: string;
}

const History = () => {
  const { user, isAdmin } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedUser, setSelectedUser] = useState(isAdmin ? 'all' : user?.id || '');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['kpiHistory', selectedPeriod, selectedUser],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));

      let query = supabase
        .from('kpi_entries')
        .select('*, users(name)')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (selectedUser !== 'all') {
        const uid = selectedUser || user?.id;
        query = query.eq('user_id', uid);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        userName: item.users?.name || 'Unknown',
        date: item.date,
        callsMade: item.calls_made,
        meetingsSet: item.meetings_set,
        meetingsCompleted: item.meetings_completed,
        closes: item.closes,
        openRequisitions: item.open_requisitions,
        reqCloseRate: item.req_close_rate,
        vipList: item.vip_list || 0,
        createdAt: item.created_at
      })) as HistoryEntry[];
    },
    enabled: !!user,
  });

  // Helper not needed anymore as we have userName
  // const getUserName = ...

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
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Detailed Entries
              <Badge variant="secondary">{entries.length} records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="font-semibold">Date</TableHead>
                    {isAdmin && <TableHead className="font-semibold">User</TableHead>}
                    <TableHead className="text-right font-semibold">Calls</TableHead>
                    <TableHead className="text-right font-semibold">Meetings Set</TableHead>
                    <TableHead className="text-right font-semibold">Completed</TableHead>
                    <TableHead className="text-right font-semibold">Closes</TableHead>
                    <TableHead className="text-right font-semibold">Open Reqs</TableHead>
                    <TableHead className="text-right font-semibold">Vip List</TableHead>
                    <TableHead className="text-right font-semibold">Close Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
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
                      <TableCell className="text-right">{entry.callsMade}</TableCell>
                      <TableCell className="text-right">{entry.meetingsSet}</TableCell>
                      <TableCell className="text-right">{entry.meetingsCompleted}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {entry.closes}
                      </TableCell>
                      <TableCell className="text-right">{entry.openRequisitions}</TableCell>
                      <TableCell className="text-right">{entry.vipList}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={entry.reqCloseRate >= 20 ? 'default' : 'secondary'}
                          className={entry.reqCloseRate >= 20 ? 'bg-success' : ''}
                        >
                          {entry.reqCloseRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                Loading history data...
              </div>
            )}

            {entries.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                No entries found for the selected period.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default History;
