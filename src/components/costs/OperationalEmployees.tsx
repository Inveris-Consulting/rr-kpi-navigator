import { useState } from 'react';
import { useMonthlyEmployeeExpenses, useMonthlyEmployeeExpenseMutations, MonthlyEmployeeExpense } from '@/hooks/useOperationalCosts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { toast } from 'sonner';

export default function OperationalEmployees() {
    const { data: expenses, isLoading } = useMonthlyEmployeeExpenses();
    const { add, update, remove } = useMonthlyEmployeeExpenseMutations();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<MonthlyEmployeeExpense | null>(null);

    const [formData, setFormData] = useState({
        month_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        total_amount: 0
    });

    const handleOpen = (expense?: MonthlyEmployeeExpense) => {
        if (expense) {
            setEditingExpense(expense);
            setFormData({
                month_date: expense.month_date,
                total_amount: expense.total_amount
            });
        } else {
            setEditingExpense(null);
            setFormData({
                month_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                total_amount: 0
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Ensure month_date is always saved as the first of the month
            const yearMonth = formData.month_date.substring(0, 7);
            const firstOfMonth = `${yearMonth}-01`;

            const payload = {
                month_date: firstOfMonth,
                total_amount: formData.total_amount
            };

            if (editingExpense) {
                await update.mutateAsync({ id: editingExpense.id, ...payload } as any);
                toast.success('Payment updated successfully');
            } else {
                await add.mutateAsync(payload as any);
                toast.success('Payment recorded successfully');
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            if (error?.message?.includes('unique constraint')) {
                toast.error('A payment for this month is already recorded. Please edit the existing entry instead.');
            } else {
                toast.error('Failed to save payment', { description: error.message });
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this payment record?')) return;
        try {
            await remove.mutateAsync(id);
            toast.success('Record deleted');
        } catch (error: any) {
            toast.error('Failed to delete', { description: error.message });
        }
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Monthly Employees Payment</h3>
                <Button onClick={() => handleOpen()}><Plus className="h-4 w-4 mr-2" /> Record Payment</Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingExpense ? 'Edit Payment' : 'Record Monthly Payment'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Month / Year</Label>
                            <Input
                                type="month"
                                required
                                value={formData.month_date.substring(0, 7)}
                                onChange={e => setFormData({ ...formData, month_date: `${e.target.value}-01` })}
                            />
                            <p className="text-xs text-muted-foreground">Select the month for this total employee expense.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Total Amount Paid ($)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                required
                                value={formData.total_amount}
                                onChange={e => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                            />
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
                            <TableHead>Month</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenses?.map((expense) => (
                            <TableRow key={expense.id}>
                                <TableCell className="font-medium text-lg">
                                    {format(parseISO(expense.month_date), 'MMMM yyyy')}
                                </TableCell>
                                <TableCell className="text-right font-bold text-lg">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(expense.total_amount)}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="icon" onClick={() => handleOpen(expense)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => handleDelete(expense.id)} className="text-red-500 hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {expenses?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    No payment records found. Click "Record Payment" to add one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
