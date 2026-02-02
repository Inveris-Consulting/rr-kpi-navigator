// Mock data for the KPI system - will be replaced with Supabase data

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
}

export interface KPIEntry {
  id: string;
  userId: string;
  date: string;
  callsMade: number;
  meetingsSet: number;
  meetingsCompleted: number;
  closes: number;
  openRequisitions: number;
  reqCloseRate: number;
  vipList: number;
  createdAt: string;
}

export const users: User[] = [
  { id: '1', name: 'Amber Suarez', role: 'user' },
  { id: '2', name: 'Janet Dickinson', role: 'user' },
  { id: '3', name: 'Admin', role: 'admin' },
];

// Generate mock KPI data for the last 180 days
const generateMockData = (): KPIEntry[] => {
  const entries: KPIEntry[] = [];
  const today = new Date();

  for (let i = 0; i < 180; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Skip weekends for more realistic data
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Generate data for both users
    ['1', '2'].forEach(userId => {
      const callsMade = Math.floor(Math.random() * 30) + 15;
      const meetingsSet = Math.floor(Math.random() * 8) + 2;
      const meetingsCompleted = Math.floor(meetingsSet * (0.6 + Math.random() * 0.3));
      const closes = Math.floor(meetingsCompleted * (0.2 + Math.random() * 0.3));
      const openRequisitions = Math.floor(Math.random() * 15) + 5;
      const reqCloseRate = parseFloat((closes / (openRequisitions || 1) * 100).toFixed(1));
      const pcl = parseFloat((closes / (callsMade || 1) * 100).toFixed(2));

      entries.push({
        id: `${userId}-${dateStr}`,
        userId,
        date: dateStr,
        callsMade,
        meetingsSet,
        meetingsCompleted,
        closes,
        openRequisitions,
        reqCloseRate,
        pcl,
        createdAt: date.toISOString(),
      });
    });
  }

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const kpiEntries = generateMockData();

export const getKPIsByUser = (userId: string) =>
  kpiEntries.filter(entry => entry.userId === userId);

export const getKPIsByDateRange = (startDate: Date, endDate: Date, userId?: string) => {
  return kpiEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    const inRange = entryDate >= startDate && entryDate <= endDate;
    if (userId) return inRange && entry.userId === userId;
    return inRange;
  });
};

export const getRecentEntries = (limit: number = 10, userId?: string) => {
  const filtered = userId ? kpiEntries.filter(e => e.userId === userId) : kpiEntries;
  return filtered.slice(0, limit);
};

export const aggregateKPIs = (entries: KPIEntry[]) => {
  if (entries.length === 0) return null;

  return {
    totalCalls: entries.reduce((sum, e) => sum + e.callsMade, 0),
    totalMeetingsSet: entries.reduce((sum, e) => sum + e.meetingsSet, 0),
    totalMeetingsCompleted: entries.reduce((sum, e) => sum + e.meetingsCompleted, 0),
    totalCloses: entries.reduce((sum, e) => sum + e.closes, 0),
    avgOpenRequisitions: Math.round(entries.reduce((sum, e) => sum + e.openRequisitions, 0) / entries.length),
    avgReqCloseRate: parseFloat((entries.reduce((sum, e) => sum + e.reqCloseRate, 0) / entries.length).toFixed(1)),
    avgPCL: parseFloat((entries.reduce((sum, e) => sum + e.pcl, 0) / entries.length).toFixed(2)),
  };
};

export const getChartData = (entries: KPIEntry[], groupBy: 'day' | 'week' | 'month' = 'day') => {
  if (groupBy === 'day') {
    return entries.map(e => ({
      date: e.date,
      calls: e.callsMade,
      meetings: e.meetingsSet,
      completed: e.meetingsCompleted,
      closes: e.closes,
    })).reverse();
  }

  // Group by week or month
  const groups = new Map<string, KPIEntry[]>();

  entries.forEach(entry => {
    const date = new Date(entry.date);
    let key: string;

    if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  });

  return Array.from(groups.entries()).map(([date, groupEntries]) => ({
    date,
    calls: groupEntries.reduce((sum, e) => sum + e.callsMade, 0),
    meetings: groupEntries.reduce((sum, e) => sum + e.meetingsSet, 0),
    completed: groupEntries.reduce((sum, e) => sum + e.meetingsCompleted, 0),
    closes: groupEntries.reduce((sum, e) => sum + e.closes, 0),
  })).reverse();
};
