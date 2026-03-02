import { useState } from 'react';
import { useJobPayments, useClients, usePaymentMutations, JobPayment } from '@/hooks/useOperationalCosts';
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

export default function OperationalPayments({ clientFilter = 'all' }: { clientFilter?: string }) {
    const { data: payments, isLoading } = useJobPayments();
    const { data: clients } = useClients();
    const { add, update, remove } = usePaymentMutations();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<JobPayment | null>(null);

    const [formData, setFormData] = useState({
        client_id: '',
        type: 'indeed',
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const handleOpen = (payment?: JobPayment) => {
        if (payment) {
            setEditingPayment(payment);
            setFormData({
                client_id: payment.client_id,
                type: payment.type,
                amount: payment.amount,
                payment_date: payment.payment_date,
                notes: payment.notes || ''
            });
        } else {
            setEditingPayment(null);
            setFormData({
                client_id: '',
                type: 'indeed',
                amount: 0,
                payment_date: new Date().toISOString().split('T')[0],
                notes: ''
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPayment) {
                await update.mutateAsync({ id: editingPayment.id, ...formData } as any);
                toast.success('Payment updated successfully');
            } else {
                await add.mutateAsync(formData as any);
                toast.success('Payment created successfully');
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.error('Failed to save payment', { description: error.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this payment?')) return;
        try {
            await remove.mutateAsync(id);
            toast.success('Payment deleted');
        } catch (error: any) {
            toast.error('Failed to delete', { description: error.message });
        }
    };

    const handleImport = async (mappedData: Partial<JobPayment>[]) => {
        let successCount = 0;
        let errorCount = 0;

        for (const rawItem of mappedData) {
            try {
                const item = rawItem as any;
                const payload = {
                    ...item,
                    amount: parseFloat(item.amount) || 0
                };

                if (item.id) {
                    await update.mutateAsync({ id: item.id, ...payload } as any);
                } else {
                    if (!payload.client_id) throw new Error("Client ID required");
                    if (!payload.type) payload.type = 'other';
                    await add.mutateAsync(payload as any);
                }
                successCount++;
            } catch (err) {
                errorCount++;
                console.error("Import error for payment", rawItem, err);
            }
        }

        if (errorCount > 0) {
            toast.warning(`Import partial success: ${successCount} successful, ${errorCount} failed.`);
        } else {
            toast.success(`Successfully imported ${successCount} payments.`);
        }
    };

    const importFields: FieldMapping[] = [
        { key: 'id', label: 'Payment ID (Leave blank to create)' },
        { key: 'client_id', label: 'Client ID', required: true },
        { key: 'type', label: 'Type (indeed/other)', required: true },
        { key: 'amount', label: 'Amount', required: true },
        { key: 'payment_date', label: 'Payment Date (YYYY-MM-DD)', required: true },
        { key: 'notes', label: 'Notes' }
    ];

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Platform Payments</h3>
                <div className="flex gap-2">
                    <ExcelImportExport
                        data={payments || []}
                        fields={importFields}
                        filename="Platform_Payments"
                        onImport={handleImport}
                        isLoading={add.isPending || update.isPending}
                    />
                    <Button onClick={() => handleOpen()}><Plus className="h-4 w-4 mr-2" /> New Payment</Button>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingPayment ? 'Edit Payment' : 'Create Payment'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Client</Label>
                            <Select required value={formData.client_id} onValueChange={v => setFormData({ ...formData, client_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                                <SelectContent>
                                    {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Payment Type</Label>
                                <Select required value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="indeed">Indeed</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Payment Date</Label>
                            <Input type="date" required value={formData.payment_date} onChange={e => setFormData({ ...formData, payment_date: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
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
                            <TableHead>Date</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments?.filter(p => clientFilter === 'all' || p.client_id === clientFilter).map((payment) => (
                            <TableRow key={payment.id}>
                                <TableCell>{format(new Date(payment.payment_date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{payment.clients?.name}</TableCell>
                                <TableCell className="capitalize">{payment.type}</TableCell>
                                <TableCell className="text-right font-medium">${Number(payment.amount).toFixed(2)}</TableCell>
                                <TableCell className="truncate max-w-[200px]">{payment.notes || '-'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="icon" onClick={() => handleOpen(payment)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => handleDelete(payment.id)} className="text-red-500 hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {payments?.filter(p => clientFilter === 'all' || p.client_id === clientFilter).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No payments found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
