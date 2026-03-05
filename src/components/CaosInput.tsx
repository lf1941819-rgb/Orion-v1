import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { useLabStore } from '../store/labStore';
import { analyzeIdea } from '../services/geminiService';

import { generateUUID } from '../utils/uuid';

export const CaosInput = React.memo(() => {
  const [text, setText] = useState('');
  const { isAnalyzing, setAnalyzing, addIdea } = useLabStore();

  const handleAnalyze = async () => {
    if (!text.trim() || isAnalyzing) return;
    
    setAnalyzing(true);
    try {
      const result = await analyzeIdea(text);
      
      const newIdea = {
        id: generateUUID(),
        input_text: text,
        input_type: result.detected.input_type,
        detected_verse_ref: result.detected.detected_verse_ref,
        created_at: new Date().toISOString(),
        analysis: {
          id: generateUUID(),
          ...result.detected,
          ...result.structure,
          keywords: result.detected.keywords,
          warnings: result.warnings || []
        },
        questions: [
          ...result.questions.structural.map((q: string) => ({ id: generateUUID(), kind: 'structural', question: q, status: 'open' })),
          ...result.questions.tension.map((q: string) => ({ id: generateUUID(), kind: 'tension', question: q, status: 'open' })),
          ...result.questions.axis.map((q: string) => ({ id: generateUUID(), kind: 'axis', question: q, status: 'open' })),
          ...(result.questions.exegetical || []).map((q: string) => ({ id: generateUUID(), kind: 'exegetical', question: q, status: 'open' })),
        ]
      };
      
      addIdea(newIdea as any);
      setText('');
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite qualquer coisa: versículos, frases, pensamentos, perguntas..."
          className="w-full min-h-[160px] p-6 bg-surface border border-border rounded-2xl text-lg resize-none focus:outline-none focus:border-accent/30 transition-all placeholder:text-text-secondary/30"
          disabled={isAnalyzing}
        />
        <div className="absolute bottom-4 right-4 flex items-center gap-3">
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2 text-accent text-sm font-medium"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando Arquitetura...
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || isAnalyzing}
            className="btn-primary flex items-center gap-2 h-12 px-8"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analisar Estrutura
          </button>
        </div>
      </div>
    </div>
  );
});
