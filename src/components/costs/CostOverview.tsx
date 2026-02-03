import React, { useState, useMemo } from 'react';
import { useJobs, useJobCosts, useEmployeesWithRates, Job } from '@/hooks/useCosts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isSameMonth, parseISO } from 'date-fns';
import { Loader2, DollarSign, Briefcase } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdjustedHoursMap } from '@/pages/JobCosts';

interface Props {
    adjustedHours: AdjustedHoursMap;
}

const CostOverview = ({ adjustedHours }: Props) => {
    const [timeRange, setTimeRange] = useState('6months');
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

    // Fetch all data
    const { data: jobs, isLoading: isJobsLoading } = useJobs();
    const { data: jobCosts, isLoading: isJobCostsLoading } = useJobCosts();
    const { data: employees, isLoading: isEmployeesLoading } = useEmployeesWithRates();

    const isLoading = isJobsLoading || isJobCostsLoading || isEmployeesLoading;
    const isError = !jobs || !jobCosts || !employees;

    const formattedData = useMemo(() => {
        if (!jobs || !jobCosts || !employees) return [];

        let startDate: Date;
        let endDate: Date;

        if (timeRange === 'custom') {
            const date = new Date(selectedMonth + '-01');
            startDate = startOfMonth(date);
            endDate = endOfMonth(date);
        } else {
            endDate = endOfMonth(new Date());
            startDate = startOfMonth(subMonths(new Date(), timeRange === '12months' ? 11 : 5));
        }

        const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });

        return monthsInterval.map(month => {
            const monthStr = format(month, 'yyyy-MM-01');
            const monthLabel = format(month, 'MMM yyyy');

            // 1. Calculate Employee Costs
            let totalEmployeeCost = 0;
            employees.forEach(emp => {
                const adjustments = adjustedHours[monthStr] || {};
                const hours = adjustments[emp.user_id] ?? 173.2;
                totalEmployeeCost += (hours * emp.hourly_rate);
            });

            // 2. Calculate Job Costs (Operational)
            let totalJobCosts = 0;
            jobCosts.filter(cost => isSameMonth(parseISO(cost.cost_date), month)).forEach(cost => {
                totalJobCosts += cost.amount;
            });

            // 3. Count Jobs for Month (Discrete, not cumulative)
            const openJobsCount = jobs.filter(job => {
                const jDateStr = job.job_date || (job as any).start_date;
                if (!jDateStr) return false;

                try {
                    const jDate = parseISO(jDateStr);
                    // User Request: "jobs with date for Nov/2025 should count only for that specific month"
                    // Meaning: Discrete counting, not cumulative active jobs.
                    return isSameMonth(jDate, month);
                } catch (e) {
                    console.error('Error parsing date for job:', job, e);
                    return false;
                }
            }).length;

            const totalCost = totalEmployeeCost + totalJobCosts;
            const costPerJob = openJobsCount > 0 ? totalCost / openJobsCount : 0;

            return {
                month_date: monthStr,
                month: monthLabel,
                total_employee_cost: totalEmployeeCost,
                total_job_costs: totalJobCosts,
                total_cost: totalCost,
                open_jobs_count: openJobsCount,
                cost_per_job: costPerJob
            };
        });

    }, [jobs, jobCosts, employees, timeRange, selectedMonth, adjustedHours]);

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    if (isError && !isLoading) {
        return <div className="p-8 text-center text-red-500">Error loading cost data. Please try refreshing.</div>;
    }

    const latestMonth = formattedData[formattedData.length - 1] || {
        total_cost: 0,
        cost_per_job: 0,
        open_jobs_count: 0
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-4 border rounded shadow-md text-sm">
                    <p className="font-bold mb-2">{label}</p>
                    <p className="text-blue-500">
                        Employee Costs: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.total_employee_cost)}
                    </p>
                    <p className="text-orange-500">
                        Job Operational Costs: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.total_job_costs)}
                    </p>
                    <p className="font-bold border-t mt-2 pt-2">
                        Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.total_cost)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                <h3 className="text-lg font-medium">Evolution</h3>
                <div className="flex gap-2">
                    {timeRange === 'custom' && (
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {eachMonthOfInterval({
                                    start: subMonths(new Date(), 24),
                                    end: new Date(new Date().getFullYear() + 1, 11, 31)
                                }).reverse().map(date => {
                                    const value = format(date, 'yyyy-MM');
                                    const label = format(date, 'MMMM yyyy'); // English default
                                    return (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    )}
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="6months">Last 6 Months</SelectItem>
                            <SelectItem value="12months">Last 12 Months</SelectItem>
                            <SelectItem value="custom">Specific Month</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost (Last Month)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(latestMonth.total_cost)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cost Per Job (Avg)</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(latestMonth.cost_per_job)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {latestMonth.open_jobs_count} open jobs
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Cost Evolution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={formattedData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value as number)}
                                />
                                <Legend />
                                <Bar dataKey="total_employee_cost" name="Employee Costs" stackId="a" fill="#3b82f6" />
                                <Bar dataKey="total_job_costs" name="Job Operational Costs" stackId="a" fill="#f59e0b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Cost Per Job Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={formattedData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value as number)}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="cost_per_job" name="Cost Per Job" stroke="#10b981" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detailed Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Month</TableHead>
                                <TableHead>Employee Costs</TableHead>
                                <TableHead>Job Operational Costs</TableHead>
                                <TableHead>Total Cost</TableHead>
                                <TableHead>Open Jobs</TableHead>
                                <TableHead>Cost Per Job</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {formattedData.map((row) => (
                                <TableRow key={row.month_date}>
                                    <TableCell>{row.month}</TableCell>
                                    <TableCell>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.total_employee_cost)}</TableCell>
                                    <TableCell>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.total_job_costs)}</TableCell>
                                    <TableCell className="font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.total_cost)}</TableCell>
                                    <TableCell>{row.open_jobs_count}</TableCell>
                                    <TableCell className="font-bold text-green-600">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.cost_per_job)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <JobAllocationTable costData={formattedData} />
        </div>
    );
};

const JobAllocationTable = ({ costData }: { costData: any[] }) => {
    const { data: jobs } = useJobs();

    // Calculate cost per job based on START DATE month
    const jobCosts = useMemo(() => {
        if (!jobs) return [];

        return jobs.map(job => {
            const jDateStr = job.job_date || (job as any).start_date;
            if (!jDateStr) return { ...job, totalAllocatedCost: 0 };

            try {
                const jStart = parseISO(jDateStr);

                // Find the month data corresponding to job start date
                const monthStat = costData.find(m => isSameMonth(parseISO(m.month_date), jStart));

                if (!monthStat) return { ...job, totalAllocatedCost: 0 };

                // "Jobs in the month" - definition: Jobs starting in that month?
                // Based on user request: "dividido pela quantidade de jobs no MÊS".
                // If we assume the table shows acquisition cost, we count jobs starting in that month.
                // However, costData.open_jobs_count currently counts ACTIVE jobs.
                // If the user wants strictly "started in month", we need to recount.
                // But typically "cost per job" metrics use the active pool.
                // Let's stick to the metric already calculated in formattedData for consistency: 'cost_per_job'
                // which is Total Cost / Open Jobs.
                // So we just assign that month's unit cost to this job.

                return {
                    ...job,
                    totalAllocatedCost: monthStat.cost_per_job
                };

            } catch (e) {
                console.error("Error parsing date", e);
                return { ...job, totalAllocatedCost: 0 };
            }
        })
            .filter(j => j.totalAllocatedCost > 0) // Filter out jobs outside the range
            .sort((a, b) => new Date(b.job_date).getTime() - new Date(a.job_date).getTime());
    }, [jobs, costData]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Job Cost Allocation</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Job Name</TableHead>
                            <TableHead>Allocated Cost</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {jobCosts.map((job) => (
                            <TableRow key={job.id}>
                                <TableCell>{format(parseISO(job.job_date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="font-medium">{job.job_title}</TableCell>
                                <TableCell>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(job.totalAllocatedCost)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default CostOverview;
