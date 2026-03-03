import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BarChart3, PieChart, Activity, Layers, Zap, Share2 } from 'lucide-react';
import { useLabStore } from '../store/labStore';

interface StructuralMapProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StructuralMap = ({ isOpen, onClose }: StructuralMapProps) => {
  const { ideas } = useLabStore();

  const stats = useMemo(() => ({
    total: ideas.length,
    truth: ideas.filter(i => i.analysis?.axis === 'truth').length,
    justice: ideas.filter(i => i.analysis?.axis === 'justice').length,
    judgment: ideas.filter(i => i.analysis?.axis === 'judgment').length,
    mixed: ideas.filter(i => i.analysis?.axis === 'mixed').length,
  }), [ideas]);

  const types = useMemo(() => ({
    ontological: ideas.filter(i => i.analysis?.claim_type === 'ontological').length,
    juridical: ideas.filter(i => i.analysis?.claim_type === 'juridical').length,
    narrative: ideas.filter(i => i.analysis?.claim_type === 'narrative').length,
    pastoral: ideas.filter(i => i.analysis?.claim_type === 'pastoral').length,
  }), [ideas]);

  const keywords = useMemo(() => 
    Array.from(new Set(ideas.flatMap(i => i.analysis?.keywords || []))).slice(0, 15),
  [ideas]);

  const handleExportWhatsApp = () => {
    const text = `*ÓRION LAB - MAPA ESTRUTURAL*
    
*Total de Núcleos:* ${stats.total}

*Distribuição por Eixo:*
- Verdade: ${stats.truth}
- Justiça: ${stats.justice}
- Juízo: ${stats.judgment}

*Tipologia:*
- Ontológica: ${types.ontological}
- Jurídica: ${types.juridical}
- Narrativa: ${types.narrative}
- Pastoral: ${types.pastoral}

*Vocabulário Principal:*
${keywords.join(', ')}

_Gerado via Órion Lab_`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-bg/95 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-5xl h-full max-h-[90vh] glass-card overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-accent" />
                <h2 className="text-xl">Mapa Estrutural</h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportWhatsApp}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 text-emerald-500 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-600/20 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Exportar WhatsApp
                </button>
                <button onClick={onClose} className="p-2 hover:bg-border rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              {/* Eixo Distribution */}
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent" />
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-text-secondary">Distribuição por Eixo</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatBar label="Verdade" value={stats.truth} total={stats.total} color="bg-accent" />
                  <StatBar label="Justiça" value={stats.justice} total={stats.total} color="bg-accent/60" />
                  <StatBar label="Juízo" value={stats.judgment} total={stats.total} color="bg-accent/30" />
                </div>
              </section>

              {/* Tipo Distribution */}
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-accent" />
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-text-secondary">Tipologia Argumentativa</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <TypeCard label="Ontológica" count={types.ontological} />
                  <TypeCard label="Jurídica" count={types.juridical} />
                  <TypeCard label="Narrativa" count={types.narrative} />
                  <TypeCard label="Pastoral" count={types.pastoral} />
                </div>
              </section>

              {/* Vocabulary & Gaps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <section className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-accent" />
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-text-secondary">Vocabulário Estrutural</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((kw, i) => (
                      <span key={i} className="px-3 py-1 bg-surface border border-border rounded-full text-xs text-text-secondary">
                        {kw}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent" />
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-text-secondary">Lacunas Potenciais</h3>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-text-secondary italic">
                      "Ausência explícita de conexões entre Juízo e a dimensão Pastoral no conjunto atual."
                    </p>
                    <p className="text-sm text-text-secondary italic">
                      "Baixa densidade de premissas ontológicas na série 'Soberania'."
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const StatBar = ({ label, value, total, color }: { label: string, value: number, total: number, color: string }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
        <span>{label}</span>
        <span className="text-text-secondary">{value}</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
};

const TypeCard = ({ label, count }: { label: string, count: number }) => (
  <div className="p-4 bg-surface border border-border rounded-xl text-center space-y-1">
    <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">{label}</p>
    <p className="text-2xl font-display font-bold text-accent">{count}</p>
  </div>
);
