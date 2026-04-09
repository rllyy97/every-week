import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export function useDayColorsForRange(startDate: string, endDate: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['day-colors', user?.id, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_categories')
        .select('*, category:categories(*)')
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30000,
    placeholderData: keepPreviousData,
  });
}

export function useBatchSetDayColors() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (entries: { date: string; category_id: string }[]) => {
      if (entries.length === 0) return;
      if (!user) throw new Error('Not authenticated');
      const rows = entries.map((e) => ({
        user_id: user.id,
        date: e.date,
        category_id: e.category_id,
      }));
      const { error } = await supabase
        .from('day_categories')
        .upsert(rows, { onConflict: 'user_id,date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-colors'] });
    },
  });
}

export function useBatchRemoveDayColors() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (dates: string[]) => {
      if (dates.length === 0) return;
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('day_categories')
        .delete()
        .eq('user_id', user.id)
        .in('date', dates);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-colors'] });
    },
  });
}
