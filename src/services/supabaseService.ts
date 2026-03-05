import { supabase } from '../lib/supabaseClient';
import { Idea, Series, Episode } from '../store/labStore';

export const supabaseService = {
  async fetchSeries() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('series')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Series[];
  },

  async fetchEpisodes() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Episode[];
  },

  async fetchIdeas() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('ideas')
      .select(`
        *,
        analysis:analyses(*),
        questions(*),
        connections_out:connections!connections_from_idea_id_fkey(
          *,
          to_idea:ideas!connections_to_idea_id_fkey(input_text)
        ),
        connections_in:connections!connections_to_idea_id_fkey(
          *,
          from_idea:ideas!connections_from_idea_id_fkey(input_text)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Normalize connections for the UI
    const normalizedData = (data || []).map((idea: any) => ({
      ...idea,
      analysis: idea.analysis?.[0] || null,
      questions: (idea.questions || []).map((q: any) => ({
        ...q,
        user_answer: q.user_notes // Map DB field to UI field
      })),
      connections: [
        ...(idea.connections_out || []).map((c: any) => ({
          id: c.id,
          relation: c.relation,
          note: c.note,
          target: c.to_verse_ref || c.to_idea?.input_text || 'Ideia vinculada'
        })),
        ...(idea.connections_in || []).map((c: any) => ({
          id: c.id,
          relation: c.relation,
          note: c.note,
          target: c.from_idea?.input_text || 'Ideia vinculada'
        }))
      ]
    }));

    return normalizedData as Idea[];
  },

  async createIdea(params: { 
    input_text: string; 
    input_type: string; 
    series_id?: string; 
    episode_id?: string;
    detected_verse_ref?: string;
  }) {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('NOT_AUTHENTICATED');

    const { data, error } = await supabase
      .from('ideas')
      .insert({
        ...params,
        owner_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async upsertAnalysis(ideaId: string, analysis: any) {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('NOT_AUTHENTICATED');

    const { data, error } = await supabase
      .from('analyses')
      .upsert({
        ...analysis,
        idea_id: ideaId,
        owner_id: user.id
      }, { onConflict: 'idea_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async replaceQuestions(analysisId: string, questions: any[]) {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('NOT_AUTHENTICATED');

    // Delete existing questions for this analysis
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('analysis_id', analysisId);

    if (deleteError) throw deleteError;

    if (questions.length === 0) return [];

    const { data, error } = await supabase
      .from('questions')
      .insert(questions.map(q => ({
        ...q,
        analysis_id: analysisId,
        owner_id: user.id
      })))
      .select();

    if (error) throw error;
    return data;
  },

  async saveSeries(series: Series) {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('NOT_AUTHENTICATED');

    const { error } = await supabase
      .from('series')
      .upsert({ ...series, owner_id: user.id });
    if (error) throw error;
  },

  async saveEpisode(episode: Episode) {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('NOT_AUTHENTICATED');

    const { error } = await supabase
      .from('episodes')
      .upsert({ ...episode, owner_id: user.id });
    if (error) throw error;
  },

  async saveIdea(idea: Idea) {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('NOT_AUTHENTICATED');
    
    // Save main idea
    const { analysis, questions, connections, ...ideaData } = idea;
    const { error: ideaError } = await supabase
      .from('ideas')
      .upsert({ ...ideaData, owner_id: user.id });
    if (ideaError) throw ideaError;

    // Save analysis
    if (analysis) {
      const { data: analysisData, error: analysisError } = await supabase
        .from('analyses')
        .upsert({ ...analysis, idea_id: idea.id, owner_id: user.id }, { onConflict: 'idea_id' })
        .select()
        .single();
      if (analysisError) throw analysisError;

      // Save questions
      if (questions && questions.length > 0) {
        await this.replaceQuestions(analysisData.id, questions);
      }
    }
  },

  async updateQuestion(id: string, updates: any) {
    if (!supabase) throw new Error('Supabase not initialized');
    
    // Map user_answer back to user_notes if present
    const dbUpdates = { ...updates };
    if ('user_answer' in dbUpdates) {
      dbUpdates.user_notes = dbUpdates.user_answer;
      delete dbUpdates.user_answer;
    }

    const { data, error } = await supabase
      .from('questions')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSeries(id: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from('series')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async deleteEpisode(id: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from('episodes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getProfile(userId: string) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateProfile(profile: any) {
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .upsert(profile);
    if (error) throw error;
  },

  async uploadAvatar(userId: string, file: File) {
    if (!supabase) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  }
};
