import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import KPICard from '@/components/dashboard/KPICard';
import KPIChart from '@/components/dashboard/KPIChart';
import RecentEntries from '@/components/dashboard/RecentEntries';
import FilterBar from '@/components/dashboard/FilterBar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Phone,
  Calendar,
  CheckCircle,
  Target,
  Briefcase,
  TrendingUp,
  BarChart3,
  Star
} from 'lucide-react';
import { KPIEntry } from '@/lib/mockData'; // Keeping interface for now or redefining

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedUser, setSelectedUser] = useState(isAdmin ? 'all' : user?.id || '');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  // Fetch KPI Data from Supabase
  const { data: kpiData = [], isLoading } = useQuery({
    queryKey: ['kpiEntries', selectedPeriod, selectedUser],
    queryFn: async () => {
      console.log('Fetching KPI data...', { selectedPeriod, selectedUser, userId: user?.id });
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));

      let query = supabase
        .from('kpi_entries')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (selectedUser !== 'all') {
        const uid = selectedUser || user?.id;
        query = query.eq('user_id', uid);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase Error:', error);
        throw error;
      }
      console.log('Fetched data:', data?.length);
      if (data?.length === 0) console.warn('No data found for query:', { startDate, endDate, uid: selectedUser || user?.id });


      // Map Supabase snake_case to application camelCase
      return (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        date: item.date,
        callsMade: item.calls_made,
        meetingsSet: item.meetings_set,
        meetingsCompleted: item.meetings_completed,
        closes: item.closes,
        openRequisitions: item.open_requisitions,
        reqCloseRate: item.req_close_rate,
        vipList: item.vip_list || 0,
        createdAt: item.created_at
      })) as KPIEntry[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Calculate Aggregates & Charts (Client-side mainly for now to keep logic similar)
  const { chartData, aggregated, recentEntries } = useMemo(() => {
    if (!kpiData.length) return { chartData: [], aggregated: null, recentEntries: [] };

    // Aggregate
    const totalCalls = kpiData.reduce((acc, curr) => acc + (curr.callsMade || 0), 0);
    const totalMeetingsSet = kpiData.reduce((acc, curr) => acc + (curr.meetingsSet || 0), 0);
    const totalMeetingsCompleted = kpiData.reduce((acc, curr) => acc + (curr.meetingsCompleted || 0), 0);
    const totalCloses = kpiData.reduce((acc, curr) => acc + (curr.closes || 0), 0);
    const totalVipList = kpiData.reduce((acc, curr) => acc + (curr.vipList || 0), 0);
    const count = kpiData.length;

    // Averages
    const avgOpenRequisitions = Math.round(kpiData.reduce((acc, curr) => acc + (curr.openRequisitions || 0), 0) / (count || 1));

    // Recalculate rates
    const avgReqCloseRate = parseFloat((kpiData.reduce((acc, curr) => acc + (Number(curr.reqCloseRate) || 0), 0) / (count || 1)).toFixed(1));

    const aggregated = {
      totalCalls,
      totalMeetingsSet,
      totalMeetingsCompleted,
      totalCloses,
      totalVipList,
      avgOpenRequisitions,
      avgReqCloseRate
    };

    // Chart Data
    // Grouping logic... reusing simple map or write new one.
    // Let's implement a simple grouper since we lost `getChartData`.
    const chartMap = new Map();
    kpiData.forEach(entry => {
      let key = entry.date; // default day
      if (groupBy === 'month') key = entry.date.substring(0, 7); // YYYY-MM
      // Week logic is a bit complex, sticking to simple day for now or basic

      if (!chartMap.has(key)) {
        chartMap.set(key, { date: key, calls: 0, meetings: 0, completed: 0, closes: 0 });
      }
      const node = chartMap.get(key);
      node.calls += entry.callsMade || 0;
      node.meetings += entry.meetingsSet || 0;
      node.completed += entry.meetingsCompleted || 0;
      node.closes += entry.closes || 0;
    });

    // Sort by date
    const chartData = Array.from(chartMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      chartData,
      aggregated,
      recentEntries: kpiData.slice(0, 5) // Already ordered by date desc in query
    };
  }, [kpiData, groupBy]);

  // Previous Period for Trends (simplified: just fetching again or derived?)
  // For proper trends, we need another query. 
  const { data: previousData = [] } = useQuery({
    queryKey: ['kpiEntriesPrev', selectedPeriod, selectedUser],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (parseInt(selectedPeriod) * 2));
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - parseInt(selectedPeriod));

      let query = supabase
        .from('kpi_entries')
        .select('calls_made, meetings_set, meetings_completed, closes, vip_list')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser || user?.id);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!user
  });

  const trends = useMemo(() => {
    if (!aggregated || !previousData.length) return {};

    const prevCalls = previousData.reduce((acc, curr) => acc + (curr.calls_made || 0), 0);
    const prevSet = previousData.reduce((acc, curr) => acc + (curr.meetings_set || 0), 0);
    const prevCompleted = previousData.reduce((acc, curr) => acc + (curr.meetings_completed || 0), 0);
    const prevCloses = previousData.reduce((acc, curr) => acc + (curr.closes || 0), 0);
    const prevVipList = previousData.reduce((acc, curr) => acc + (curr.vip_list || 0), 0);

    const calc = (curr: number, prev: number) => prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 100);

    return {
      calls: calc(aggregated.totalCalls, prevCalls),
      meetings: calc(aggregated.totalMeetingsSet, prevSet),
      completed: calc(aggregated.totalMeetingsCompleted, prevCompleted),
      closes: calc(aggregated.totalCloses, prevCloses),
      vipList: calc(aggregated.totalVipList, prevVipList)
    };
  }, [aggregated, previousData]);

  if (isLoading && kpiData.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Performance Dashboard
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Overview of all team KPIs and performance metrics'
              : `Welcome back, ${user?.name || 'User'}. Here's your performance overview.`
            }
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

        {/* KPI Cards */}
        {aggregated && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Calls Made"
              value={aggregated.totalCalls.toLocaleString()}
              icon={<Phone className="h-6 w-6" />}
              trend={trends.calls}
              trendLabel="vs prev"
            />
            <KPICard
              title="Meetings Set"
              value={aggregated.totalMeetingsSet.toLocaleString()}
              icon={<Calendar className="h-6 w-6" />}
              trend={trends.meetings}
              trendLabel="vs prev"
            />
            <KPICard
              title="Meetings Completed"
              value={aggregated.totalMeetingsCompleted.toLocaleString()}
              icon={<CheckCircle className="h-6 w-6" />}
              trend={trends.completed}
              trendLabel="vs prev"
            />
            <KPICard
              title="Closes"
              value={aggregated.totalCloses.toLocaleString()}
              icon={<Target className="h-6 w-6" />}
              trend={trends.closes}
              trendLabel="vs prev"
            />
          </div>
        )}

        {/* Secondary KPI Cards */}
        {aggregated && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title="Open Requisitions"
              value={aggregated.avgOpenRequisitions}
              icon={<Briefcase className="h-6 w-6" />}
            />
            <KPICard
              title="Req. Close Rate"
              value={`${aggregated.avgReqCloseRate}%`}
              icon={<TrendingUp className="h-6 w-6" />}
            />
            <KPICard
              title="Vip List"
              value={aggregated.totalVipList}
              icon={<Star className="h-6 w-6" />}
              trend={trends.vipList}
              trendLabel="vs prev"
            />
          </div>
        )}

        {/* Charts and Recent Entries */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <KPIChart
              data={chartData}
              title={`Performance Trend (${selectedPeriod} Days)`}
            />
          </div>
          <div>
            <RecentEntries
              entries={recentEntries}
              showUser={isAdmin || selectedUser === 'all'}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
