import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import KPICard from '@/components/dashboard/KPICard';
import KPIChart from '@/components/dashboard/KPIChart';
import RecentEntries from '@/components/dashboard/RecentEntries';
import FilterBar from '@/components/dashboard/FilterBar';
import { 
  getKPIsByDateRange, 
  getRecentEntries, 
  aggregateKPIs, 
  getChartData 
} from '@/lib/mockData';
import { 
  Phone, 
  Calendar, 
  CheckCircle, 
  Target, 
  Briefcase,
  TrendingUp,
  BarChart3
} from 'lucide-react';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedUser, setSelectedUser] = useState(isAdmin ? 'all' : user?.id || '');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const { kpiData, chartData, aggregated, recentEntries } = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));

    const userId = selectedUser === 'all' ? undefined : selectedUser;
    const data = getKPIsByDateRange(startDate, endDate, userId);
    const agg = aggregateKPIs(data);
    const chart = getChartData(data, groupBy);
    const recent = getRecentEntries(5, userId);

    return {
      kpiData: data,
      chartData: chart,
      aggregated: agg,
      recentEntries: recent,
    };
  }, [selectedPeriod, selectedUser, groupBy]);

  // Calculate trends (compare to previous period)
  const trends = useMemo(() => {
    const endDate = new Date();
    const midDate = new Date();
    const startDate = new Date();
    const periodDays = parseInt(selectedPeriod);
    
    midDate.setDate(midDate.getDate() - periodDays);
    startDate.setDate(startDate.getDate() - periodDays * 2);

    const userId = selectedUser === 'all' ? undefined : selectedUser;
    const previousData = getKPIsByDateRange(startDate, midDate, userId);
    const previousAgg = aggregateKPIs(previousData);

    if (!aggregated || !previousAgg) return {};

    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      calls: calcTrend(aggregated.totalCalls, previousAgg.totalCalls),
      meetings: calcTrend(aggregated.totalMeetingsSet, previousAgg.totalMeetingsSet),
      completed: calcTrend(aggregated.totalMeetingsCompleted, previousAgg.totalMeetingsCompleted),
      closes: calcTrend(aggregated.totalCloses, previousAgg.totalCloses),
    };
  }, [aggregated, selectedPeriod, selectedUser]);

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
              : `Welcome back, ${user?.name}. Here's your performance overview.`
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
              variant="primary"
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
              variant="accent"
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
              title="PCL"
              value={`${aggregated.avgPCL}%`}
              icon={<BarChart3 className="h-6 w-6" />}
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
