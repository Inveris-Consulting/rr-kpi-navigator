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
  Briefcase,
  TrendingUp,
  Star,
  UserPlus,
  FileText,
  Users,
  Activity
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const { user, isAdmin } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedUser, setSelectedUser] = useState(isAdmin ? 'all' : user?.id || '');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  // 1. Fetch KPI Definitions (What metrics exist?)
  // Admin -> All. User -> All (we filter by user_kpis later if needed, but actually simple user only needs to see what they are assigned. 
  // However, for simplified logic, let's fetch what the VIEWER is allowed to see.
  const { data: kpiDefinitions = [], isLoading: isLoadingDefs } = useQuery({
    queryKey: ['kpiDefs', user?.id, isAdmin, selectedUser],
    queryFn: async () => {
      if (isAdmin) {
        // Admin sees ALL KPIs provided in the system
        const { data, error } = await supabase.from('kpis').select('*');
        if (error) throw error;
        return data || [];
      } else {
        // User sees only assigned KPIs
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
    queryKey: ['kpiEntries', selectedPeriod, selectedUser],
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

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // 3. Compute Stats Dynamically
  // Structure: { [SectorName]: { [KpiName]: { total: number, count: number, isStock: boolean } } }
  const stats = useMemo(() => {
    const acc: Record<string, Record<string, number>> = {};

    // Initialize with 0 for all definitions to ensure all cards show up even if no data
    kpiDefinitions.forEach((def: any) => {
      if (!acc[def.sector]) acc[def.sector] = {};
      acc[def.sector][def.name] = 0;
    });

    rawData.forEach((row: any) => {
      const name = row.kpis?.name;
      const sector = row.kpis?.sector;
      const val = Number(row.value || 0);

      if (!name || !sector) return;

      // Ensure structure exists (in case rawData has something not in definitions, rare but possible)
      if (!acc[sector]) acc[sector] = {};
      if (acc[sector][name] === undefined) acc[sector][name] = 0;

      acc[sector][name] += val;
    });

    return acc;
  }, [rawData, kpiDefinitions]);

  // 4. Chart Data
  const chartData = useMemo(() => {
    const map = new Map();
    rawData.forEach((row: any) => {
      const date = row.date;
      if (!map.has(date)) {
        map.set(date, { date }); // dynamically add keys
      }
      const node = map.get(date);
      const name = row.kpis?.name;
      const val = Number(row.value || 0);

      // For charts, we usually sum (except stock, but sum of stock daily is stock daily if 1 entry, or sum across users)
      // For simplicity in trending, Sum is usually fine unless it's strictly a "status" aimed at single user.
      // If viewing "All Users", Sum of "Open Reqs" might mean "Total Open Reqs agency-wide", which is correct.
      node[name] = (node[name] || 0) + val;
    });
    return Array.from(map.values()).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [rawData]);

  // 5. Recent Entries Synthesis
  const recentEntries = useMemo(() => {
    // ... same as before ...
    const entriesMap = new Map();
    rawData.forEach((row: any) => {
      const key = `${row.date}_${row.user_id}`;
      if (!entriesMap.has(key)) {
        entriesMap.set(key, {
          id: key,
          userId: row.user_id,
          date: row.date,
          // We can't easily map dynamic keys to the fixed RecentEntries columns without a map.
          // RecentEntries component expects specific props: callsMade, meetingsSet, etc.
          // We'll do a best-effort mapping for standard ones.
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
    // Get unique sectors from definitions
    const s = Array.from(new Set(kpiDefinitions.map((d: any) => d.sector)));
    // Sort logic if needed? Overview first.
    return s.sort((a, b) => {
      if (a === 'Overview') return -1;
      if (b === 'Overview') return 1;
      return a.localeCompare(b);
    });
  }, [kpiDefinitions]);

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
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            showUserFilter={isAdmin}
          />
        </div>

        <Tabs defaultValue="Overview" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent justify-start mb-8 p-0">
            {/* Always show Overview */}
            <TabsTrigger
              value="Overview"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2 rounded-full border border-border bg-card shadow-sm"
            >
              Overview
            </TabsTrigger>
            {sectors.map(sector => (
              <TabsTrigger
                key={sector}
                value={sector}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2 rounded-full border border-border bg-card shadow-sm"
              >
                {sector}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="Overview" className="space-y-6 animate-fade-in">
            {/* Highlight Cards - Top metrics from each sector? Or just a summary? 
                  Let's show a few key ones. Hires, Calls, Meetings. 
              */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Try to find these specific keys in stats */}
              {stats['Prospecting']?.['Calls'] !== undefined && (
                <KPICard title="Total Calls" value={stats['Prospecting']['Calls'].toLocaleString()} icon={<Phone className="h-5 w-5" />} />
              )}
              {stats['RAR']?.['Hires'] !== undefined && (
                <KPICard title="Hires" value={stats['RAR']['Hires'].toLocaleString()} icon={<UserPlus className="h-5 w-5" />} />
              )}
              {stats['Placement']?.['Completed Meetings'] !== undefined && (
                <KPICard title="Completed Mtgs" value={stats['Placement']['Completed Meetings'].toLocaleString()} icon={<CheckCircle className="h-5 w-5" />} />
              )}
              {stats['RAR']?.['Active Clients'] !== undefined && (
                <KPICard title="Active Clients" value={stats['RAR']['Active Clients'].toLocaleString()} icon={<Briefcase className="h-5 w-5" />} />
              )}
            </div>

            <div className="h-[400px]">
              {/* Generic Chart for Overview - Show Calls and Hires if available */}
              <KPIChart
                title="Activity Overview"
                data={chartData}
                series={[
                  { key: 'Calls', name: 'Calls', color: 'hsl(var(--chart-1))' },
                  { key: 'Hires', name: 'Hires', color: 'hsl(var(--chart-2))' },
                  { key: 'Completed Meetings', name: 'Completed', color: 'hsl(var(--chart-3))' }
                ].filter(s => {
                  // Only include series if data exists in at least one point? Or always show?
                  // Better to show if user has access (i.e., definition exists)
                  return kpiDefinitions.some((d: any) => d.name === s.key);
                })}
              />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <RecentEntries entries={recentEntries} showUser={isAdmin || selectedUser === 'all'} />
            </div>
          </TabsContent>

          {sectors.map(sector => (
            <TabsContent key={sector} value={sector} className="space-y-6 animate-fade-in">
              {/* Dynamic Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Object.entries(stats[sector] || {}).map(([name, value]) => (
                  <KPICard
                    key={name}
                    title={name}
                    value={value.toLocaleString()}
                    icon={getIconForKPI(name)}
                  />
                ))}
              </div>

              {/* Dynamic Chart - Plot all metrics for this sector? Or just top ones?
                       If there are many metrics, checking all lines might be messy.
                       Let's plot them all but maybe use different colors automatically? 
                       Or separate into 2 charts if too many?
                       For now, let's plot all numeric metrics in one chart.
                   */}
              <div className="h-[400px]">
                <KPIChart
                  title={`${sector} Trends`}
                  data={chartData}
                  series={Object.keys(stats[sector] || {}).map((name, idx) => ({
                    key: name,
                    name: name,
                    color: `hsl(var(--chart-${(idx % 5) + 1}))`
                  }))}
                />
              </div>
            </TabsContent>
          ))}

        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
