import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CalendarState {
  isConnected: boolean;
  events: any[];
  setConnected: (connected: boolean) => void;
  setEvents: (events: any[]) => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      isConnected: false,
      events: [],
      setConnected: (connected) => set({ isConnected: connected }),
      setEvents: (events) => set({ events }),
    }),
    {
      name: 'orion-calendar-storage',
    }
  )
);

export const scheduleOnGoogleCalendar = async (eventData: {
  title: string;
  start: string;
  end: string;
  notes: string;
}) => {
  // In a real app, this would call the backend which handles OAuth tokens
  console.log("Scheduling on Google Calendar:", eventData);
  return { success: true, id: 'mock-event-id' };
};
