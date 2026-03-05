import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from './store/authStore';
import { useLabStore } from './store/labStore';
import { LoginScreen } from './components/LoginScreen';
import { CaosInput } from './components/CaosInput';
import { IdeaCard } from './components/IdeaCard';
import { OrionLogo, SectionDivider, LogoIcon } from './components/Brand';
import { LayoutGrid, LogOut, Settings, Calendar, Wifi, WifiOff, FlaskConical, Database, Download, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center space-y-6">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-bold">Ops! Algo deu errado.</h2>
            <p className="text-text-secondary text-sm">O aplicativo encontrou um erro inesperado.</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Recarregar Aplicativo
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ManageView = React.lazy(() => import('./components/ManageView').then(m => ({ default: m.ManageView })));
const StructuralMap = React.lazy(() => import('./components/StructuralMap').then(m => ({ default: m.StructuralMap })));

export default function App() {
  const { user, isLoading, setLoading, initialize } = useAuthStore();
  const { ideas, syncWithSupabase } = useLabStore();
  const [activeView, setActiveView] = useState<'lab' | 'manage'>('lab');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Initialize Auth
    initialize();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Sync with Supabase if available
    syncWithSupabase();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <OrionLogo className="scale-150" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <LoginScreen />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg text-text-primary">
      {/* Top Logo Icon (Screenshot reference) */}
      <div className="fixed top-6 left-6 z-50">
        <LogoIcon className="w-10 h-10" />
      </div>

      <header className="fixed top-0 left-0 right-0 z-40 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-4 pl-12 md:pl-16">
              <OrionLogo />
              <h1 className="text-lg md:text-xl tracking-[0.2em] font-display font-bold truncate max-w-[120px] md:max-w-none">ÓRION LAB</h1>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => setActiveView('lab')}
                className={clsx(
                  "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                  activeView === 'lab' ? "text-accent" : "text-text-secondary hover:text-text-primary"
                )}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                Laboratório
              </button>
              <button 
                onClick={() => setActiveView('manage')}
                className={clsx(
                  "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                  activeView === 'manage' ? "text-accent" : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Database className="w-3.5 h-3.5" />
                SÉRIES
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
              {isOnline ? (
                <><Wifi className="w-3 h-3 text-emerald-500" /> Online • Sincronizado</>
              ) : (
                <><WifiOff className="w-3 h-3 text-amber-500" /> Offline • Pendente</>
              )}
            </div>
            
            <button 
              onClick={() => setIsMapOpen(true)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary hover:text-accent transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Mapa Estrutural</span>
            </button>
            
            <div className="hidden sm:block h-4 w-[1px] bg-border" />
            
            <div className="flex items-center gap-1 md:gap-2">
              {deferredPrompt && (
                <button 
                  onClick={handleInstallClick}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  <Download className="w-3 h-3" />
                  Instalar
                </button>
              )}
              <button className="p-2 hover:bg-border rounded-full transition-colors">
                <Calendar className="w-4 h-4 text-text-secondary" />
              </button>
              <button className="p-2 hover:bg-border rounded-full transition-colors">
                <Settings className="w-4 h-4 text-text-secondary" />
              </button>
              <button 
                onClick={() => useAuthStore.getState().signOut()}
                className="p-2 hover:bg-border rounded-full transition-colors group"
              >
                <LogOut className="w-4 h-4 text-text-secondary group-hover:text-red-500 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-lg border-t border-border px-6 py-3 flex items-center justify-around">
        <button 
          onClick={() => setActiveView('lab')}
          className={clsx(
            "flex flex-col items-center gap-1 transition-all",
            activeView === 'lab' ? "text-accent" : "text-text-secondary"
          )}
        >
          <FlaskConical className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-widest">Laboratório</span>
        </button>
        <button 
          onClick={() => setActiveView('manage')}
          className={clsx(
            "flex flex-col items-center gap-1 transition-all",
            activeView === 'manage' ? "text-accent" : "text-text-secondary"
          )}
        >
          <Database className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-widest">Séries</span>
        </button>
        <button 
          onClick={() => setIsMapOpen(true)}
          className={clsx(
            "flex flex-col items-center gap-1 transition-all",
            isMapOpen ? "text-accent" : "text-text-secondary"
          )}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-widest">Mapa</span>
        </button>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeView === 'lab' ? (
            <motion.div
              key="lab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12 max-w-5xl mx-auto"
            >
              <section className="space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-5xl md:text-6xl font-display font-bold">Laboratório</h2>
                  <p className="text-text-secondary text-sm uppercase tracking-[0.4em]">Antes da mensagem, a arquitetura.</p>
                </div>
                <CaosInput />
              </section>

              <SectionDivider />

              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-text-secondary">Núcleos Recentes</h3>
                  <span className="text-[10px] text-text-secondary/50 uppercase font-bold">{ideas.length} entradas</span>
                </div>
                
                <div className="space-y-6">
                  <AnimatePresence mode="popLayout">
                    {ideas.map((idea) => (
                      <IdeaCard key={idea.id} idea={idea} />
                    ))}
                  </AnimatePresence>
                  
                  {ideas.length === 0 && (
                    <div className="py-20 text-center space-y-4 opacity-30">
                      <div className="flex justify-center">
                        <OrionLogo className="scale-150 grayscale" />
                      </div>
                      <p className="text-sm uppercase tracking-widest">O laboratório está vazio.</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="manage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <React.Suspense fallback={<div className="py-20 text-center opacity-20 uppercase tracking-widest text-xs">Carregando Séries...</div>}>
                <ManageView />
              </React.Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <React.Suspense fallback={null}>
        <StructuralMap isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
      </React.Suspense>
    </div>
    </ErrorBoundary>
  );
}
