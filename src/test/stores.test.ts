import { describe, it, expect } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import { useCalendarStore } from '../stores/calendarStore';

describe('authStore', () => {
  it('starts with loading true and no user', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.loading).toBe(true);
  });

  it('setAuth updates user and session', () => {
    const mockUser = { id: '123', email: 'test@test.com' } as any;
    const mockSession = { access_token: 'abc' } as any;
    
    useAuthStore.getState().setAuth(mockUser, mockSession);
    
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.session).toEqual(mockSession);
    expect(state.loading).toBe(false);
  });

  it('setAuth with null clears user', () => {
    useAuthStore.getState().setAuth(null, null);
    
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.loading).toBe(false);
  });
});

describe('calendarStore', () => {
  it('starts with no selected date', () => {
    expect(useCalendarStore.getState().selectedDate).toBeNull();
  });

  it('setSelectedDate updates the selected date', () => {
    useCalendarStore.getState().setSelectedDate('2026-04-07');
    expect(useCalendarStore.getState().selectedDate).toBe('2026-04-07');
  });

  it('setSelectedDate with null clears selection', () => {
    useCalendarStore.getState().setSelectedDate(null);
    expect(useCalendarStore.getState().selectedDate).toBeNull();
  });
});
