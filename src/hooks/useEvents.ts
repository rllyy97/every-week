import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { EventInsert, EventUpdate } from '../types/database';

export function useEvents(startDate: string, endDate: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['events', user?.id, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, category:categories(*)')
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .order('start_date');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useEventsForRange(startDate: string, endDate: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['events-range', user?.id, startDate, endDate],
    queryFn: async () => {
      // Get events that overlap with the range:
      // event starts before range end AND event end (start_date + duration) >= range start
      const { data, error } = await supabase
        .from('events')
        .select('*, category:categories(*)')
        .lte('start_date', endDate)
        .order('start_date');
      if (error) throw error;
      // Filter client-side for events whose range overlaps
      return data.filter((e) => {
        const eventEnd = new Date(e.start_date);
        eventEnd.setDate(eventEnd.getDate() + e.duration_days - 1);
        const eventEndStr = eventEnd.toISOString().split('T')[0];
        return eventEndStr >= startDate;
      });
    },
    enabled: !!user,
    staleTime: 30000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (event: Omit<EventInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('events')
        .insert({ ...event, user_id: user.id })
        .select('*, category:categories(*)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events-range'] });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: EventUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select('*, category:categories(*)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events-range'] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events-range'] });
    },
  });
}
