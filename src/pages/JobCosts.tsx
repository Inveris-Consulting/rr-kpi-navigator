import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MainLayout from '@/components/layout/MainLayout';
import OperationalJobs from '@/components/costs/OperationalJobs';
import OperationalReceipts from '@/components/costs/OperationalReceipts';
import OperationalPayments from '@/components/costs/OperationalPayments';
import OperationalEmployees from '@/components/costs/OperationalEmployees';
import OperationalClients from '@/components/costs/OperationalClients';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/hooks/useOperationalCosts';

const JobCosts = () => {
    const [selectedClient, setSelectedClient] = useState<string>('all');
    const { data: clients } = useClients();

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Job Costs Operations</h2>
                        <p className="text-muted-foreground">
                            Manage clients, jobs, receipts, payments, and allocate employee costs.
                        </p>
                    </div>
                    <div className="w-64">
                        <Select value={selectedClient} onValueChange={setSelectedClient}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by Client" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Clients</SelectItem>
                                {clients?.filter(c => c.is_active).map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Tabs defaultValue="jobs" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="clients">Clients</TabsTrigger>
                        <TabsTrigger value="jobs">Jobs</TabsTrigger>
                        <TabsTrigger value="receipts">Customer Receipts</TabsTrigger>
                        <TabsTrigger value="payments">Platform Payments</TabsTrigger>
                        <TabsTrigger value="employees">Employee Allocation</TabsTrigger>
                    </TabsList>

                    <TabsContent value="clients" className="space-y-4 bg-card p-6 rounded-xl border">
                        <OperationalClients />
                    </TabsContent>

                    <TabsContent value="jobs" className="space-y-4 bg-card p-6 rounded-xl border">
                        <OperationalJobs clientFilter={selectedClient} />
                    </TabsContent>

                    <TabsContent value="receipts" className="space-y-4 bg-card p-6 rounded-xl border">
                        <OperationalReceipts clientFilter={selectedClient} />
                    </TabsContent>

                    <TabsContent value="payments" className="space-y-4 bg-card p-6 rounded-xl border">
                        <OperationalPayments clientFilter={selectedClient} />
                    </TabsContent>

                    <TabsContent value="employees" className="space-y-4 bg-card p-6 rounded-xl border">
                        <OperationalEmployees />
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
};

export default JobCosts;
