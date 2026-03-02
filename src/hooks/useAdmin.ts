import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface KPIDefinition {
    id: string;
    name: string;
    sector: string;
    created_at: string;
    is_client_specific: boolean;
    is_placement: boolean;
    is_prospecting: boolean;
    is_rar: boolean;
}

export const useKPIDefinitions = () => {
    return useQuery({
        queryKey: ['admin_kpi_definitions'],
        queryFn: async () => {
            const { data, error } = await supabase.from('kpis').select('*').order('name');
            if (error) throw error;
            return data as KPIDefinition[];
        },
    });
};

export const useKPIMutations = () => {
    const queryClient = useQueryClient();

    return {
        add: useMutation({
            mutationFn: async (payload: Partial<KPIDefinition>) => {
                const { data, error } = await supabase.from('kpis').insert(payload).select().single();
                if (error) throw error;
                return data;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin_kpi_definitions'] }),
        }),
        update: useMutation({
            mutationFn: async ({ id, ...payload }: Partial<KPIDefinition> & { id: string }) => {
                const { data, error } = await supabase.from('kpis').update(payload).eq('id', id).select().single();
                if (error) throw error;
                return data;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin_kpi_definitions'] }),
        }),
        remove: useMutation({
            mutationFn: async (id: string) => {
                const { error } = await supabase.from('kpis').delete().eq('id', id);
                if (error) throw error;
            },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin_kpi_definitions'] }),
        })
    };
};
