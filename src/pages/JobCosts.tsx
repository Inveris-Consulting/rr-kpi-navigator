import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CostOverview from '@/components/costs/CostOverview';
import EmployeeHoursAdjustment from '@/components/costs/EmployeeHoursAdjustment';
import MainLayout from '@/components/layout/MainLayout';

// Type for Adjusted Hours: { [month_yyyy-mm-01]: { [userId]: hours } }
export type AdjustedHoursMap = Record<string, Record<string, number>>;

const JobCosts = () => {
    // Ephemeral state for adjustments
    const [adjustedHours, setAdjustedHours] = useState<AdjustedHoursMap>({});

    return (
        <MainLayout>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Job Costs</h2>
                    <p className="text-muted-foreground">
                        Manage costs, employee allocations, and job profitability.
                    </p>
                </div>

                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="hours">Employee Hours</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <CostOverview adjustedHours={adjustedHours} />
                    </TabsContent>

                    <TabsContent value="hours" className="space-y-4">
                        <EmployeeHoursAdjustment
                            adjustedHours={adjustedHours}
                            setAdjustedHours={setAdjustedHours}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </MainLayout>
    );
};

export default JobCosts;
