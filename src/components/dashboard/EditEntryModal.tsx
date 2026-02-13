import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface KPIDefinition {
    id: string;
    name: string;
    sector: string;
}

interface EditEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: {
        userId: string;
        userName: string;
        date: string; // YYYY-MM-DD
    } | null;
    kpiDefinitions: KPIDefinition[];
}

export function EditEntryModal({ isOpen, onClose, entry, kpiDefinitions }: EditEntryModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [existingEntries, setExistingEntries] = useState<Record<string, string>>({}); // kpiId -> entryId
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Group KPIs by sector
    const kpisBySector = kpiDefinitions.reduce((acc, kpi) => {
        if (!acc[kpi.sector]) {
            acc[kpi.sector] = [];
        }
        acc[kpi.sector].push(kpi);
        return acc;
    }, {} as Record<string, KPIDefinition[]>);

    useEffect(() => {
        if (isOpen && entry) {
            fetchEntryDetails();
        } else {
            setFormData({});
            setExistingEntries({});
        }
    }, [isOpen, entry]);

    const fetchEntryDetails = async () => {
        if (!entry) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('kpi_entries')
                .select('id, kpi_id, value')
                .eq('user_id', entry.userId)
                .eq('date', entry.date);

            if (error) throw error;

            const newFormData: Record<string, string> = {};
            const newExistingEntries: Record<string, string> = {};

            data?.forEach((item: any) => {
                if (item.kpi_id) {
                    newFormData[item.kpi_id] = item.value.toString();
                    newExistingEntries[item.kpi_id] = item.id;
                }
            });

            setFormData(newFormData);
            setExistingEntries(newExistingEntries);
        } catch (error) {
            console.error('Error fetching entry details:', error);
            toast.error('Failed to load entry details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (kpiId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [kpiId]: e.target.value
        }));
    };

    const handleSave = async () => {
        if (!entry) return;
        setIsSaving(true);
        try {
            // Create a list of operations
            const operations = kpiDefinitions.map(async (kpi) => {
                const valueStr = formData[kpi.id];
                const existingId = existingEntries[kpi.id];
                const val = parseFloat(valueStr || '');

                // Case 1: Value is empty
                if (valueStr === undefined || valueStr.trim() === '') {
                    if (existingId) {
                        // Delete existing entry if user cleared it
                        const { error } = await supabase.from('kpi_entries').delete().eq('id', existingId);
                        if (error) throw error;
                    }
                    return;
                }

                // Case 2: Value is present but invalid number (shouldn't happen with type=number, but good safe guard)
                if (isNaN(val)) return;

                // Case 3: Update or Insert
                if (existingId) {
                    const { error } = await supabase
                        .from('kpi_entries')
                        .update({ value: val, sector: kpi.sector })
                        .eq('id', existingId);

                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('kpi_entries')
                        .insert({
                            user_id: entry.userId,
                            date: entry.date,
                            kpi_id: kpi.id,
                            sector: kpi.sector,
                            value: val
                        });

                    if (error) throw error;
                }
            });

            await Promise.all(operations);

            toast.success('Entry updated successfully');
            queryClient.invalidateQueries({ queryKey: ['kpiHistory'] });
            onClose();
        } catch (error: any) {
            console.error('Error saving entry:', error);
            toast.error('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    if (!entry) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Entry</DialogTitle>
                    <div className="text-sm text-muted-foreground flex flex-col gap-1">
                        <span>User: <span className="font-medium text-foreground">{entry.userName}</span></span>
                        <span>Date: <span className="font-medium text-foreground">{format(new Date(entry.date + 'T00:00:00'), 'MMM d, yyyy')}</span></span>
                    </div>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex-1 flex justify-center items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-2">
                        <div className="space-y-6 pt-2 pb-4">
                            {Object.entries(kpisBySector).map(([sector, kpis]) => (
                                <div key={sector} className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1 sticky top-0 bg-background z-10">{sector}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                                        {kpis.map((kpi) => (
                                            <div key={kpi.id} className="space-y-1.5">
                                                <Label htmlFor={`edit-${kpi.id}`} className="text-xs">{kpi.name}</Label>
                                                <Input
                                                    id={`edit-${kpi.id}`}
                                                    type="number"
                                                    min="0"
                                                    placeholder="-"
                                                    value={formData[kpi.id] || ''}
                                                    onChange={handleInputChange(kpi.id)}
                                                    className="h-9"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <DialogFooter className="pt-2 border-t mt-auto">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
