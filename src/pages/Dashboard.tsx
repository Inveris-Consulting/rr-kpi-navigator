import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import KPICard from '@/components/dashboard/KPICard';
import KPIChart from '@/components/dashboard/KPIChart';
import RecentEntries from '@/components/dashboard/RecentEntries';
import FilterBar from '@/components/dashboard/FilterBar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useClients, useJobs, useJobReceipts, useJobPayments, useMonthlyEmployeeExpenses } from '@/hooks/useOperationalCosts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import {
  Phone,
  Calendar,
  CheckCircle,
  Briefcase,
  TrendingUp,
  Star,
  UserPlus,
  FileText,
  Users,
  Activity,
  DollarSign,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

// Helper to safely parse dates for sorting/display
const parseDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (dateStr.length === 10) return new Date(`${dateStr}T00:00:00`);
  return new Date(dateStr);
};

// Helper: Map KPI names to Icons
const getIconForKPI = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('call')) return <Phone className="h-5 w-5" />;
  if (n.includes('meeting')) return <Calendar className="h-5 w-5" />;
  if (n.includes('hire')) return <UserPlus className="h-5 w-5" />;
  if (n.includes('resume')) return <FileText className="h-5 w-5" />;
  if (n.includes('req')) return <Briefcase className="h-5 w-5" />;
  if (n.includes('completed')) return <CheckCircle className="h-5 w-5" />;
  if (n.includes('vip')) return <Star className="h-5 w-5" />;
  if (n.includes('no show')) return <Users className="h-5 w-5" />;
  return <Activity className="h-5 w-5" />; // Default
};

const Dashboard = () => {
  const { section = 'overview' } = useParams<{ section: string }>();
  const { user, isAdmin } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedUser, setSelectedUser] = useState(isAdmin ? 'all' : user?.id || '');
  const [selectedClient, setSelectedClient] = useState('all');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [selectedChartKPI, setSelectedChartKPI] = useState<Record<string, string>>({});
  const [hiddenCards, setHiddenCards] = useState<Record<string, Set<string>>>({});

  const toggleCardVisibility = (sector: string, cardName: string) => {
    setHiddenCards(prev => {
      const next = { ...prev };
      const set = new Set(prev[sector] || []);
      if (set.has(cardName)) {
        set.delete(cardName);
      } else {
        set.add(cardName);
      }
      next[sector] = set;
      return next;
    });
  };

  const isCardVisible = (sector: string, cardName: string) => {
    return !hiddenCards[sector]?.has(cardName);
  };

  const { data: clients } = useClients();
  const activeClients = useMemo(() => clients?.filter(c => c.is_active) || [], [clients]);

  // Fetch Dashboard Users for Filter
  const { data: dashboardUsers } = useQuery({
    queryKey: ['dashboardUsers'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('id, name, role');
      return data || [];
    },
    enabled: isAdmin
  });

  // 1. Fetch KPI Definitions (What metrics exist?)
  const { data: kpiDefinitions = [], isLoading: isLoadingDefs } = useQuery({
    queryKey: ['kpiDefs', user?.id, isAdmin, selectedUser],
    queryFn: async () => {
      if (isAdmin) {
        const { data, error } = await supabase.from('kpis').select('*');
        if (error) throw error;
        return data || [];
      } else {
        const { data, error } = await supabase
          .from('user_kpis')
          .select(`kpis (*)`)
          .eq('user_id', user?.id);
        if (error) throw error;
        return data?.map((d: any) => d.kpis) || [];
      }
    },
    enabled: !!user
  });

  // 2. Fetch Data (Entries)
  const { data: rawData = [], isLoading: isLoadingData } = useQuery({
    queryKey: ['kpiEntries', selectedPeriod, selectedUser, selectedClient],
    queryFn: async () => {
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

      if (selectedClient !== 'all') {
        if (selectedClient === 'general') {
          query = query.is('client_id', null);
        } else {
          query = query.eq('client_id', selectedClient);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Job Costs Data
  const { data: jobs, isLoading: isLoadingJobs } = useJobs();
  const { data: jobReceipts, isLoading: isLoadingReceipts } = useJobReceipts();
  const { data: jobPayments, isLoading: isLoadingPayments } = useJobPayments();
  const { data: employeeExpenses, isLoading: isLoadingEmployees } = useMonthlyEmployeeExpenses();

  // 3. Compute Stats Dynamically
  const stats = useMemo(() => {
    const acc: Record<string, Record<string, number>> = {};
    const snapshotKPIs = ['Active Clients', 'Open Job Reqs', 'Open Positions'];
    const visitedSnapshotUsers: Record<string, Set<string>> = {};

    snapshotKPIs.forEach(kpi => visitedSnapshotUsers[kpi] = new Set());

    kpiDefinitions.forEach((def: any) => {
      if (!acc[def.sector]) acc[def.sector] = {};
      acc[def.sector][def.name] = 0;
    });

    rawData.forEach((row: any) => {
      const name = row.kpis?.name;
      const sector = row.kpis?.sector;
      const val = Number(row.value || 0);
      const userId = row.user_id;

      if (!name || !sector) return;

      if (!acc[sector]) acc[sector] = {};
      if (acc[sector][name] === undefined) acc[sector][name] = 0;

      if (snapshotKPIs.includes(name)) {
        // Since we may filter by client_id, the snapshot logic might need to be per client as well if client_id is present.
        // For simplicity, we just take the latest per user+client combination.
        const snapshotKey = `${userId}_${row.client_id || 'general'}`;
        if (!visitedSnapshotUsers[name].has(snapshotKey)) {
          acc[sector][name] += val;
          visitedSnapshotUsers[name].add(snapshotKey);
        }
      } else {
        acc[sector][name] += val;
      }
    });

    return acc;
  }, [rawData, kpiDefinitions]);

  // 4. Chart Data
  const chartData = useMemo(() => {
    const map = new Map();
    rawData.forEach((row: any) => {
      const date = row.date;
      if (!map.has(date)) {
        map.set(date, { date });
      }
      const node = map.get(date);
      const name = row.kpis?.name;
      const val = Number(row.value || 0);
      node[name] = (node[name] || 0) + val;
    });
    return Array.from(map.values()).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [rawData]);

  // 5. Recent Entries Synthesis
  const recentEntries = useMemo(() => {
    const entriesMap = new Map();
    rawData.forEach((row: any) => {
      const key = `${row.date}_${row.user_id}_${row.client_id || 'general'}`;
      if (!entriesMap.has(key)) {
        entriesMap.set(key, {
          id: key,
          userId: row.user_id,
          date: row.date,
          clientId: row.client_id,
          callsMade: 0,
          meetingsSet: 0,
          meetingsCompleted: 0,
          closes: 0,
          openRequisitions: 0,
          vipList: 0,
          activeClients: 0,
          hires: 0,
          closedReqs: 0,
          createdAt: row.created_at
        });
      }
      const entry = entriesMap.get(key);
      const name = row.kpis?.name;
      const val = Number(row.value || 0);

      if (name === 'Calls') entry.callsMade = val;
      if (name === 'Meetings set') entry.meetingsSet = val;
      if (name === 'Completed Meetings') entry.meetingsCompleted = val;
      if (name === 'Closes' || name === 'Closed Job Reqs') entry.closes = val;
      if (name === 'Open Job Reqs') entry.openRequisitions = val;
      if (name === 'VIP List') entry.vipList = val;
      if (name === 'Active Clients') entry.activeClients = val;
      if (name === 'Hires') entry.hires = val;
    });
    return Array.from(entriesMap.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [rawData]);

  // 6. Sectors for Tabs
  const sectors = useMemo(() => {
    // Determine which sectors have KPIs that are visible to this user
    let allowedDefs = kpiDefinitions;

    // If a specific client is selected, we only want to show tabs where the client is active
    // But since the KPI itself defines if it's placement/prospect/rar, we can just show what exists.
    const s = Array.from(new Set(allowedDefs.map((d: any) => d.sector)));
    return s.sort((a, b) => {
      if (a === 'Overview') return -1;
      if (b === 'Overview') return 1;
      return a.localeCompare(b);
    });
  }, [kpiDefinitions]);

  // Period date range for Job Costs
  const periodStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(selectedPeriod));
    return d.toISOString().split('T')[0];
  }, [selectedPeriod]);

  const periodEndDate = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Job Costs Analytics — filtered by selected period
  const [totalReceipts, totalPayments, balance] = useMemo(() => {
    let r = 0;
    let p = 0;
    jobReceipts?.forEach(rc => {
      if (selectedClient !== 'all' && rc.client_id !== selectedClient) return;
      const d = rc.received_date || '';
      if (d < periodStartDate || d > periodEndDate) return;
      r += Number(rc.amount_received || 0);
    });
    jobPayments?.forEach(pm => {
      if (selectedClient !== 'all' && pm.client_id !== selectedClient) return;
      const d = pm.payment_date || '';
      if (d < periodStartDate || d > periodEndDate) return;
      p += Number(pm.amount || 0);
    });

    return [r, p, r - p];
  }, [jobReceipts, jobPayments, selectedClient, periodStartDate, periodEndDate]);

  const jobCostsEvolutionData = useMemo(() => {
    const map = new Map<string, any>();

    // Group payments by month
    jobPayments?.forEach(pm => {
      if (selectedClient !== 'all' && pm.client_id !== selectedClient) return;
      const date = pm.payment_date?.substring(0, 7) || 'Unknown'; // YYYY-MM
      if (!map.has(date)) map.set(date, { date, Receipts: 0, Payments: 0 });
      map.get(date)!.Payments += Number(pm.amount || 0);
    });

    // Group receipts by month
    jobReceipts?.forEach(rc => {
      if (selectedClient !== 'all' && rc.client_id !== selectedClient) return;
      const date = rc.received_date?.substring(0, 7) || 'Unknown'; // YYYY-MM
      if (!map.has(date)) map.set(date, { date, Receipts: 0, Payments: 0 });
      map.get(date)!.Receipts += Number(rc.amount_received || 0);
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [jobReceipts, jobPayments, selectedClient]);

  const clientKPIsData = useMemo(() => {
    if (selectedClient === 'all') return null;

    // We only care about the RAR stats for this client
    const rStats = stats['RAR'] || {};

    return {
      hires: rStats['Hires'] || 0,
      candidatesSent: rStats['Candidates Sent'] || 0,
      candidatesApproved: rStats['Candidates Approved'] || 0,
      interviewsScheduled: rStats['Interviews Scheduled'] || 0,
      interviewsCompleted: rStats['Interviews Completed'] || 0,
      cancellations: rStats['Cancellations'] || 0,
      noShows: rStats['No Shows'] || 0,
      notSelected: rStats['Not Selected'] || 0,
      indeedCost: totalPayments, // using total payments filtered by client as 'Indeed Cost' for now
      // Job status would need more complex logic, left as placeholder or simplified
      openReqs: rStats['Open Job Reqs'] || 0,
    };
  }, [stats, selectedClient, totalPayments]);

  const jobCostsBreakdown = useMemo(() => {
    const map = new Map<string, any>();
    const pStart = periodStartDate.substring(0, 7);
    const pEnd = periodEndDate.substring(0, 7);

    employeeExpenses?.forEach(ep => {
      const monthStr = ep.month_date?.substring(0, 7);
      if (!monthStr) return;
      if (monthStr < pStart || monthStr > pEnd) return;
      if (!map.has(monthStr)) map.set(monthStr, { month: monthStr, employeeCosts: 0, opsCosts: 0, openJobs: 0 });
      map.get(monthStr)!.employeeCosts += Number(ep.total_amount || 0);
    });

    jobPayments?.forEach(pm => {
      if (selectedClient !== 'all' && pm.client_id !== selectedClient) return;
      const monthStr = pm.payment_date?.substring(0, 7);
      if (!monthStr) return;
      if (monthStr < pStart || monthStr > pEnd) return;
      if (!map.has(monthStr)) map.set(monthStr, { month: monthStr, employeeCosts: 0, opsCosts: 0, openJobs: 0 });
      map.get(monthStr)!.opsCosts += Number(pm.amount || 0);
    });

    const sortedMonths = Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));

    sortedMonths.forEach(row => {
      let activeCount = 0;
      jobs?.forEach(job => {
        if (selectedClient !== 'all' && job.client_id !== selectedClient) return;
        const jobMonth = job.job_date?.substring(0, 7) || job.start_date?.substring(0, 7);
        const endMonth = job.end_date?.substring(0, 7) || '9999-99';
        if (jobMonth && jobMonth <= row.month && endMonth >= row.month) {
          activeCount++;
        }
      });
      row.openJobs = activeCount;
      row.totalCost = row.employeeCosts + row.opsCosts;
      row.costPerJob = activeCount > 0 ? row.totalCost / activeCount : row.totalCost;

      // FIX: Ensure valid date parsing for 'YYYY-MM' strings
      const [year, month] = row.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      row.monthLabel = format(date, 'MMM yyyy');
    });

    return sortedMonths;
  }, [employeeExpenses, jobPayments, jobs, selectedClient, periodStartDate, periodEndDate]);

  const periodLabel = useMemo(() => {
    const days = parseInt(selectedPeriod);
    if (days <= 30) return 'Last 30 Days';
    if (days <= 60) return 'Last 60 Days';
    if (days <= 180) return 'Last 180 Days';
    return `Last ${days} Days`;
  }, [selectedPeriod]);

  const [totalCostPeriod, avgCostPerJobPeriod, avgOpenJobsPeriod] = useMemo(() => {
    if (!jobCostsBreakdown.length) return [0, 0, 0];
    const total = jobCostsBreakdown.reduce((sum, row) => sum + row.totalCost, 0);
    const costPerJob = jobCostsBreakdown.reduce((sum, row) => sum + row.costPerJob, 0) / jobCostsBreakdown.length;
    const openJobs = Math.round(jobCostsBreakdown.reduce((sum, row) => sum + row.openJobs, 0) / jobCostsBreakdown.length);
    return [total, costPerJob, openJobs];
  }, [jobCostsBreakdown]);

  const jobCostAllocationData = useMemo(() => {
    const allocation: any[] = [];
    jobs?.forEach(job => {
      if (selectedClient !== 'all' && job.client_id !== selectedClient) return;

      const jobStart = job.job_date?.substring(0, 7) || job.start_date?.substring(0, 7);
      const jobEnd = job.end_date?.substring(0, 7) || '9999-99';
      if (!jobStart) return;

      let totalAllocatedCost = 0;
      let activeInPeriod = false;

      jobCostsBreakdown.forEach(monthData => {
        if (jobStart <= monthData.month && jobEnd >= monthData.month) {
          totalAllocatedCost += monthData.costPerJob;
          activeInPeriod = true;
        }
      });

      if (activeInPeriod && totalAllocatedCost > 0) {
        allocation.push({
          date: job.job_date || job.start_date,
          jobName: job.job_title,
          allocatedCost: totalAllocatedCost
        });
      }
    });
    return allocation.sort((a, b) => b.allocatedCost - a.allocatedCost);
  }, [jobs, jobCostsBreakdown, selectedClient]);

  const clientOverviewData = useMemo(() => {
    if (selectedClient !== 'all') return [];

    const overview: any[] = [];
    activeClients.forEach(client => {
      const cStats: Record<string, number> = {
        'Hires': 0, 'Candidates Sent': 0, 'Candidates Approved': 0,
        'Interviews Scheduled': 0, 'Interviews Completed': 0,
        'Cancellations': 0, 'No Shows': 0, 'Not Selected': 0
      };

      let indeedCost = 0;
      jobPayments?.forEach(pm => {
        if (pm.client_id === client.id) indeedCost += Number(pm.amount || 0);
      });

      let hasData = indeedCost > 0;

      rawData.forEach((row: any) => {
        if (row.client_id === client.id) {
          const name = row.kpis?.name;
          if (cStats[name] !== undefined) {
            cStats[name] += Number(row.value || 0);
            hasData = true;
          }
        }
      });

      let openJobsCount = 0;
      jobs?.forEach(job => {
        if (job.client_id === client.id && (!job.end_date || job.end_date > new Date().toISOString().split('T')[0])) {
          openJobsCount++;
          hasData = true;
        }
      });

      if (hasData || client.is_active) {
        overview.push({
          clientId: client.id,
          clientName: client.name,
          ...cStats,
          indeedCost,
          jobAdOpen: openJobsCount > 0 ? 'ACTIVE' : 'CLOSED'
        });
      }
    });

    return overview.sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [selectedClient, activeClients, rawData, jobPayments, jobs]);

  const [selectedClientKPIChart, setSelectedClientKPIChart] = useState<string>('Hires');


  if (isLoadingDefs || isLoadingData) {
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
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Performance Dashboard
          </h1>
          <FilterBar
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            selectedUser={selectedUser}
            onUserChange={setSelectedUser}
            selectedClient={selectedClient}
            onClientChange={setSelectedClient}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            showUserFilter={isAdmin}
            users={dashboardUsers || []}
            clients={activeClients}
          />
        </div>

        <div className="w-full">
          <div className="flex flex-wrap h-auto gap-2 justify-start mb-8 p-0">
            <Link
              to="/dashboard/overview"
              className={cn(
                'px-6 py-2 rounded-full border shadow-sm text-sm font-medium transition-colors',
                section === 'overview'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border bg-card hover:bg-accent'
              )}
            >
              Overview
            </Link>
            {sectors.map(sector => sector !== 'Overview' && (
              <Link
                key={sector}
                to={`/dashboard/${sector.toLowerCase()}`}
                className={cn(
                  'px-6 py-2 rounded-full border shadow-sm text-sm font-medium transition-colors',
                  section === sector.toLowerCase()
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-card hover:bg-accent'
                )}
              >
                {sector}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/dashboard/job-costs"
                className={cn(
                  'px-6 py-2 rounded-full border shadow-sm text-sm font-medium transition-colors',
                  section === 'job-costs'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-card hover:bg-accent'
                )}
              >
                Job Costs
              </Link>
            )}
          </div>

          {section === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats['Prospecting']?.['Calls'] !== undefined && (
                  <KPICard title="Total Calls (Prospecting)" value={stats['Prospecting']['Calls'].toLocaleString()} icon={<Phone className="h-5 w-5" />} />
                )}
                {stats['RAR']?.['Hires'] !== undefined && (
                  <KPICard title="Hires (RAR)" value={stats['RAR']['Hires'].toLocaleString()} icon={<UserPlus className="h-5 w-5" />} />
                )}
                {stats['Placement']?.['Completed Meetings'] !== undefined && (
                  <KPICard title="Completed Mtgs (Placement)" value={stats['Placement']['Completed Meetings'].toLocaleString()} icon={<CheckCircle className="h-5 w-5" />} />
                )}
                {stats['RAR']?.['Active Clients'] !== undefined && (
                  <KPICard title="Active Clients (RAR)" value={stats['RAR']['Active Clients'].toLocaleString()} icon={<Briefcase className="h-5 w-5" />} />
                )}
              </div>

              <div className="h-[400px]">
                <KPIChart
                  title="Activity Overview"
                  data={chartData}
                  series={[
                    { key: 'Calls', name: 'Calls', color: 'hsl(var(--chart-1))' },
                    { key: 'Hires', name: 'Hires', color: 'hsl(var(--chart-2))' },
                    { key: 'Completed Meetings', name: 'Completed', color: 'hsl(var(--chart-3))' }
                  ].filter(s => kpiDefinitions.some((d: any) => d.name === s.key))}
                />
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <RecentEntries entries={recentEntries} showUser={isAdmin || selectedUser === 'all'} />
              </div>
            </div>
          )}

          {sectors.map(sector => sector !== 'Overview' && section === sector.toLowerCase() && (
            <div key={sector} className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {Object.keys(stats[sector] || {}).filter(name => isCardVisible(sector, name)).length} of {Object.keys(stats[sector] || {}).length} indicators visible
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border bg-card hover:bg-accent transition-colors">
                      <SlidersHorizontal className="h-4 w-4" />
                      Customize Cards
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 max-h-80 overflow-y-auto" align="end">
                    <div className="space-y-1">
                      <p className="text-sm font-medium mb-2">Show/Hide Indicators</p>
                      {Object.keys(stats[sector] || {}).map(name => (
                        <label key={name} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-accent cursor-pointer text-sm">
                          <Checkbox
                            checked={isCardVisible(sector, name)}
                            onCheckedChange={() => toggleCardVisibility(sector, name)}
                          />
                          {name}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Object.entries(stats[sector] || {}).filter(([name]) => isCardVisible(sector, name)).map(([name, value]) => (
                  <KPICard
                    key={name}
                    title={name}
                    value={value.toLocaleString()}
                    icon={getIconForKPI(name)}
                  />
                ))}
              </div>

              <div className="bg-card rounded-xl border p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">{sector} Trends</h4>
                  <select
                    className="bg-background border rounded px-3 py-1 text-sm"
                    value={selectedChartKPI[sector] || 'all'}
                    onChange={(e) => setSelectedChartKPI({ ...selectedChartKPI, [sector]: e.target.value })}
                  >
                    <option value="all">Compare All</option>
                    {Object.keys(stats[sector] || {}).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="h-[400px]">
                  <KPIChart
                    title=""
                    data={chartData}
                    series={Object.keys(stats[sector] || {})
                      .filter(name => selectedChartKPI[sector] === 'all' || selectedChartKPI[sector] === name || !selectedChartKPI[sector])
                      .map((name, idx) => ({
                        key: name,
                        name: name,
                        color: `hsl(var(--chart-${(idx % 5) + 1}))`
                      }))}
                  />
                </div>
              </div>
            </div>
          ))}

          {isAdmin && section === 'job-costs' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title={`Total Cost (${periodLabel})`}
                  value={`$${totalCostPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  icon={<DollarSign className="h-5 w-5" />}
                />
                <KPICard
                  title={`Avg Cost Per Job (${periodLabel})`}
                  value={`$${avgCostPerJobPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  icon={<Briefcase className="h-5 w-5" />}
                />
                <KPICard title="Receipts" value={`$${totalReceipts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<TrendingUp className="h-4 w-4" />} />
                <KPICard title="Payments" value={`$${totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<TrendingUp className="h-4 w-4" />} />
              </div>

              {selectedClient !== 'all' && clientKPIsData && (
                <div className="space-y-6 animate-fade-in border-t pt-6">
                  <h3 className="text-xl font-semibold">Client Specific KPIs (RAR)</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <KPICard title="Hires" value={clientKPIsData.hires} icon={<UserPlus className="h-4 w-4" />} />
                    <KPICard title="Cand. Sent" value={clientKPIsData.candidatesSent} icon={<FileText className="h-4 w-4" />} />
                    <KPICard title="Cand. Approved" value={clientKPIsData.candidatesApproved} icon={<CheckCircle className="h-4 w-4" />} />
                    <KPICard title="Mtg Scheduled" value={clientKPIsData.interviewsScheduled} icon={<Calendar className="h-4 w-4" />} />
                    <KPICard title="Mtg Completed" value={clientKPIsData.interviewsCompleted} icon={<CheckCircle className="h-4 w-4" />} />
                    <KPICard title="Cancellations" value={clientKPIsData.cancellations} icon={<Activity className="h-4 w-4" />} />
                    <KPICard title="No Shows" value={clientKPIsData.noShows} icon={<Users className="h-4 w-4" />} />
                    <KPICard title="Not Selected" value={clientKPIsData.notSelected} icon={<Activity className="h-4 w-4" />} />
                    <KPICard title="Indeed Cost" value={`$${clientKPIsData.indeedCost.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} />
                    <KPICard title="Open Reqs" value={clientKPIsData.openReqs} icon={<Briefcase className="h-4 w-4" />} />
                  </div>

                  <div className="bg-card rounded-xl border p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">KPI Trend</h4>
                      <select
                        className="bg-background border rounded px-3 py-1 text-sm"
                        value={selectedClientKPIChart}
                        onChange={(e) => setSelectedClientKPIChart(e.target.value)}
                      >
                        <option value="Hires">Hires</option>
                        <option value="Candidates Sent">Candidates Sent</option>
                        <option value="Candidates Approved">Candidates Approved</option>
                        <option value="Interviews Scheduled">Interviews Scheduled</option>
                        <option value="Interviews Completed">Interviews Completed</option>
                        <option value="Cancellations">Cancellations</option>
                        <option value="No Shows">No Shows</option>
                        <option value="Not Selected">Not Selected</option>
                      </select>
                    </div>
                    <div className="h-[300px]">
                      <KPIChart
                        title=""
                        data={chartData}
                        series={[{ key: selectedClientKPIChart, name: selectedClientKPIChart, color: 'hsl(var(--chart-3))' }]}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[400px]">
                  <KPIChart
                    title="Monthly Cost Evolution"
                    data={jobCostsBreakdown.map(d => ({ ...d, dateFormatted: d.monthLabel }))}
                    currencyFormat
                    series={[
                      { key: 'employeeCosts', name: 'Employee Costs', color: 'hsl(var(--chart-1))' },
                      { key: 'opsCosts', name: 'Job Operational Costs', color: 'hsl(var(--chart-2))' }
                    ]}
                  />
                </div>
                <div className="h-[400px]">
                  <KPIChart
                    title="Cost Per Job Trend"
                    data={jobCostsBreakdown.map(d => ({ ...d, dateFormatted: d.monthLabel }))}
                    currencyFormat
                    series={[
                      { key: 'costPerJob', name: 'Cost Per Job', color: 'hsl(var(--chart-3))' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="text-xl font-semibold mb-4">Detailed Breakdown</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Employee Costs</TableHead>
                          <TableHead className="text-right">Job Ops Costs</TableHead>
                          <TableHead className="text-right font-medium">Total Cost</TableHead>
                          <TableHead className="text-right">Open Jobs</TableHead>
                          <TableHead className="text-right text-green-600 font-medium">Cost / Job</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobCostsBreakdown.map(row => (
                          <TableRow key={row.month}>
                            <TableCell>{row.monthLabel}</TableCell>
                            <TableCell className="text-right">${row.employeeCosts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">${row.opsCosts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right font-medium">${row.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">{row.openJobs}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">${row.costPerJob.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="bg-card rounded-xl border p-4">
                  <h3 className="text-xl font-semibold mb-4">Job Cost Allocation</h3>
                  <div className="overflow-x-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Job Name</TableHead>
                          <TableHead className="text-right">Allocated Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobCostAllocationData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.date ? format(new Date(row.date), 'dd/MM/yyyy') : '-'}</TableCell>
                            <TableCell>{row.jobName || 'General'}</TableCell>
                            <TableCell className="text-right">${row.allocatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {selectedClient === 'all' && (
                <div className="bg-card rounded-xl border p-4">
                  <h3 className="text-xl font-semibold mb-4">Client Overview</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-center"># Hires</TableHead>
                          <TableHead className="text-center"># Cand. Sent</TableHead>
                          <TableHead className="text-center"># Cand. Approved</TableHead>
                          <TableHead className="text-center"># Int. Sched.</TableHead>
                          <TableHead className="text-center"># Int. Comp.</TableHead>
                          <TableHead className="text-center">Cancellations</TableHead>
                          <TableHead className="text-center"># NO SHOWS</TableHead>
                          <TableHead className="text-center"># Not Selected</TableHead>
                          <TableHead className="text-right">Indeed Cost</TableHead>
                          <TableHead className="text-center">JOB AD</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientOverviewData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium truncate max-w-[200px]">{row.clientName}</TableCell>
                            <TableCell className="text-center">{row['Hires'] || 0}</TableCell>
                            <TableCell className="text-center">{row['Candidates Sent'] || 0}</TableCell>
                            <TableCell className="text-center">{row['Candidates Approved'] || 0}</TableCell>
                            <TableCell className="text-center">{row['Interviews Scheduled'] || 0}</TableCell>
                            <TableCell className="text-center">{row['Interviews Completed'] || 0}</TableCell>
                            <TableCell className="text-center">{row['Cancellations'] || 0}</TableCell>
                            <TableCell className="text-center">{row['No Shows'] || 0}</TableCell>
                            <TableCell className="text-center">{row['Not Selected'] || 0}</TableCell>
                            <TableCell className="text-right">${row.indeedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-center">
                              {row.jobAdOpen === 'ACTIVE' ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-[10px] font-bold">ACTIVE</span> : <span className="bg-slate-200 text-slate-800 px-2 py-1 rounded text-[10px] font-bold">CLOSED</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="bg-card rounded-xl border p-4">
                <h3 className="text-xl font-semibold mb-4">Job Receipts</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Received Date</TableHead>
                        <TableHead className="text-right">Due</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-center">Follow-up</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobReceipts?.filter(r => selectedClient === 'all' || r.client_id === selectedClient).map(receipt => (
                        <TableRow key={receipt.id}>
                          <TableCell>{receipt.clients?.name}</TableCell>
                          <TableCell>{receipt.jobs?.job_title || 'General'}</TableCell>
                          <TableCell className="capitalize">{receipt.payment_status}</TableCell>
                          <TableCell>{receipt.received_date ? format(new Date(receipt.received_date), 'MMM do, yyyy') : '-'}</TableCell>
                          <TableCell className="text-right font-medium text-amber-600">${Number(receipt.amount_due).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">${Number(receipt.amount_received).toFixed(2)}</TableCell>
                          <TableCell className="text-right">${Number(receipt.outstanding_balance).toFixed(2)}</TableCell>
                          <TableCell className="text-center">{receipt.follow_up_required ? '⚠️ Yes' : 'No'}</TableCell>
                          <TableCell className="truncate max-w-[200px]">{receipt.notes}</TableCell>
                        </TableRow>
                      ))}
                      {jobReceipts?.filter(r => selectedClient === 'all' || r.client_id === selectedClient).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">No receipts recorded.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
