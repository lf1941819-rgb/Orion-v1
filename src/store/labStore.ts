import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabaseClient';

export interface Idea {
  id: string;
  input_text: string;
  input_type: string;
  detected_verse_ref?: string;
  created_at: string;
  series_id?: string;
  episode_id?: string;
  analysis?: Analysis;
  questions?: Question[];
  connections?: Connection[];
}

export interface Series {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  axis?: 'truth' | 'justice' | 'judgment' | 'mixed';
  type?: 'ontological' | 'juridical' | 'narrative' | 'pastoral' | 'mixed';
}

export interface Episode {
  id: string;
  series_id: string;
  title: string;
  description?: string;
  created_at: string;
  axis?: 'truth' | 'justice' | 'judgment' | 'mixed';
  type?: 'ontological' | 'juridical' | 'narrative' | 'pastoral' | 'mixed';
}

export interface Connection {
  id: string;
  target: string;
  relation: string;
  note?: string;
}

export interface Analysis {
  id: string;
  claim_type: 'ontological' | 'juridical' | 'narrative' | 'pastoral' | 'mixed';
  axis: 'truth' | 'justice' | 'judgment' | 'mixed';
  emotional_tone: string;
  thesis: string;
  antithesis: string;
  premises: string[];
  implications: string[];
  keywords: string[];
  warnings: string[];
}

export interface Question {
  id: string;
  kind: 'structural' | 'tension' | 'axis' | 'biblical' | 'exegetical';
  question: string;
  user_answer?: string;
  status: 'open' | 'answered' | 'parked';
}

interface LabState {
  ideas: Idea[];
  series: Series[];
  episodes: Episode[];
  activeIdeaId: string | null;
  isAnalyzing: boolean;
  setIdeas: (ideas: Idea[]) => void;
  addIdea: (idea: Idea) => void;
  updateIdea: (id: string, updates: Partial<Idea>) => void;
  setActiveIdea: (id: string | null) => void;
  setAnalyzing: (analyzing: boolean) => void;
  saveAnswer: (ideaId: string, questionId: string, answer: string) => void;
  addConnection: (ideaId: string, connection: Connection) => void;
  removeConnection: (ideaId: string, connectionId: string) => void;
  addSeries: (series: Series) => void;
  addEpisode: (episode: Episode) => void;
  updateSeries: (id: string, updates: Partial<Series>) => void;
  updateEpisode: (id: string, updates: Partial<Episode>) => void;
  deleteSeries: (id: string) => void;
  deleteEpisode: (id: string) => void;
  syncWithSupabase: () => Promise<void>;
}

export const useLabStore = create<LabState>()(
  persist(
    (set) => ({
      ideas: [],
      series: [],
      episodes: [],
      activeIdeaId: null,
      isAnalyzing: false,
      setIdeas: (ideas) => set({ ideas }),
      addIdea: (idea) => set((state) => ({ ideas: [idea, ...state.ideas] })),
      updateIdea: (id, updates) =>
        set((state) => ({
          ideas: state.ideas.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      setActiveIdea: (id) => set({ activeIdeaId: id }),
      setAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
      saveAnswer: (ideaId, questionId, answer) =>
        set((state) => ({
          ideas: state.ideas.map((idea) => {
            if (idea.id !== ideaId) return idea;
            return {
              ...idea,
              questions: idea.questions?.map((q) =>
                q.id === questionId
                  ? { ...q, user_answer: answer, status: 'answered' as const }
                  : q
              ),
            };
          }),
        })),
      addConnection: (ideaId, connection) =>
        set((state) => ({
          ideas: state.ideas.map((idea) => {
            if (idea.id !== ideaId) return idea;
            return {
              ...idea,
              connections: [...(idea.connections || []), connection],
            };
          }),
        })),
      removeConnection: (ideaId, connectionId) =>
        set((state) => ({
          ideas: state.ideas.map((idea) => {
            if (idea.id !== ideaId) return idea;
            return {
              ...idea,
              connections: idea.connections?.filter((c) => c.id !== connectionId),
            };
          }),
        })),
      addSeries: (s) => set((state) => ({ series: [s, ...state.series] })),
      addEpisode: (e) => set((state) => ({ episodes: [e, ...state.episodes] })),
      updateSeries: (id, updates) =>
        set((state) => ({
          series: state.series.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),
      updateEpisode: (id, updates) =>
        set((state) => ({
          episodes: state.episodes.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),
      deleteSeries: (id) => set((state) => ({ 
        series: state.series.filter(s => s.id !== id),
        episodes: state.episodes.filter(e => e.series_id !== id)
      })),
      deleteEpisode: (id) => set((state) => ({ 
        episodes: state.episodes.filter(e => e.id !== id)
      })),
      syncWithSupabase: async () => {
        if (!supabase) return;
        try {
          const [series, episodes, ideas] = await Promise.all([
            supabaseService.fetchSeries(),
            supabaseService.fetchEpisodes(),
            supabaseService.fetchIdeas()
          ]);
          set({ series, episodes, ideas });
        } catch (error) {
          console.error('Error syncing with Supabase:', error);
        }
      },
    }),
    {
      name: 'orion-lab-storage',
      partialize: (state) => ({
        ideas: state.ideas,
        series: state.series,
        episodes: state.episodes,
      }),
    }
  )
);
