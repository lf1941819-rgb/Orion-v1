import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OrionLogo } from './Brand';
import { Mail, Instagram, Phone, Loader2, Camera, User, ArrowRight, Facebook } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { supabaseService } from '../services/supabaseService';

export const LoginScreen = () => {
  const { user, session, updateProfile } = useAuthStore();
  const [method, setMethod] = useState<'email' | 'magic' | 'social'>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Profile Setup State
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Cadastro realizado! Verifique seu e-mail.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Link mágico enviado! Verifique seu e-mail.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'facebook' | 'instagram') => {
    if (!supabase) return;
    try {
      // Instagram is usually via Facebook provider in Supabase
      const actualProvider = provider === 'instagram' ? 'facebook' : provider;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: actualProvider as any,
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0 || !user) return;
      
      const file = e.target.files[0];
      const publicUrl = await supabaseService.uploadAvatar(user.id, file);
      if (publicUrl) {
        setAvatarUrl(publicUrl);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao carregar foto.' });
    } finally {
      setUploading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        full_name: fullName,
        avatar_url: avatarUrl
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // If user is logged in but has no profile name, show profile setup
  if (session && user && (!user.full_name)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass-card p-8 space-y-8"
        >
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-display tracking-widest uppercase">Complete seu Perfil</h2>
            <p className="text-text-secondary text-xs uppercase tracking-widest">Bem-vindo ao Órion Lab</p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full bg-ink/10 border-2 border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden group"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-text-secondary group-hover:text-accent transition-colors" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-bg/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload} 
                className="hidden" 
                accept="image/*" 
              />
              <p className="text-[10px] text-text-secondary uppercase tracking-widest">Toque para adicionar foto</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input 
                  type="text" 
                  placeholder="Nome Completo" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-ink/5 border border-border rounded-lg focus:outline-none focus:border-accent transition-colors text-sm"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || !fullName}
                className="w-full py-4 bg-accent text-white rounded-lg font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Começar <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <OrionLogo className="scale-125" />
          </div>
          <h1 className="text-3xl font-display tracking-[0.3em] font-bold">ÓRION LAB</h1>
          <p className="text-text-secondary text-[10px] uppercase tracking-[0.3em]">Laboratório de Arquitetura Teológica</p>
        </div>

        <div className="flex border-b border-border">
          {(['email', 'magic', 'social'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${
                method === m ? 'text-accent border-b-2 border-accent' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {m === 'email' ? 'Senha' : m === 'magic' ? 'Link' : 'Social'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {message && (
            <div className={`p-3 rounded text-[10px] font-bold uppercase tracking-widest text-center ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {message.text}
            </div>
          )}

          {method === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input 
                type="email" 
                placeholder="Seu e-mail" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-ink/5 border border-border rounded-lg focus:outline-none focus:border-accent transition-colors text-sm" 
                required
              />
              <input 
                type="password" 
                placeholder="Sua senha" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-ink/5 border border-border rounded-lg focus:outline-none focus:border-accent transition-colors text-sm" 
                required
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-accent text-white rounded-lg font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSignUp ? 'Cadastrar' : 'Entrar')}
              </button>
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-[10px] text-text-secondary uppercase tracking-widest hover:text-accent transition-colors"
              >
                {isSignUp ? 'Já tem conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
              </button>
            </form>
          )}

          {method === 'magic' && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <input 
                type="email" 
                placeholder="Seu e-mail" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-ink/5 border border-border rounded-lg focus:outline-none focus:border-accent transition-colors text-sm" 
                required
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-accent text-white rounded-lg font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /> Enviar Link Mágico</>}
              </button>
            </form>
          )}

          {method === 'social' && (
            <div className="space-y-3">
              <button 
                onClick={() => handleOAuth('google')}
                className="w-full flex items-center justify-center gap-3 py-3 bg-white text-black border border-border rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-colors"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Continuar com Google
              </button>
              <button 
                onClick={() => handleOAuth('facebook')}
                className="w-full flex items-center justify-center gap-3 py-3 bg-[#1877F2] text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-colors"
              >
                <Facebook className="w-4 h-4 fill-current" />
                Continuar com Facebook
              </button>
              <button 
                onClick={() => handleOAuth('instagram')}
                className="w-full flex items-center justify-center gap-3 py-3 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-colors"
              >
                <Instagram className="w-4 h-4" />
                Continuar com Instagram
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-text-secondary uppercase tracking-[0.2em] pt-4 border-t border-border/50">
          Verdade — Justiça — Juízo
        </p>
      </motion.div>
    </div>
  );
};
