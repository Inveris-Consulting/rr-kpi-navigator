import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Types
export interface Client {
    id: string;
    name: string;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    is_placement: boolean;
    is_prospecting: boolean;
    is_rar: boolean;
}

export interface Job {
    id: string;
    job_title: string;
    client_id: string | null;
    job_date: string;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    clients?: { name: string };
}

export interface JobReceipt {
    id: string;
    client_id: string;
    job_id: string | null;
    payment_status: string;
    received_date: string;
    amount_due: number;
    amount_received: number;
    outstanding_balance: number;
    follow_up_required: boolean;
    notes: string;
    clients?: { name: string };
    jobs?: { job_title: string };
}

export interface JobPayment {
    id: string;
    client_id: string;
    type: 'indeed' | 'other';
    amount: number;
    payment_date: string;
    notes: string;
    clients?: { name: string };
}

export interface EmployeeCostPeriod {
    id: string;
    user_id: string;
    start_date: string;
    end_date: string | null;
    hourly_rate: number;
    working_hours: number;
    users?: { name: string };
}

// Hooks

export const useClients = () => {
    return useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            const { data, error } = await supabase.from('clients').select('*').order('name');
            if (error) throw error;
            return data as Client[];
        },
    });
};

export const useJobs = () => {
    return useQuery({
        queryKey: ['jobs'],
        queryFn: async () => {
            const { data, error } = await supabase.from('jobs').select('*, clients(name)').order('job_date', { ascending: false });
            if (error) throw error;
            return data as Job[];
        },
    });
};

export const useJobReceipts = () => {
    return useQuery({
        queryKey: ['job_receipts'],
        queryFn: async () => {
            const { data, error } = await supabase.from('job_receipts').select('*, clients(name), jobs(job_title)').order('received_date', { ascending: false });
            if (error) throw error;
            return data as JobReceipt[];
        },
    });
};

export const useJobPayments = () => {
    return useQuery({
        queryKey: ['job_payments'],
        queryFn: async () => {
            const { data, error } = await supabase.from('job_payments').select('*, clients(name)').order('payment_date', { ascending: false });
            if (error) throw error;
            return data as JobPayment[];
        },
    });
};

export const useEmployeeCostPeriods = () => {
    return useQuery({
        queryKey: ['employee_cost_periods'],
        queryFn: async () => {
            const { data, error } = await supabase.from('employee_cost_periods').select('*, users(name)').order('start_date', { ascending: false });
            if (error) throw error;
            return data as EmployeeCostPeriod[];
        },
    });
};

export const useEmployeeUsers = () => {
    return useQuery({
        queryKey: ['employee_users'],
        queryFn: async () => {
            const { data, error } = await supabase.from('users').select('id, name').eq('job_cost_employee', true).order('name');
            if (error) throw error;
            return data as { id: string; name: string }[];
        },
    });
};

// Generic Mutation generator
const createMutation = <T>(table: string, queryKey: string) => {
    return () => {
        const queryClient = useQueryClient();
        return {
            add: useMutation({
                mutationFn: async (payload: Partial<T>) => {
                    const { data, error } = await supabase.from(table).insert(payload).select().single();
                    if (error) throw error;
                    return data;
                },
                onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
            }),
            update: useMutation({
                mutationFn: async ({ id, ...payload }: Partial<T> & { id: string }) => {
                    const { error } = await supabase.from(table).update(payload).eq('id', id);
                    if (error) throw error;
                    return { id, ...payload };
                },
                onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
            }),
            remove: useMutation({
                mutationFn: async (id: string) => {
                    const { error } = await supabase.from(table).delete().eq('id', id);
                    if (error) throw error;
                },
                onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
            })
        };
    };
};

export const useJobMutations = createMutation<Job>('jobs', 'jobs');
export const useReceiptMutations = createMutation<JobReceipt>('job_receipts', 'job_receipts');
export const usePaymentMutations = createMutation<JobPayment>('job_payments', 'job_payments');
export const useEmployeeCostPeriodMutations = createMutation<EmployeeCostPeriod>('employee_cost_periods', 'employee_cost_periods');
export const useClientMutations = createMutation<Client>('clients', 'clients');

