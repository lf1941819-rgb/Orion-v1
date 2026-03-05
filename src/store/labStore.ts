import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabaseClient';
import { analyzeIdea, normalizeAnalysisPayload } from '../services/geminiService';

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
  relation: string;
  direction: 'out' | 'in';
  from_idea_id: string;
  to_idea_id: string;
  to_verse_ref?: string;
  note?: string;
  target_label: string;
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
  biblical_links?: any[];
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
  saveAnswer: (ideaId: string, questionId: string, answer: string) => Promise<void>;
  addConnection: (ideaId: string, connection: Omit<Connection, 'id'>) => Promise<void>;
  removeConnection: (ideaId: string, connectionId: string) => Promise<void>;
  addSeries: (series: Series) => void;
  addEpisode: (episode: Episode) => void;
  updateSeries: (id: string, updates: Partial<Series>) => void;
  updateEpisode: (id: string, updates: Partial<Episode>) => void;
  deleteSeries: (id: string) => void;
  deleteEpisode: (id: string) => void;
  syncWithSupabase: () => Promise<void>;
  createIdeaWithAnalysis: (inputText: string, options?: { series_id?: string; episode_id?: string }) => Promise<void>;
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
      saveAnswer: async (ideaId, questionId, answer) => {
        try {
          await supabaseService.updateQuestion(questionId, { user_answer: answer, status: 'answered' });
          
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
          }));
        } catch (error) {
          console.error('Error saving answer:', error);
        }
      },
      addConnection: async (ideaId, connectionData) => {
        try {
          const { target_label, ...dbData } = connectionData;
          const persisted = await supabaseService.createConnection(dbData);
          
          const fullConnection: Connection = {
            ...persisted,
            target_label: target_label || persisted.to_verse_ref || '—'
          };

          set((state) => ({
            ideas: state.ideas.map((idea) => {
              if (idea.id !== ideaId) return idea;
              return {
                ...idea,
                connections: [...(idea.connections || []), fullConnection],
              };
            }),
          }));
        } catch (error) {
          console.error('Error adding connection:', error);
        }
      },
      removeConnection: async (ideaId, connectionId) => {
        try {
          await supabaseService.deleteConnection(connectionId);
          set((state) => ({
            ideas: state.ideas.map((idea) => {
              if (idea.id !== ideaId) return idea;
              return {
                ...idea,
                connections: idea.connections?.filter((c) => c.id !== connectionId),
              };
            }),
          }));
        } catch (error) {
          console.error('Error removing connection:', error);
        }
      },
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
          const [series, episodes, remoteIdeas] = await Promise.all([
            supabaseService.fetchSeries(),
            supabaseService.fetchEpisodes(),
            supabaseService.fetchIdeasForSync()
          ]);
          
          set((state) => {
            // Merge ideas carefully
            const mergedIdeas = [...state.ideas];
            
            remoteIdeas.forEach((remote) => {
              const localIndex = mergedIdeas.findIndex((i) => i.id === remote.id);
              if (localIndex >= 0) {
                // Update existing idea but preserve local flags
                const local = mergedIdeas[localIndex];
                mergedIdeas[localIndex] = {
                  ...remote,
                  // Preserve local-only state if we had any (none currently defined in interface, but good practice)
                  // If we added "isAnalyzing" per idea, we'd preserve it here.
                };
              } else {
                // Add new idea from remote
                mergedIdeas.push(remote);
              }
            });

            // Clean up: if an idea has an ID and is NOT in remoteIdeas, 
            // it might have been deleted or we are just seeing the limit of 50.
            // For now, we keep local ideas that are "isAnalyzing" or don't have an ID yet.
            
            return { 
              series, 
              episodes, 
              ideas: mergedIdeas.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              ) 
            };
          });
        } catch (error) {
          console.error('Error syncing with Supabase:', error);
        }
      },
      createIdeaWithAnalysis: async (inputText, options = {}) => {
        set({ isAnalyzing: true });
        try {
          // 1. Create Idea in DB
          const ideaRow = await supabaseService.createIdea({
            input_text: inputText,
            input_type: 'phrase', // Default
            ...options
          });

          // 2. Call Edge Function for Analysis
          const analysisPayload = await analyzeIdea(inputText);

          // 3. Normalize Payload
          const { analysisRow, questionRows, detected } = normalizeAnalysisPayload(analysisPayload);

          // 4. Update Idea with detected info if available
          if (detected) {
            await supabaseService.saveIdea({
              ...ideaRow,
              input_type: detected.input_type,
              detected_verse_ref: detected.detected_verse_ref
            });
          }

          // 5. Upsert Analysis
          const persistedAnalysis = await supabaseService.upsertAnalysis(ideaRow.id, analysisRow);

          // 6. Replace Questions
          const persistedQuestions = await supabaseService.replaceQuestions(persistedAnalysis.id, questionRows);

          // 7. Update Local State
          const fullIdea: Idea = {
            ...ideaRow,
            input_type: detected?.input_type || ideaRow.input_type,
            detected_verse_ref: detected?.detected_verse_ref || ideaRow.detected_verse_ref,
            analysis: persistedAnalysis,
            questions: persistedQuestions
          };

          set((state) => ({
            ideas: [fullIdea, ...state.ideas.filter(i => i.id !== ideaRow.id)],
            activeIdeaId: fullIdea.id,
            isAnalyzing: false
          }));

        } catch (error) {
          console.error('Error in createIdeaWithAnalysis:', error);
          set({ isAnalyzing: false });
          throw error;
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
