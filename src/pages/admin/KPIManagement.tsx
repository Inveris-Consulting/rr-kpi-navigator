import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useKPIDefinitions, useKPIMutations, KPIDefinition } from '@/hooks/useAdmin';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Plus, Trash2, Check, Shield, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function KPIManagement() {
    const queryClient = useQueryClient();

    // KPI Definition State
    const { data: kpis, isLoading: isLoadingKPIs } = useKPIDefinitions();
    const { add, update, remove } = useKPIMutations();
    const [isKPIDialogOpen, setIsKPIDialogOpen] = useState(false);
    const [editingKPI, setEditingKPI] = useState<KPIDefinition | null>(null);
    const [kpiFormData, setKpiFormData] = useState({
        name: '',
        sector: 'Overview',
        is_client_specific: false,
        is_placement: false,
        is_prospecting: false,
        is_rar: false
    });

    // User Access State
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isUserKPIModalOpen, setIsUserKPIModalOpen] = useState(false);
    const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', role: 'user', email: '', password: '' });

    // Fetch Users
    const { data: users, isLoading: isLoadingUsers } = useQuery({
        queryKey: ['admin_users'],
        queryFn: async () => {
            const { data, error } = await supabase.from('users').select('*').order('name');
            if (error) throw error;
            return data || [];
        }
    });

    // Fetch user KPIs if a user is selected
    const { data: userKpis } = useQuery({
        queryKey: ['user_kpis', selectedUser?.id],
        queryFn: async () => {
            if (!selectedUser) return [];
            const { data, error } = await supabase.from('user_kpis').select('*').eq('user_id', selectedUser.id);
            if (error) throw error;
            return data?.map(d => d.kpi_id) || [];
        },
        enabled: !!selectedUser
    });

    const toggleKPI = useMutation({
        mutationFn: async ({ kpiId, hasKpi }: { kpiId: string, hasKpi: boolean }) => {
            if (!selectedUser) throw new Error("No user selected");
            if (hasKpi) {
                const { error } = await supabase.from('user_kpis').delete().eq('user_id', selectedUser.id).eq('kpi_id', kpiId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('user_kpis').insert({ user_id: selectedUser.id, kpi_id: kpiId });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user_kpis'] });
            toast.success('User KPIs updated');
        },
        onError: (err: any) => {
            toast.error('Failed to update KPI', { description: err.message });
        }
    });

    const createUser = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.from('users').insert({
                name: newUser.name,
                role: newUser.role,
                email: newUser.email,
                password: newUser.password // mock
            }).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_users'] });
            setIsNewUserModalOpen(false);
            setNewUser({ name: '', role: 'user', email: '', password: '' });
            toast.success('User created successfully');
        },
        onError: (err: any) => {
            toast.error('Failed to create user', { description: err.message });
        }
    });

    // KPI Definitions Handlers
    const handleOpenKPI = (kpi?: KPIDefinition) => {
        if (kpi) {
            setEditingKPI(kpi);
            setKpiFormData({
                name: kpi.name,
                sector: kpi.sector || 'Overview',
                is_client_specific: kpi.is_client_specific || false,
                is_placement: kpi.is_placement || false,
                is_prospecting: kpi.is_prospecting || false,
                is_rar: kpi.is_rar || false
            });
        } else {
            setEditingKPI(null);
            setKpiFormData({
                name: '',
                sector: 'Overview',
                is_client_specific: false,
                is_placement: false,
                is_prospecting: false,
                is_rar: false
            });
        }
        setIsKPIDialogOpen(true);
    };

    const handleCheckboxChange = (field: string, checked: boolean) => {
        setKpiFormData(prev => ({ ...prev, [field]: checked }));
    };

    const handleKPISubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingKPI) {
                await update.mutateAsync({ id: editingKPI.id, ...kpiFormData } as any);
                toast.success('KPI updated successfully');
            } else {
                await add.mutateAsync(kpiFormData as any);
                toast.success('KPI created successfully');
            }
            setIsKPIDialogOpen(false);
        } catch (error: any) {
            toast.error('Failed to save KPI', { description: error.message });
        }
    };

    const handleKPIDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this KPI definition? This might affect existing records.')) return;
        try {
            await remove.mutateAsync(id);
            toast.success('KPI deleted');
        } catch (error: any) {
            toast.error('Failed to delete', { description: error.message });
        }
    };

    // User Access Handlers
    const handleOpenUserKPIModal = (user: any) => {
        setSelectedUser(user);
        setIsUserKPIModalOpen(true);
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
                        <p className="text-muted-foreground">
                            Define system KPIs and manage user access
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="kpis" className="w-full">
                    <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent justify-start mb-6 p-0">
                        <TabsTrigger
                            value="kpis"
                            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2 rounded-full border border-border bg-card shadow-sm"
                        >
                            KPI Definitions
                        </TabsTrigger>
                        <TabsTrigger
                            value="users"
                            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-6 py-2 rounded-full border border-border bg-card shadow-sm"
                        >
                            User Access
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="kpis" className="space-y-6 animate-fade-in">
                        <div className="flex justify-end">
                            <Button onClick={() => handleOpenKPI()}><Plus className="h-4 w-4 mr-2" /> New KPI</Button>
                        </div>

                        <div className="bg-card rounded-xl border overflow-x-auto">
                            {isLoadingKPIs ? (
                                <div className="p-8 text-center text-muted-foreground">Loading...</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>General Sector</TableHead>
                                            <TableHead className="text-center">Client Specific?</TableHead>
                                            <TableHead className="text-center">Dpt: Placement</TableHead>
                                            <TableHead className="text-center">Dpt: Prospect</TableHead>
                                            <TableHead className="text-center">Dpt: RAR</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {kpis?.map((kpi) => (
                                            <TableRow key={kpi.id}>
                                                <TableCell className="font-medium">{kpi.name}</TableCell>
                                                <TableCell>{kpi.sector}</TableCell>
                                                <TableCell className="text-center">{kpi.is_client_specific ? 'Yes' : 'No'}</TableCell>
                                                <TableCell className="text-center">{kpi.is_placement ? '✔' : '-'}</TableCell>
                                                <TableCell className="text-center">{kpi.is_prospecting ? '✔' : '-'}</TableCell>
                                                <TableCell className="text-center">{kpi.is_rar ? '✔' : '-'}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="outline" size="icon" onClick={() => handleOpenKPI(kpi)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="outline" size="icon" onClick={() => handleKPIDelete(kpi.id)} className="text-red-500 hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="users" className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
                            <p className="text-sm text-muted-foreground">
                                Manage users and the specific KPIs they have access to. Admins have access to everything.
                            </p>
                            <Button onClick={() => setIsNewUserModalOpen(true)}><Plus className="h-4 w-4 mr-2" /> New User</Button>
                        </div>

                        {isLoadingUsers ? (
                            <div className="p-8 text-center text-muted-foreground">Loading users...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {users?.map((user: any) => (
                                    <Card key={user.id} className="animate-fade-in kpi-card-hover">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center font-bold">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg">{user.name}</CardTitle>
                                                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                            {user.role === 'admin' ? <><Shield className="h-3.5 w-3.5" /> Administrator</> : <><UserIcon className="h-3.5 w-3.5" /> Member</>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between mt-2">
                                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                                    {user.role}
                                                </Badge>
                                                {user.role !== 'admin' && (
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenUserKPIModal(user)}>
                                                        Manage KPIs
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* KPI Edit Modal */}
                <Dialog open={isKPIDialogOpen} onOpenChange={setIsKPIDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingKPI ? 'Edit KPI' : 'Create KPI'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleKPISubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Sector Grouping (Display in generic view)</Label>
                                <Select value={kpiFormData.sector} onValueChange={v => setKpiFormData({ ...kpiFormData, sector: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Overview">Overview</SelectItem>
                                        <SelectItem value="Placement">Placement</SelectItem>
                                        <SelectItem value="Prospecting">Prospecting</SelectItem>
                                        <SelectItem value="RAR">RAR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>KPI Name</Label>
                                <Input required value={kpiFormData.name} onChange={e => setKpiFormData({ ...kpiFormData, name: e.target.value })} />
                            </div>

                            <div className="p-4 border rounded-md space-y-4">
                                <h4 className="text-sm font-semibold">Client Context & Filtering</h4>

                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={kpiFormData.is_client_specific} onChange={e => handleCheckboxChange('is_client_specific', e.target.checked)} className="rounded" />
                                    <span className="text-sm">Is Client-Specific? (Will ask for a client when logging entry)</span>
                                </label>

                                <div className="space-y-2 mt-4">
                                    <Label className="text-xs text-muted-foreground">Appears in Client Dashboard Tabs:</Label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center space-x-2">
                                            <input type="checkbox" checked={kpiFormData.is_placement} onChange={e => handleCheckboxChange('is_placement', e.target.checked)} className="rounded text-primary" />
                                            <span className="text-sm">Placement</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input type="checkbox" checked={kpiFormData.is_prospecting} onChange={e => handleCheckboxChange('is_prospecting', e.target.checked)} className="rounded text-primary" />
                                            <span className="text-sm">Prospecting</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input type="checkbox" checked={kpiFormData.is_rar} onChange={e => handleCheckboxChange('is_rar', e.target.checked)} className="rounded text-primary" />
                                            <span className="text-sm">RAR</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsKPIDialogOpen(false)} className="mr-2">Cancel</Button>
                                <Button type="submit" disabled={add.isPending || update.isPending}>Save</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* User Creation Modal */}
                <Dialog open={isNewUserModalOpen} onOpenChange={setIsNewUserModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Password (Setup)</Label>
                                <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                            </div>
                            <Button className="w-full mt-4" disabled={createUser.isPending} onClick={() => createUser.mutate()}>
                                Create User
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* KPI Assignment Modal */}
                <Dialog open={isUserKPIModalOpen} onOpenChange={setIsUserKPIModalOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Manage KPIs for: {selectedUser?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-4">
                            {kpis?.map((kpi: any) => {
                                const hasKpi = userKpis?.includes(kpi.id);
                                return (
                                    <div
                                        key={kpi.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${hasKpi ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}
                                        onClick={() => toggleKPI.mutate({ kpiId: kpi.id, hasKpi })}
                                    >
                                        <div>
                                            <div className="font-medium text-sm">{kpi.name}</div>
                                            <div className="text-xs text-muted-foreground">{kpi.sector}</div>
                                        </div>
                                        <div className={`h-5 w-5 rounded border flex items-center justify-center ${hasKpi ? 'bg-primary border-primary text-primary-foreground' : 'border-input'}`}>
                                            {hasKpi && <Check className="h-3 w-3" />}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </MainLayout>
    );
}
