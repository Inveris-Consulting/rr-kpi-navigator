import { useState } from 'react';
import { useEmployeeCostPeriods, useEmployeeUsers, useEmployeeCostPeriodMutations, EmployeeCostPeriod } from '@/hooks/useOperationalCosts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ExcelImportExport, FieldMapping } from './ExcelImportExport';

export default function OperationalEmployees() {
    const { data: periods, isLoading } = useEmployeeCostPeriods();
    const { data: users } = useEmployeeUsers();
    const { add, update, remove } = useEmployeeCostPeriodMutations();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState<EmployeeCostPeriod | null>(null);

    const [formData, setFormData] = useState({
        user_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        hourly_rate: 0,
        working_hours: 160
    });

    const handleOpen = (period?: EmployeeCostPeriod) => {
        if (period) {
            setEditingPeriod(period);
            setFormData({
                user_id: period.user_id,
                start_date: period.start_date,
                end_date: period.end_date || '',
                hourly_rate: period.hourly_rate,
                working_hours: period.working_hours || 160
            });
        } else {
            setEditingPeriod(null);
            setFormData({
                user_id: '',
                start_date: new Date().toISOString().split('T')[0],
                end_date: '',
                hourly_rate: 0,
                working_hours: 160
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                end_date: formData.end_date || null
            };

            if (editingPeriod) {
                await update.mutateAsync({ id: editingPeriod.id, ...payload } as any);
                toast.success('Period updated successfully');
            } else {
                await add.mutateAsync(payload as any);
                toast.success('Period created successfully');
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.error('Failed to save period', { description: error.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await remove.mutateAsync(id);
            toast.success('Record deleted');
        } catch (error: any) {
            toast.error('Failed to delete', { description: error.message });
        }
    };

    const handleImport = async (mappedData: Partial<EmployeeCostPeriod>[]) => {
        let successCount = 0;
        let errorCount = 0;

        for (const rawItem of mappedData) {
            try {
                const item = rawItem as any;
                const payload = {
                    ...item,
                    hourly_rate: parseFloat(item.hourly_rate) || 0,
                    working_hours: parseInt(item.working_hours, 10) || 160
                };

                if (item.id) {
                    await update.mutateAsync({ id: item.id, ...payload } as any);
                } else {
                    if (!payload.user_id) throw new Error("User ID required");
                    if (!payload.start_date) throw new Error("Start Date required");
                    await add.mutateAsync(payload as any);
                }
                successCount++;
            } catch (err) {
                errorCount++;
                console.error("Import error for employee cost period", rawItem, err);
            }
        }

        if (errorCount > 0) {
            toast.warning(`Import partial success: ${successCount} successful, ${errorCount} failed.`);
        } else {
            toast.success(`Successfully imported ${successCount} records.`);
        }
    };

    const importFields: FieldMapping[] = [
        { key: 'id', label: 'Period ID (Leave blank to create)' },
        { key: 'user_id', label: 'User ID', required: true },
        { key: 'start_date', label: 'Start Date (YYYY-MM-DD)', required: true },
        { key: 'end_date', label: 'End Date (YYYY-MM-DD)' },
        { key: 'hourly_rate', label: 'Hourly Rate', required: true },
        { key: 'working_hours', label: 'Monthly Working Hours' }
    ];

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Employee Cost Periods</h3>
                <div className="flex gap-2">
                    <ExcelImportExport
                        data={periods || []}
                        fields={importFields}
                        filename="Employee_Cost_Periods"
                        onImport={handleImport}
                        isLoading={add.isPending || update.isPending}
                    />
                    <Button onClick={() => handleOpen()}><Plus className="h-4 w-4 mr-2" /> Assign Period</Button>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingPeriod ? 'Edit Period' : 'Assign Period'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Employee</Label>
                            <Select required value={formData.user_id} onValueChange={v => setFormData({ ...formData, user_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                                <SelectContent>
                                    {users?.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Hourly Rate ($)</Label>
                                <Input type="number" step="0.01" required value={formData.hourly_rate} onChange={e => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Monthly Working Hours</Label>
                                <Input type="number" required value={formData.working_hours} onChange={e => setFormData({ ...formData, working_hours: parseInt(e.target.value, 10) || 0 })} />
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="mr-2">Cancel</Button>
                            <Button type="submit" disabled={add.isPending || update.isPending}>Save</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead className="text-right">Mo. Hours</TableHead>
                            <TableHead className="text-right">Hourly Rate</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {periods?.map((period) => (
                            <TableRow key={period.id}>
                                <TableCell className="font-medium">{period.users?.name}</TableCell>
                                <TableCell>{format(new Date(period.start_date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{period.end_date ? format(new Date(period.end_date), 'dd/MM/yyyy') : 'Present'}</TableCell>
                                <TableCell className="text-right font-medium">{period.working_hours}</TableCell>
                                <TableCell className="text-right font-medium">${Number(period.hourly_rate).toFixed(2)}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="icon" onClick={() => handleOpen(period)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => handleDelete(period.id)} className="text-red-500 hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {periods?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No records found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
