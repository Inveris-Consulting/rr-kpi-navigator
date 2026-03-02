import { useState } from 'react';
import { useJobReceipts, useClients, useJobs, useReceiptMutations, JobReceipt } from '@/hooks/useOperationalCosts';
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

export default function OperationalReceipts({ clientFilter = 'all' }: { clientFilter?: string }) {
    const { data: receipts, isLoading } = useJobReceipts();
    const { data: clients } = useClients();
    const { data: jobs } = useJobs();
    const { add, update, remove } = useReceiptMutations();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState<JobReceipt | null>(null);

    const [formData, setFormData] = useState({
        client_id: '',
        job_id: 'none',
        payment_status: 'Pending',
        received_date: new Date().toISOString().split('T')[0],
        amount_due: 0,
        amount_received: 0,
        outstanding_balance: 0,
        follow_up_required: false,
        notes: ''
    });

    const handleOpen = (receipt?: JobReceipt) => {
        if (receipt) {
            setEditingReceipt(receipt);
            setFormData({
                client_id: receipt.client_id,
                job_id: receipt.job_id || 'none',
                payment_status: receipt.payment_status || 'Pending',
                received_date: receipt.received_date,
                amount_due: receipt.amount_due || 0,
                amount_received: receipt.amount_received || 0,
                outstanding_balance: receipt.outstanding_balance || 0,
                follow_up_required: receipt.follow_up_required || false,
                notes: receipt.notes || ''
            });
        } else {
            setEditingReceipt(null);
            setFormData({
                client_id: '',
                job_id: 'none',
                payment_status: 'Pending',
                received_date: new Date().toISOString().split('T')[0],
                amount_due: 0,
                amount_received: 0,
                outstanding_balance: 0,
                follow_up_required: false,
                notes: ''
            });
        }
        setIsDialogOpen(true);
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'amount_due' || field === 'amount_received') {
                const due = field === 'amount_due' ? Number(value) : Number(next.amount_due);
                const rec = field === 'amount_received' ? Number(value) : Number(next.amount_received);
                next.outstanding_balance = due - rec;
                if (due > 0 && rec >= due) {
                    next.payment_status = 'Paid';
                } else if (rec > 0) {
                    next.payment_status = 'Partial';
                } else {
                    next.payment_status = 'Pending';
                }
            }
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                job_id: formData.job_id === 'none' ? null : formData.job_id
            };

            if (editingReceipt) {
                await update.mutateAsync({ id: editingReceipt.id, ...payload });
                toast.success('Receipt updated successfully');
            } else {
                await add.mutateAsync(payload);
                toast.success('Receipt created successfully');
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.error('Failed to save receipt', { description: error.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this receipt?')) return;
        try {
            await remove.mutateAsync(id);
            toast.success('Receipt deleted');
        } catch (error: any) {
            toast.error('Failed to delete', { description: error.message });
        }
    };

    const handleImport = async (mappedData: Partial<JobReceipt>[]) => {
        let successCount = 0;
        let errorCount = 0;

        for (const rawItem of mappedData) {
            try {
                const item = rawItem as any;
                const payload = {
                    ...item,
                    amount: parseFloat(item.amount) || 0,
                    employee_commission: parseFloat(item.employee_commission) || 0
                };

                if (item.id) {
                    await update.mutateAsync({ id: item.id, ...payload } as any);
                } else {
                    if (!payload.job_id || !payload.client_id) throw new Error("Job ID and Client ID required");
                    await add.mutateAsync(payload as any);
                }
                successCount++;
            } catch (err) {
                errorCount++;
                console.error("Import error for receipt", rawItem, err);
            }
        }

        if (errorCount > 0) {
            toast.warning(`Import partial success: ${successCount} successful, ${errorCount} failed.`);
        } else {
            toast.success(`Successfully imported ${successCount} receipts.`);
        }
    };

    const importFields: FieldMapping[] = [
        { key: 'id', label: 'Receipt ID (Leave blank to create)' },
        { key: 'job_id', label: 'Job ID', required: true },
        { key: 'client_id', label: 'Client ID', required: true },
        { key: 'amount', label: 'Amount', required: true },
        { key: 'received_date', label: 'Received Date (YYYY-MM-DD)', required: true },
        { key: 'invoice_number', label: 'Invoice Number' },
        { key: 'notes', label: 'Notes' },
        { key: 'employee_commission', label: 'Employee Commission' },
        { key: 'commission_paid_date', label: 'Commission Paid Date (YYYY-MM-DD)' }
    ];

    if (isLoading) return <div>Loading...</div>;

    const filteredJobs = jobs?.filter(j => j.client_id === formData.client_id) || [];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Customer Receipts</h3>
                <div className="flex gap-2">
                    <ExcelImportExport
                        data={receipts || []}
                        fields={importFields}
                        filename="Customer_Receipts"
                        onImport={handleImport}
                        isLoading={add.isPending || update.isPending}
                    />
                    <Button onClick={() => handleOpen()}><Plus className="h-4 w-4 mr-2" /> New Receipt</Button>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingReceipt ? 'Edit Receipt' : 'Create Receipt'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Client</Label>
                                <Select required value={formData.client_id} onValueChange={v => handleInputChange('client_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                                    <SelectContent>
                                        {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Job (Optional)</Label>
                                <Select value={formData.job_id} onValueChange={v => handleInputChange('job_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {filteredJobs.map(j => <SelectItem key={j.id} value={j.id}>{j.job_title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Received Date</Label>
                                <Input type="date" required value={formData.received_date} onChange={e => handleInputChange('received_date', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Status</Label>
                                <Select value={formData.payment_status} onValueChange={v => handleInputChange('payment_status', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Partial">Partial</SelectItem>
                                        <SelectItem value="Paid">Paid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Amount Due</Label>
                                <Input type="number" step="0.01" required value={formData.amount_due} onChange={e => handleInputChange('amount_due', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Amount Received</Label>
                                <Input type="number" step="0.01" required value={formData.amount_received} onChange={e => handleInputChange('amount_received', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Outstanding Balance</Label>
                                <Input type="number" disabled value={formData.outstanding_balance} />
                            </div>
                            <div className="space-y-2 flex flex-col justify-end">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={formData.follow_up_required} onChange={e => handleInputChange('follow_up_required', e.target.checked)} className="rounded border-gray-300" />
                                    <span className="text-sm font-medium">Follow-up Required</span>
                                </label>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} />
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="mr-2">Cancel</Button>
                            <Button type="submit" disabled={add.isPending || update.isPending}>Save</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Job</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Due</TableHead>
                            <TableHead className="text-right">Received</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-center">Follow-up</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {receipts?.filter(r => clientFilter === 'all' || r.client_id === clientFilter).map((receipt) => (
                            <TableRow key={receipt.id}>
                                <TableCell>{format(new Date(receipt.received_date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{receipt.clients?.name}</TableCell>
                                <TableCell>{receipt.jobs?.job_title || '-'}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold
                                        ${receipt.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                                            receipt.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'}`}>
                                        {receipt.payment_status}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">${Number(receipt.amount_due).toFixed(2)}</TableCell>
                                <TableCell className="text-right">${Number(receipt.amount_received).toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">${Number(receipt.outstanding_balance).toFixed(2)}</TableCell>
                                <TableCell className="text-center">{receipt.follow_up_required ? '⚠️' : '-'}</TableCell>
                                <TableCell className="max-w-[150px] truncate" title={receipt.notes || '-'}>{receipt.notes || '-'}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="icon" onClick={() => handleOpen(receipt)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => handleDelete(receipt.id)} className="text-red-500 hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {receipts?.filter(r => clientFilter === 'all' || r.client_id === clientFilter).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-4 text-muted-foreground">No receipts found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
