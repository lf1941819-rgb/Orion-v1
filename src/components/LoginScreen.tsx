import React, { useState } from 'react';
import { motion } from 'motion/react';
import { OrionLogo } from './Brand';
import { Mail, Github, Instagram, Phone, Loader2 } from 'lucide-react';

export const LoginScreen = () => {
  const [method, setMethod] = useState<'email' | 'phone' | 'google' | 'instagram'>('email');
  const [loading, setLoading] = useState(false);

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
          <h1 className="text-3xl">ÓRION LAB</h1>
          <p className="text-text-secondary text-sm">Laboratório de Arquitetura Teológica</p>
        </div>

        <div className="flex border-b border-border">
          {(['email', 'phone', 'google', 'instagram'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider transition-all ${
                method === m ? 'text-accent border-b-2 border-accent' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {method === 'email' && (
            <div className="space-y-4">
              <input type="email" placeholder="Seu e-mail" className="w-full input-field" />
              <button className="w-full btn-primary flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                Entrar com E-mail
              </button>
            </div>
          )}

          {method === 'phone' && (
            <div className="space-y-4">
              <input type="tel" placeholder="+55 (00) 00000-0000" className="w-full input-field" />
              <button className="w-full btn-primary flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                Receber Código OTP
              </button>
            </div>
          )}

          {method === 'google' && (
            <button className="w-full btn-secondary flex items-center justify-center gap-2 py-3">
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              Continuar com Google
            </button>
          )}

          {method === 'instagram' && (
            <button className="w-full btn-secondary flex items-center justify-center gap-2 py-3">
              <Instagram className="w-4 h-4 text-pink-500" />
              Continuar com Instagram
            </button>
          )}
        </div>

        <p className="text-center text-[10px] text-text-secondary uppercase tracking-[0.2em] pt-4">
          Verdade — Justiça — Juízo
        </p>
      </motion.div>
    </div>
  );
};
