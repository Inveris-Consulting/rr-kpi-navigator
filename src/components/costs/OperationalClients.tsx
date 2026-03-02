import { useState } from 'react';
import { useClients, useClientMutations, Client } from '@/hooks/useOperationalCosts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ExcelImportExport, FieldMapping } from './ExcelImportExport';

export default function OperationalClients() {
    const { data: clients, isLoading } = useClients();
    const { add, update, remove } = useClientMutations();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        is_active: true,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_placement: false,
        is_prospecting: false,
        is_rar: false
    });

    const handleOpen = (client?: Client) => {
        if (client) {
            setEditingClient(client);
            setFormData({
                name: client.name,
                is_active: client.is_active,
                start_date: client.start_date || new Date().toISOString().split('T')[0],
                end_date: client.end_date || '',
                is_placement: client.is_placement,
                is_prospecting: client.is_prospecting,
                is_rar: client.is_rar
            });
        } else {
            setEditingClient(null);
            setFormData({
                name: '',
                is_active: true,
                start_date: new Date().toISOString().split('T')[0],
                end_date: '',
                is_placement: false,
                is_prospecting: false,
                is_rar: false
            });
        }
        setIsDialogOpen(true);
    };

    const handleCheckboxChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.checked }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                end_date: formData.end_date || null
            };

            if (editingClient) {
                await update.mutateAsync({ id: editingClient.id, ...payload } as any);
                toast.success('Client updated successfully');
            } else {
                await add.mutateAsync(payload as any);
                toast.success('Client created successfully');
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.error('Failed to save client', { description: error.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this client? Deleting it might cascade into deleting existing jobs/receipts/payments if not handled.')) return;
        try {
            await remove.mutateAsync(id);
            toast.success('Client deleted');
        } catch (error: any) {
            toast.error('Failed to delete', { description: error.message });
        }
    };

    const handleImport = async (mappedData: Partial<Client>[]) => {
        let successCount = 0;
        let errorCount = 0;

        for (const rawItem of mappedData) {
            try {
                // Ensure typescript doesn't complain about comparing boolean to string
                const item = rawItem as any;
                const payload = {
                    ...item,
                    is_active: item.is_active === true || item.is_active === 'true' || item.is_active === 'Yes' || item.is_active === '1',
                    is_rar: item.is_rar === true || item.is_rar === 'true' || item.is_rar === 'Yes' || item.is_rar === '1',
                    is_placement: item.is_placement === true || item.is_placement === 'true' || item.is_placement === 'Yes' || item.is_placement === '1',
                    is_prospecting: item.is_prospecting === true || item.is_prospecting === 'true' || item.is_prospecting === 'Yes' || item.is_prospecting === '1',
                };

                if (item.id) {
                    // Update
                    await update.mutateAsync({ id: item.id, ...payload } as any);
                } else {
                    // Insert
                    if (!payload.name) throw new Error("Name is required");
                    await add.mutateAsync(payload as any);
                }
                successCount++;
            } catch (err) {
                errorCount++;
                console.error("Import error for item", rawItem, err);
            }
        }

        if (errorCount > 0) {
            toast.warning(`Import partial success: ${successCount} successful, ${errorCount} failed.`);
        } else {
            toast.success(`Successfully imported ${successCount} clients.`);
        }
    };

    const importFields: FieldMapping[] = [
        { key: 'id', label: 'Client ID (Leave blank to create)' },
        { key: 'name', label: 'Client Name', required: true },
        { key: 'start_date', label: 'Start Date (YYYY-MM-DD)' },
        { key: 'end_date', label: 'End Date (YYYY-MM-DD)' },
        { key: 'is_active', label: 'Is Active (Yes/No)' },
        { key: 'is_rar', label: 'Is RAR (Yes/No)' },
        { key: 'is_placement', label: 'Is Placement (Yes/No)' },
        { key: 'is_prospecting', label: 'Is Prospecting (Yes/No)' }
    ];

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Clients</h3>
                <div className="flex gap-2">
                    <ExcelImportExport
                        data={clients || []}
                        fields={importFields}
                        filename="Clients"
                        onImport={handleImport}
                        isLoading={add.isPending || update.isPending}
                    />
                    <Button onClick={() => handleOpen()}><Plus className="h-4 w-4 mr-2" /> New Client</Button>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingClient ? 'Edit Client' : 'Create Client'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Client Name</Label>
                            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="text-sm font-medium">Departments & Status</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={formData.is_active} onChange={handleCheckboxChange('is_active')} className="rounded border-gray-300" />
                                    <span className="text-sm font-medium">Active Status</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={formData.is_rar} onChange={handleCheckboxChange('is_rar')} className="rounded border-gray-300" />
                                    <span className="text-sm font-medium">RAR Department</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={formData.is_placement} onChange={handleCheckboxChange('is_placement')} className="rounded border-gray-300" />
                                    <span className="text-sm font-medium">Placement Department</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={formData.is_prospecting} onChange={handleCheckboxChange('is_prospecting')} className="rounded border-gray-300" />
                                    <span className="text-sm font-medium">Prospecting Department</span>
                                </label>
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
                            <TableHead>Client Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Departments</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients?.map((client) => (
                            <TableRow key={client.id}>
                                <TableCell className="font-medium">{client.name}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${client.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {client.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </TableCell>
                                <TableCell>{client.start_date ? format(new Date(client.start_date), 'dd/MM/yyyy') : '-'}</TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        {client.is_rar && <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded">RAR</span>}
                                        {client.is_placement && <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5 rounded">Place</span>}
                                        {client.is_prospecting && <span className="bg-orange-100 text-orange-800 text-[10px] px-1.5 py-0.5 rounded">Prosp</span>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="icon" onClick={() => handleOpen(client)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => handleDelete(client.id)} className="text-red-500 hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {clients?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No records found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
