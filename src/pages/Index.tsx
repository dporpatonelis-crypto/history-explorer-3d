import { useState } from 'react';
import { AncientAgora } from '@/components/AncientAgora';
import { DialogPanel } from '@/components/DialogPanel';
import { ProgressTracker } from '@/components/ProgressTracker';
import { useProgress } from '@/hooks/useProgress';
import { NPCData } from '@/data/npcData';

const isWeakDevice = () => {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return memory <= 4 || cores <= 4 || prefersReducedMotion;
};

const Index = () => {
  const [activeNPC, setActiveNPC] = useState<NPCData | null>(null);
  const [performanceMode, setPerformanceMode] = useState(() => {
    const saved = localStorage.getItem('performanceMode');
    if (saved !== null) return saved === 'true';
    return isWeakDevice();
  });
  const { visited, markVisited, resetProgress } = useProgress();

  const handleNPCInteract = (npc: NPCData) => {
    setActiveNPC(npc);
    markVisited(npc.id);
  };

  const togglePerformance = () => {
    setPerformanceMode((prev) => {
      const next = !prev;
      localStorage.setItem('performanceMode', String(next));
      return next;
    });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-foreground">
      <AncientAgora visited={visited} onNPCInteract={handleNPCInteract} performanceMode={performanceMode} />
      <ProgressTracker
        visited={visited}
        onReset={resetProgress}
        performanceMode={performanceMode}
        onTogglePerformance={togglePerformance}
      />

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <div className="progress-badge rounded-xl px-6 py-2 backdrop-blur-md text-center">
          <h1 className="font-cinzel text-sm font-bold text-foreground tracking-wider">
            Αρχαία Αγορά — Εκπαιδευτική Εξερεύνηση
          </h1>
          <p className="font-cormorant text-xs text-muted-foreground">
            Κάνε κλικ σε έναν φιλόσοφο για να μάθεις περισσότερα
          </p>
        </div>
      </div>

      {activeNPC && <DialogPanel npc={activeNPC} onClose={() => setActiveNPC(null)} />}
    </div>
  );
};

export default Index;
