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
import { KPIEntry } from '@/lib/mockData';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedUser, setSelectedUser] = useState(isAdmin ? 'all' : user?.id || '');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  // Fetch KPI Data from Supabase
  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ['kpiEntries', selectedPeriod, selectedUser],
    queryFn: async () => {
      console.log('Fetching KPI data...', { selectedPeriod, selectedUser, userId: user?.id });
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));

      let query = supabase
        .from('kpi_entries')
        .select(`
            *,
            kpis (id, name, sector)
        `)
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
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Calculate Aggregates & Charts (Client-side)
  const { chartData, aggregated, recentEntries } = useMemo(() => {
    if (!rawData.length) return { chartData: [], aggregated: null, recentEntries: [] };

    // Aggregates
    let totalCalls = 0;
    let totalMeetingsSet = 0;
    let totalMeetingsCompleted = 0;
    let totalCloses = 0;
    let totalVipList = 0;

    // For averages
    let sumOpenRequisitions = 0;
    let countOpenReqsEntries = 0;

    // Process raw rows
    rawData.forEach((row: any) => {
      const name = row.kpis?.name;
      const val = Number(row.value || 0);

      if (!name) return;

      if (name === 'Calls') totalCalls += val;
      if (name === 'Meetings set') totalMeetingsSet += val;
      if (name === 'Completed Meetings' || name === 'Meetings') totalMeetingsCompleted += val; // Handle both types
      if (name === 'Closes') totalCloses += val;
      if (name === 'VIP List') totalVipList += val;
      if (name === 'Open Job Reqs' || name === 'Open Requisitions') {
        sumOpenRequisitions += val;
        countOpenReqsEntries++;
      }
    });

    const avgOpenRequisitions = countOpenReqsEntries > 0 ? Math.round(sumOpenRequisitions / countOpenReqsEntries) : 0;

    const avgReqCloseRate = sumOpenRequisitions > 0 ? ((totalCloses / sumOpenRequisitions) * 100).toFixed(1) : '0.0';

    const aggregated = {
      totalCalls,
      totalMeetingsSet,
      totalMeetingsCompleted,
      totalCloses,
      totalVipList,
      avgOpenRequisitions,
      avgReqCloseRate
    };

    // Chart Data Grouping
    const chartMap = new Map();
    rawData.forEach((row: any) => {
      let key = row.date;
      if (groupBy === 'month') key = row.date.substring(0, 7);

      if (!chartMap.has(key)) {
        chartMap.set(key, { date: key, calls: 0, meetings: 0, completed: 0, closes: 0 });
      }
      const node = chartMap.get(key);
      const name = row.kpis?.name;
      const val = Number(row.value || 0);

      if (name === 'Calls') node.calls += val;
      if (name === 'Meetings set') node.meetings += val;
      if (name === 'Completed Meetings' || name === 'Meetings') node.completed += val;
      if (name === 'Closes') node.closes += val;
    });

    const chartData = Array.from(chartMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Recent Entries - Pivot for display
    const entriesMap = new Map();
    rawData.forEach((row: any) => {
      const key = `${row.date}_${row.user_id}`;
      if (!entriesMap.has(key)) {
        entriesMap.set(key, {
          id: key,
          userId: row.user_id,
          date: row.date,
          callsMade: 0,
          meetingsSet: 0,
          meetingsCompleted: 0,
          closes: 0,
          openRequisitions: 0,
          reqCloseRate: 0,
          vipList: 0,
          createdAt: row.created_at
        });
      }
      const entry = entriesMap.get(key);
      const name = row.kpis?.name;
      const val = Number(row.value || 0);

      if (name === 'Calls') entry.callsMade = val;
      if (name === 'Meetings set') entry.meetingsSet = val;
      if (name === 'Completed Meetings' || name === 'Meetings') entry.meetingsCompleted = val;
      if (name === 'Closes') entry.closes = val;
      if (name === 'Open Job Reqs' || name === 'Open Requisitions') entry.openRequisitions = val;
      if (name === 'VIP List') entry.vipList = val;
    });

    // Calc rates for recent entries
    const recentEntries = Array.from(entriesMap.values())
      .map(e => ({
        ...e,
        reqCloseRate: e.openRequisitions > 0 ? ((e.closes / e.openRequisitions) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    return {
      chartData,
      aggregated,
      recentEntries
    };
  }, [rawData, groupBy]);

  // Previous Period Trends (Placeholder)
  const trends = {
    calls: 0,
    meetings: 0,
    completed: 0,
    closes: 0,
    vipList: 0
  };

  if (isLoading && rawData.length === 0) {
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
