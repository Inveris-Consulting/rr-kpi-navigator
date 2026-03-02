import { useState } from 'react';
import { useJobs, useClients, useJobMutations, Job } from '@/hooks/useOperationalCosts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Plus, Power, PowerOff } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ExcelImportExport, FieldMapping } from './ExcelImportExport';

export default function OperationalJobs({ clientFilter = 'all' }: { clientFilter?: string }) {
    const { data: jobs, isLoading } = useJobs();
    const { data: clients } = useClients();
    const { add, update } = useJobMutations();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<Job | null>(null);

    const [formData, setFormData] = useState({
        job_title: '',
        client_id: '',
        start_date: '',
        end_date: '',
        is_active: true
    });

    const handleOpen = (job?: Job) => {
        if (job) {
            setEditingJob(job);
            setFormData({
                job_title: job.job_title || '',
                client_id: job.client_id || '',
                start_date: job.start_date || job.job_date || '',
                end_date: job.end_date || '',
                is_active: job.is_active !== false
            });
        } else {
            setEditingJob(null);
            setFormData({
                job_title: '',
                client_id: '',
                start_date: new Date().toISOString().split('T')[0],
                end_date: '',
                is_active: true
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                job_date: formData.start_date, // Keep backward compatibility
                end_date: formData.end_date || null
            };

            if (editingJob) {
                await update.mutateAsync({ id: editingJob.id, ...payload });
                toast.success('Job updated successfully');
            } else {
                await add.mutateAsync(payload);
                toast.success('Job created successfully');
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.error('Failed to save job', { description: error.message });
        }
    };

    const handleToggleActive = async (job: Job) => {
        try {
            await update.mutateAsync({ id: job.id, is_active: !job.is_active });
            toast.success(`Job marked as ${!job.is_active ? 'Active' : 'Inactive'}`);
        } catch (error: any) {
            toast.error('Failed to toggle status', { description: error.message });
        }
    };

    const handleImport = async (mappedData: any[]) => {
        let successCount = 0;
        let errorCount = 0;

        // Build a lookup map: client name (lowercase) -> client id
        const clientNameToId = new Map<string, string>();
        clients?.forEach(c => {
            clientNameToId.set(c.name.toLowerCase().trim(), c.id);
        });

        for (const rawItem of mappedData) {
            try {
                const item = rawItem as any;

                // Sanitize: only keep valid database columns
                const payload: any = {};
                if (item.job_title) payload.job_title = item.job_title;
                if (item.start_date) payload.start_date = item.start_date;
                if (item.end_date) payload.end_date = item.end_date;
                payload.is_active = item.is_active === true || item.is_active === 'true' || item.is_active === 'Yes' || item.is_active === '1' || item.is_active === 'Active';

                // Resolve client_name to client_id
                if (item.client_name) {
                    const resolvedId = clientNameToId.get(String(item.client_name).toLowerCase().trim());
                    if (!resolvedId) {
                        throw new Error(`Client "${item.client_name}" not found. Please check the name matches an existing client.`);
                    }
                    payload.client_id = resolvedId;
                } else if (item.client_id) {
                    payload.client_id = item.client_id;
                }

                // Ensure job_date backward compatibility
                if (payload.start_date && !payload.job_date) {
                    payload.job_date = payload.start_date;
                }

                if (item.id) {
                    await update.mutateAsync({ id: String(item.id).trim(), ...payload } as any);
                } else {
                    if (!payload.job_title || !payload.client_id) throw new Error("Job Title and Client Name are required");
                    await add.mutateAsync(payload as any);
                }
                successCount++;
            } catch (err: any) {
                errorCount++;
                console.error("Import error for job", rawItem, err?.message || err);
            }
        }

        if (errorCount > 0) {
            toast.warning(`Import partial success: ${successCount} successful, ${errorCount} failed. Check console for details.`);
        } else {
            toast.success(`Successfully imported ${successCount} jobs.`);
        }
    };

    const importFields: FieldMapping[] = [
        { key: 'id', label: 'Job ID (Leave blank to create)' },
        { key: 'job_title', label: 'Job Title', required: true },
        { key: 'client_name', label: 'Client Name', required: true },
        { key: 'start_date', label: 'Start Date (YYYY-MM-DD)', required: true },
        { key: 'end_date', label: 'End Date (YYYY-MM-DD)' },
        { key: 'is_active', label: 'Is Active (Yes/No)' }
    ];

    // Flatten jobs data for export: include client_name instead of client_id
    const exportData = (jobs || []).map(job => ({
        id: job.id,
        job_title: job.job_title,
        client_name: job.clients?.name || '',
        start_date: job.start_date || job.job_date || '',
        end_date: job.end_date || '',
        is_active: job.is_active !== false ? 'Active' : 'Inactive',
    }));

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Jobs Management</h3>
                <div className="flex gap-2">
                    <ExcelImportExport
                        data={exportData}
                        fields={importFields}
                        filename="Jobs"
                        onImport={handleImport}
                        isLoading={add.isPending || update.isPending}
                    />
                    <Button onClick={() => handleOpen()}><Plus className="h-4 w-4 mr-2" /> New Job</Button>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingJob ? 'Edit Job' : 'Create Job'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Job Title</Label>
                            <Input required value={formData.job_title} onChange={e => setFormData({ ...formData, job_title: e.target.value })} />
                        </div>
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
                                <Label>Start Date</Label>
                                <Input type="date" required value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
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
                            <TableHead>Title</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {jobs?.filter(j => clientFilter === 'all' || j.client_id === clientFilter).map((job) => (
                            <TableRow key={job.id}>
                                <TableCell className="font-medium">{job.job_title}</TableCell>
                                <TableCell>{job.clients?.name}</TableCell>
                                <TableCell>{job.start_date || job.job_date ? format(new Date(job.start_date || job.job_date), 'dd/MM/yyyy') : ''}</TableCell>
                                <TableCell>{job.end_date ? format(new Date(job.end_date), 'dd/MM/yyyy') : '-'}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${job.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {job.is_active !== false ? 'Active' : 'Inactive'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="outline" size="icon" onClick={() => handleToggleActive(job)}>
                                        {job.is_active !== false ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => handleOpen(job)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {jobs?.filter(j => clientFilter === 'all' || j.client_id === clientFilter).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No jobs found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
