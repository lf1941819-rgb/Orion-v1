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
        analysis (*),
        questions (*),
        connections (*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Idea[];
  },

  async saveSeries(series: Series) {
    if (!supabase) return;
    const { error } = await supabase
      .from('series')
      .upsert(series);
    if (error) throw error;
  },

  async saveEpisode(episode: Episode) {
    if (!supabase) return;
    const { error } = await supabase
      .from('episodes')
      .upsert(episode);
    if (error) throw error;
  },

  async saveIdea(idea: Idea) {
    if (!supabase) return;
    
    // Save main idea
    const { analysis, questions, connections, ...ideaData } = idea;
    const { error: ideaError } = await supabase
      .from('ideas')
      .upsert(ideaData);
    if (ideaError) throw ideaError;

    // Save analysis
    if (analysis) {
      const { error: analysisError } = await supabase
        .from('analysis')
        .upsert({ ...analysis, idea_id: idea.id });
      if (analysisError) throw analysisError;
    }

    // Save questions
    if (questions && questions.length > 0) {
      const { error: questionsError } = await supabase
        .from('questions')
        .upsert(questions.map(q => ({ ...q, idea_id: idea.id })));
      if (questionsError) throw questionsError;
    }
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
