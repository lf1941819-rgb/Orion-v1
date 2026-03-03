import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLabStore, Series, Episode, Idea } from '../store/labStore';
import { Plus, Trash2, ChevronRight, Folder, FileText, Layout, MoreVertical, ExternalLink, Settings2, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';

const MetadataSection = ({ 
  label, 
  axis, 
  type, 
  onUpdate 
}: { 
  label: string, 
  axis?: string, 
  type?: string, 
  onUpdate: (updates: { axis?: any, type?: any }) => void 
}) => {
  const axes = [
    { id: 'truth', label: 'Verdade' },
    { id: 'justice', label: 'Justiça' },
    { id: 'judgment', label: 'Juízo' }
  ];
  
  const types = [
    { id: 'ontological', label: 'Ontológica' },
    { id: 'juridical', label: 'Jurídica' },
    { id: 'narrative', label: 'Narrativa' },
    { id: 'pastoral', label: 'Pastoral' }
  ];

  return (
    <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl space-y-4">
      <div className="flex items-center gap-2">
        <Settings2 className="w-3 h-3 text-accent" />
        <h4 className="text-[10px] uppercase tracking-widest font-bold text-accent">{label}</h4>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[9px] uppercase tracking-tighter text-text-secondary/60 block">Eixo</label>
          <div className="flex flex-wrap gap-1">
            {axes.map(a => (
              <button
                key={a.id}
                onClick={() => onUpdate({ axis: a.id })}
                className={clsx(
                  "px-2 py-1 rounded text-[9px] font-bold uppercase transition-all",
                  axis === a.id ? "bg-accent text-white" : "bg-border text-text-secondary hover:bg-border/80"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] uppercase tracking-tighter text-text-secondary/60 block">Tipo</label>
          <div className="flex flex-wrap gap-1">
            {types.map(t => (
              <button
                key={t.id}
                onClick={() => onUpdate({ type: t.id })}
                className={clsx(
                  "px-2 py-1 rounded text-[9px] font-bold uppercase transition-all",
                  type === t.id ? "bg-accent text-white" : "bg-border text-text-secondary hover:bg-border/80"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ManageView = () => {
  const { series, episodes, ideas, addSeries, addEpisode, updateSeries, updateEpisode, deleteSeries, deleteEpisode, setActiveIdea } = useLabStore();
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [isAddingSeries, setIsAddingSeries] = useState(false);
  const [isAddingEpisode, setIsAddingEpisode] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleAddSeries = () => {
    if (!newTitle.trim()) return;
    addSeries({
      id: crypto.randomUUID(),
      title: newTitle,
      created_at: new Date().toISOString()
    });
    setNewTitle('');
    setIsAddingSeries(false);
  };

  const handleAddEpisode = () => {
    if (!newTitle.trim() || !activeSeriesId) return;
    addEpisode({
      id: crypto.randomUUID(),
      series_id: activeSeriesId,
      title: newTitle,
      created_at: new Date().toISOString()
    });
    setNewTitle('');
    setIsAddingEpisode(false);
  };

  const activeSeries = series.find(s => s.id === activeSeriesId);
  const filteredEpisodes = episodes.filter(e => e.series_id === activeSeriesId);
  const activeEpisode = episodes.find(e => e.id === activeEpisodeId);
  const episodeIdeas = ideas.filter(i => i.episode_id === activeEpisodeId);

  const handleNextEpisode = () => {
    const currentIndex = filteredEpisodes.findIndex(e => e.id === activeEpisodeId);
    if (currentIndex < filteredEpisodes.length - 1) {
      setActiveEpisodeId(filteredEpisodes[currentIndex + 1].id);
    }
  };

  const handlePrevEpisode = () => {
    const currentIndex = filteredEpisodes.findIndex(e => e.id === activeEpisodeId);
    if (currentIndex > 0) {
      setActiveEpisodeId(filteredEpisodes[currentIndex - 1].id);
    }
  };

  const currentIndex = filteredEpisodes.findIndex(e => e.id === activeEpisodeId);
  const hasNext = currentIndex < filteredEpisodes.length - 1;
  const hasPrev = currentIndex > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
      {/* Sidebar: Series */}
      <div className="lg:col-span-3 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-text-secondary">Séries</h3>
          <button 
            onClick={() => setIsAddingSeries(true)}
            className="p-1 hover:bg-border rounded transition-colors text-accent"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {isAddingSeries && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="p-3 bg-surface border border-accent/30 rounded-lg space-y-2"
              >
                <input 
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSeries()}
                  placeholder="Título da Série..."
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsAddingSeries(false)} className="text-[10px] uppercase font-bold text-text-secondary">Cancelar</button>
                  <button onClick={handleAddSeries} className="text-[10px] uppercase font-bold text-accent">Criar</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {series.map((s) => (
            <button
              key={s.id}
              onClick={() => { setActiveSeriesId(s.id); setActiveEpisodeId(null); }}
              className={clsx(
                "w-full flex items-center justify-between p-4 rounded-xl border transition-all group",
                activeSeriesId === s.id 
                  ? "bg-accent/5 border-accent/30 text-accent" 
                  : "bg-surface border-border text-text-secondary hover:border-border/80"
              )}
            >
              <div className="flex items-center gap-3">
                <Folder className={clsx("w-4 h-4", activeSeriesId === s.id ? "text-accent" : "text-text-secondary/50")} />
                <span className="text-sm font-medium truncate max-w-[120px]">{s.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] opacity-50">{episodes.filter(ep => ep.series_id === s.id).length}</span>
                <Trash2 
                  onClick={(evt) => { evt.stopPropagation(); deleteSeries(s.id); }}
                  className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all" 
                />
              </div>
            </button>
          ))}

          {series.length === 0 && !isAddingSeries && (
            <div className="py-12 text-center opacity-20 border-2 border-dashed border-border rounded-xl">
              <p className="text-xs uppercase tracking-widest">Nenhuma série</p>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Episodes */}
      <div className="lg:col-span-4 space-y-6">
        {activeSeriesId ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-text-secondary">Episódios</h3>
              <button 
                onClick={() => setIsAddingEpisode(true)}
                className="p-1 hover:bg-border rounded transition-colors text-accent"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <MetadataSection 
              label="Configuração da Série"
              axis={activeSeries?.axis}
              type={activeSeries?.type}
              onUpdate={(updates) => updateSeries(activeSeriesId, updates)}
            />

            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {isAddingEpisode && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-surface border border-accent/30 rounded-lg space-y-2"
                  >
                    <input 
                      autoFocus
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddEpisode()}
                      placeholder="Título do Episódio..."
                      className="w-full bg-transparent text-sm focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsAddingEpisode(false)} className="text-[10px] uppercase font-bold text-text-secondary">Cancelar</button>
                      <button onClick={handleAddEpisode} className="text-[10px] uppercase font-bold text-accent">Criar</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {filteredEpisodes.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setActiveEpisodeId(e.id)}
                  className={clsx(
                    "w-full flex items-center justify-between p-4 rounded-xl border transition-all group",
                    activeEpisodeId === e.id 
                      ? "bg-accent/5 border-accent/30 text-accent" 
                      : "bg-surface border-border text-text-secondary hover:border-border/80"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={clsx("w-4 h-4", activeEpisodeId === e.id ? "text-accent" : "text-text-secondary/50")} />
                    <span className="text-sm font-medium truncate max-w-[150px]">{e.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] opacity-50">{ideas.filter(i => i.episode_id === e.id).length}</span>
                    <Trash2 
                      onClick={(evt) => { evt.stopPropagation(); deleteEpisode(e.id); }}
                      className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all" 
                    />
                  </div>
                </button>
              ))}

              {filteredEpisodes.length === 0 && !isAddingEpisode && (
                <div className="py-12 text-center opacity-20 border-2 border-dashed border-border rounded-xl">
                  <p className="text-xs uppercase tracking-widest">Nenhum episódio</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-10">
            <Folder className="w-12 h-12" />
            <p className="text-xs uppercase tracking-widest">Selecione uma série</p>
          </div>
        )}
      </div>

      {/* Right: Ideas/Nucleos */}
      <div className="lg:col-span-5 space-y-6">
        {activeEpisodeId ? (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-text-secondary">Núcleos Vinculados</h3>
                <p className="text-[10px] text-text-secondary/50 uppercase tracking-widest">{activeEpisode?.title}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrevEpisode}
                  disabled={!hasPrev}
                  className={clsx(
                    "p-2 rounded-lg border border-border transition-all",
                    hasPrev ? "hover:bg-accent/10 hover:border-accent/30 text-text-primary" : "opacity-20 cursor-not-allowed"
                  )}
                  title="Episódio Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleNextEpisode}
                  disabled={!hasNext}
                  className={clsx(
                    "p-2 rounded-lg border border-border transition-all",
                    hasNext ? "hover:bg-accent/10 hover:border-accent/30 text-text-primary" : "opacity-20 cursor-not-allowed"
                  )}
                  title="Próximo Episódio"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <MetadataSection 
              label="Configuração do Episódio"
              axis={activeEpisode?.axis}
              type={activeEpisode?.type}
              onUpdate={(updates) => updateEpisode(activeEpisodeId, updates)}
            />

            <div className="space-y-4">
              {episodeIdeas.map((idea) => (
                <div 
                  key={idea.id}
                  className="p-4 bg-surface border border-border rounded-xl space-y-3 group hover:border-accent/20 transition-all"
                >
                  <p className="text-sm line-clamp-2 text-text-primary/80">{idea.input_text}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[8px] font-bold uppercase tracking-wider">
                        {idea.analysis?.claim_type}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-border text-text-secondary text-[8px] font-bold uppercase tracking-wider">
                        {idea.analysis?.axis}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        // This would ideally scroll to the idea in the lab view
                        // For now we just show it's linked
                      }}
                      className="p-1.5 hover:bg-accent/10 text-accent rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {episodeIdeas.length === 0 && (
                <div className="py-20 text-center space-y-4 opacity-20 border-2 border-dashed border-border rounded-xl">
                  <Layout className="w-8 h-8 mx-auto" />
                  <p className="text-xs uppercase tracking-widest">Nenhum núcleo vinculado a este episódio</p>
                  <p className="text-[10px]">Vincule núcleos através do Laboratório</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-10">
            <FileText className="w-12 h-12" />
            <p className="text-xs uppercase tracking-widest">Selecione um episódio</p>
          </div>
        )}
      </div>
    </div>
  );
};
