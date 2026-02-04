import React, { useState } from 'react';
import { useEmployeesWithRates, useUpdateEmployeeRate } from '@/hooks/useCosts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, eachMonthOfInterval, subMonths, isSameMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdjustedHoursMap } from '@/pages/JobCosts';

interface Props {
    adjustedHours: AdjustedHoursMap;
    setAdjustedHours: React.Dispatch<React.SetStateAction<AdjustedHoursMap>>;
}

const EmployeeHoursAdjustment = ({ adjustedHours, setAdjustedHours }: Props) => {
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM-01'));
    const { data: employees, isLoading } = useEmployeesWithRates();
    const updateRateMutation = useUpdateEmployeeRate();
    const [localRates, setLocalRates] = useState<Record<string, number>>({});

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = new Date(e.target.value + '-01');
        setSelectedMonth(format(date, 'yyyy-MM-01'));
    };

    const handleHourChange = (userId: string, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setAdjustedHours(prev => ({
                ...prev,
                [selectedMonth]: {
                    ...prev[selectedMonth],
                    [userId]: numValue
                }
            }));
        } else if (value === '') {
            // Handle empty input to allow clearing custom value
            setAdjustedHours(prev => {
                const newMonthState = { ...prev[selectedMonth] };
                delete newMonthState[userId];
                return { ...prev, [selectedMonth]: newMonthState };
            });
        }
    };

    const handleRateChange = (userId: string, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setLocalRates(prev => ({ ...prev, [userId]: numValue }));
        }
    };

    const handleSaveRate = async (userId: string) => {
        const rate = localRates[userId];
        if (rate === undefined) return;

        try {
            await updateRateMutation.mutateAsync({
                userId,
                rate
            });
            toast.success('Rate updated successfully');
            setLocalRates(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });
        } catch (error) {
            toast.error('Error updating rate');
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <label className="font-medium">Reference Month:</label>
                <Select
                    value={selectedMonth.substring(0, 7)}
                    onValueChange={(val) => {
                        const date = new Date(val + '-01');
                        setSelectedMonth(format(date, 'yyyy-MM-01'));
                    }}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {eachMonthOfInterval({
                            start: subMonths(new Date(), 24),
                            end: new Date(new Date().getFullYear() + 1, 11, 31)
                        }).reverse().filter(date => {
                            const monthStr = format(date, 'yyyy-MM-01');
                            // Show current month, or months with adjustments, or months implied to have data?
                            // For adjustments, showing months with existing adjustments makes sense.
                            // Also it's nice to be able to add adjustments for current/future months.
                            // Let's filter to: Current month, Last Month, or months with adjustments.
                            const hasAdjustments = adjustedHours && adjustedHours[monthStr] && Object.keys(adjustedHours[monthStr]).length > 0;
                            const isCurrentOrLastMonth = isSameMonth(date, new Date()) || isSameMonth(date, subMonths(new Date(), 1));
                            return hasAdjustments || isCurrentOrLastMonth;
                        }).map(date => {
                            const value = format(date, 'yyyy-MM');
                            const label = format(date, 'MMMM yyyy');
                            return (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead className="w-[200px]">Hourly Rate ($)</TableHead>
                            <TableHead className="w-[200px]">Worked Hours</TableHead>
                            <TableHead>Total Cost (Month)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {employees?.map((employee) => {
                            const monthAdjustments = adjustedHours[selectedMonth] || {};
                            const currentHours = monthAdjustments[employee.user_id] ?? 173.2; // Default 173.2
                            const currentRate = localRates[employee.user_id] ?? employee.hourly_rate;
                            const isRateModified = localRates[employee.user_id] !== undefined && localRates[employee.user_id] !== employee.hourly_rate;

                            return (
                                <TableRow key={employee.user_id}>
                                    <TableCell className="font-medium">{employee.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={currentRate}
                                                onChange={(e) => handleRateChange(employee.user_id, e.target.value)}
                                                className="w-24"
                                            />
                                            {isRateModified && (
                                                <Button size="sm" onClick={() => handleSaveRate(employee.user_id)}>
                                                    Save
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={currentHours}
                                            onChange={(e) => handleHourChange(employee.user_id, e.target.value)}
                                            className="w-24 border-dashed border-gray-400 focus:border-solid"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(currentRate * currentHours)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {employees?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                    No employees found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-sm text-muted-foreground">
                * Standard hours are 173.2 (40h/week). Edit the hours field to temporarily adjust this value for this calculation.
            </div>
        </div>
    );
};

export default EmployeeHoursAdjustment;
