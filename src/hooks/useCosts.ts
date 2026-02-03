import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Types
export interface Job {
    id: string;
    job_title: string;
    client_id: string | null;
    status: 'open' | 'closed';
    job_date: string;
    end_date: string | null;
}

export interface JobCost {
    id: string;
    job_id: string | null;
    description: string;
    amount: number;
    cost_date: string;
}

export interface EmployeeHourlyRate {
    id: string; // Rate ID
    user_id: string;
    hourly_rate: number;
    name: string; // Joined from users
}

export const useJobs = () => {
    return useQuery({
        queryKey: ['jobs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('jobs')
                .select('*');

            if (error) {
                console.error('Error fetching jobs:', error);
                throw error;
            }
            // Client-side sort
            return (data as Job[]).sort((a, b) => new Date(b.job_date).getTime() - new Date(a.job_date).getTime());
        },
    });
};

export const useJobCosts = () => {
    return useQuery({
        queryKey: ['job-costs-all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_costs')
                .select('*');

            if (error) {
                console.error('Error fetching job_costs:', error);
                throw error;
            }
            return (data as JobCost[]).sort((a, b) => new Date(b.cost_date).getTime() - new Date(a.cost_date).getTime());
        },
    });
};

export const useEmployeesWithRates = () => {
    return useQuery({
        queryKey: ['employees-rates'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select(`
          id,
          name,
          job_cost_employee,
          employee_hourly_rates (
            id,
            hourly_rate
          )
        `)
                .eq('job_cost_employee', true); // Filter at DB level

            if (error) throw error;

            return data.map((user: any) => ({
                user_id: user.id,
                name: user.name,
                id: user.employee_hourly_rates?.[0]?.id,
                hourly_rate: user.employee_hourly_rates?.[0]?.hourly_rate || 0
            })) as EmployeeHourlyRate[];
        },
    });
};

// Mutations
export const useUpdateEmployeeRate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, rate }: { userId: string; rate: number }) => {
            // Upsert rate
            const { data, error } = await supabase
                .from('employee_hourly_rates')
                .upsert({
                    user_id: userId,
                    hourly_rate: rate
                }, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees-rates'] });
        }
    });
};


