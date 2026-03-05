import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Idea, Question, useLabStore, Connection, Series, Episode } from '../store/labStore';
import { ChevronDown, ChevronUp, MessageSquare, ShieldAlert, Binary, BookOpen, Link2, Share2, X, Plus, FolderPlus } from 'lucide-react';
import { clsx } from 'clsx';

import { generateUUID } from '../utils/uuid';

interface IdeaCardProps {
  idea: Idea;
}

export const IdeaCard = React.memo(({ idea }: { idea: Idea }) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'tensions' | 'questions' | 'exegesis' | 'connections'>('structure');
  const [expanded, setExpanded] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const { series, episodes, updateIdea } = useLabStore();

  const analysis = idea.analysis;
  if (!analysis) return null;

  const currentSeries = series.find(s => s.id === idea.series_id);
  const currentEpisode = episodes.find(e => e.id === idea.episode_id);

  const handleLink = (seriesId: string, episodeId: string) => {
    updateIdea(idea.id, { series_id: seriesId, episode_id: episodeId });
    setIsLinking(false);
  };

  const tabs = [
    { id: 'structure', label: 'Estrutura', icon: Binary },
    { id: 'tensions', label: 'Tensões', icon: ShieldAlert },
    { id: 'questions', label: 'Perguntas', icon: MessageSquare },
    ...(idea.detected_verse_ref ? [{ id: 'exegesis', label: 'Exegese', icon: BookOpen }] : []),
    { id: 'connections', label: 'Conexões', icon: Link2 },
  ] as const;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `*ÓRION LAB - ARQUITETURA DO NÚCLEO*

*Entrada:* ${idea.input_text}

*Tese:* ${analysis.thesis}

*Premissas:*
${analysis.premises.map(p => `- ${p}`).join('\n')}

*Antítese:* ${analysis.antithesis}

*Implicações:*
${analysis.implications.map(i => `- ${i}`).join('\n')}

${idea.detected_verse_ref ? `*Referência:* ${idea.detected_verse_ref}` : ''}

_Gerado via Órion Lab_`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="glass-card overflow-hidden"
    >
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <p className="text-lg leading-relaxed">{idea.input_text}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {currentSeries && (
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20 flex items-center gap-1">
                  <FolderPlus className="w-3 h-3" />
                  {currentSeries.title} {currentEpisode ? `• ${currentEpisode.title}` : ''}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider border border-accent/20">
                {analysis.claim_type}
              </span>
              <span className="px-2 py-0.5 rounded bg-border text-text-secondary text-[10px] font-bold uppercase tracking-wider">
                {analysis.axis}
              </span>
              <span className="px-2 py-0.5 rounded bg-border text-text-secondary text-[10px] font-bold uppercase tracking-wider">
                {analysis.emotional_tone}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsLinking(!isLinking); }}
                className={clsx(
                  "p-2 rounded-full transition-colors",
                  isLinking ? "bg-blue-500/10 text-blue-400" : "hover:bg-border text-text-secondary"
                )}
                title="Vincular a Série/Episódio"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              
              <AnimatePresence>
                {isLinking && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-2xl z-50 p-4 space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-1">
                      <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">Vincular Núcleo</h4>
                      <p className="text-[10px] text-text-secondary/50">Organize este núcleo em uma série</p>
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
                      {series.map(s => (
                        <div key={s.id} className="space-y-1">
                          <div className="text-[10px] uppercase text-accent font-bold px-2">{s.title}</div>
                          <div className="space-y-1">
                            {episodes.filter(e => e.series_id === s.id).map(e => (
                              <button
                                key={e.id}
                                onClick={() => handleLink(s.id, e.id)}
                                className={clsx(
                                  "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                                  idea.episode_id === e.id ? "bg-accent/10 text-accent" : "hover:bg-border text-text-secondary"
                                )}
                              >
                                {e.title}
                              </button>
                            ))}
                            <button
                              onClick={() => handleLink(s.id, '')}
                              className={clsx(
                                "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors italic",
                                idea.series_id === s.id && !idea.episode_id ? "bg-accent/10 text-accent" : "hover:bg-border text-text-secondary"
                              )}
                            >
                              Apenas na Série
                            </button>
                          </div>
                        </div>
                      ))}
                      {series.length === 0 && (
                        <p className="text-center py-4 text-[10px] text-text-secondary uppercase tracking-widest italic">Crie uma série primeiro</p>
                      )}
                    </div>
                    
                    {idea.series_id && (
                      <button 
                        onClick={() => handleLink('', '')}
                        className="w-full py-2 text-[10px] uppercase font-bold text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        Remover Vínculo
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={handleShare}
              className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-full transition-colors"
              title="Compartilhar no WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-border rounded-full transition-colors"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {expanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pt-4 border-t border-border space-y-6"
          >
            <div className="flex gap-6 border-b border-border overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={clsx(
                    "flex items-center gap-2 py-3 text-xs font-bold uppercase tracking-widest whitespace-nowrap border-b-2 transition-all",
                    activeTab === tab.id ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="min-h-[200px]">
              {activeTab === 'structure' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold">Tese Central</h4>
                    <p className="text-text-primary font-medium">{analysis.thesis}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold">Premissas</h4>
                      <ul className="space-y-2">
                        {analysis.premises.map((p, i) => (
                          <li key={i} className="flex gap-3 text-sm text-text-secondary">
                            <span className="text-accent">•</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold">Implicações</h4>
                      <ul className="space-y-2">
                        {analysis.implications.map((p, i) => (
                          <li key={i} className="flex gap-3 text-sm text-text-secondary">
                            <span className="text-accent">•</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tensions' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-accent font-bold">Antítese Possível</h4>
                    <p className="text-text-primary font-medium">{analysis.antithesis}</p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold">Pontos de Tensão</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {idea.questions?.filter(q => q.kind === 'tension').map((q) => (
                        <div key={q.id} className="p-4 bg-bg rounded-xl border border-border text-sm italic text-text-secondary">
                          "{q.question}"
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'questions' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {idea.questions?.filter(q => q.kind === 'structural' || q.kind === 'axis').map((q) => (
                      <QuestionItem key={q.id} ideaId={idea.id} question={q} />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'exegesis' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-accent/5 border border-accent/10 rounded-xl">
                    <BookOpen className="w-5 h-5 text-accent" />
                    <span className="font-display font-medium text-accent">{idea.detected_verse_ref}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {idea.questions?.filter(q => q.kind === 'exegetical').map((q) => (
                      <QuestionItem key={q.id} ideaId={idea.id} question={q} />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'connections' && (
                <ConnectionsTab ideaId={idea.id} connections={idea.connections} />
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

const ConnectionsTab = ({ ideaId, connections }: { ideaId: string, connections?: Connection[] }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [target, setTarget] = useState('');
  const [relation, setRelation] = useState('supports');
  const [note, setNote] = useState('');
  const { addConnection, removeConnection } = useLabStore();

  const handleAdd = () => {
    if (!target.trim()) return;
    addConnection(ideaId, {
      id: generateUUID(),
      target,
      relation,
      note
    });
    setTarget('');
    setNote('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold">Conexões Estruturais</h4>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-[10px] uppercase font-bold text-accent tracking-widest hover:opacity-80 transition-opacity"
          >
            <Plus className="w-3 h-3" />
            Nova Conexão
          </button>
        )}
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-bg rounded-xl border border-accent/20 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-text-secondary font-bold">Conceito/Alvo</label>
              <input 
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-accent/30"
                placeholder="Ex: Soberania, Isaías 53..."
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-text-secondary font-bold">Relação</label>
              <select 
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/30"
              >
                <option value="supports">Suporta</option>
                <option value="tensions">Tensiona</option>
                <option value="parallels">Paralelo a</option>
                <option value="fulfills">Cumpre</option>
                <option value="contrasts">Contrasta com</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-text-secondary font-bold">Nota/Descrição</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs min-h-[60px] focus:outline-none focus:border-accent/30"
              placeholder="Descreva a relação..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="text-[10px] uppercase font-bold text-text-secondary px-2">Cancelar</button>
            <button onClick={handleAdd} disabled={!target.trim()} className="text-[10px] uppercase font-bold text-accent px-2 disabled:opacity-50">Adicionar</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections?.map((conn) => (
          <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={conn.id} 
            className="p-4 bg-bg rounded-xl border border-border group relative"
          >
            <button 
              onClick={() => removeConnection(ideaId, conn.id)}
              className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-400 transition-all"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-accent">{conn.target}</span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 bg-border rounded text-text-secondary">
                {conn.relation}
              </span>
            </div>
            {conn.note && <p className="text-xs text-text-secondary italic">"{conn.note}"</p>}
          </motion.div>
        ))}
        {(!connections || connections.length === 0) && !isAdding && (
          <div className="col-span-full py-12 text-center opacity-20">
            <Link2 className="w-8 h-8 mx-auto mb-2" />
            <p className="text-xs uppercase tracking-widest">Sem conexões manuais</p>
          </div>
        )}
      </div>
    </div>
  );
};

const QuestionItem = ({ ideaId, question }: { ideaId: string, question: Question }) => {
  const [isAnswering, setIsAnswering] = useState(false);
  const [answer, setAnswer] = useState(question.user_answer || '');
  const { saveAnswer } = useLabStore();

  const handleSave = () => {
    if (!answer.trim()) return;
    saveAnswer(ideaId, question.id, answer);
    setIsAnswering(false);
  };

  return (
    <div className="p-4 bg-bg rounded-xl border border-border space-y-3">
      <p className="text-sm font-medium">{question.question}</p>
      {question.user_answer ? (
        <div className="space-y-2">
          <div className="p-3 bg-surface rounded-lg text-xs text-text-secondary border-l-2 border-accent">
            {question.user_answer}
          </div>
          <button 
            onClick={() => setIsAnswering(true)}
            className="text-[10px] uppercase font-bold text-text-secondary hover:text-accent transition-colors"
          >
            Editar Resposta
          </button>
        </div>
      ) : isAnswering ? (
        <div className="space-y-2">
          <textarea 
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg p-3 text-xs min-h-[80px] focus:outline-none focus:border-accent/30"
            placeholder="Sua resposta..."
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => {
                setIsAnswering(false);
                setAnswer(question.user_answer || '');
              }} 
              className="text-[10px] uppercase font-bold text-text-secondary px-2"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={!answer.trim()}
              className="text-[10px] uppercase font-bold text-accent px-2 disabled:opacity-50"
            >
              Salvar Resposta
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsAnswering(true)}
          className="text-[10px] uppercase font-bold text-accent tracking-widest hover:opacity-80 transition-opacity"
        >
          Responder
        </button>
      )}
    </div>
  );
};
