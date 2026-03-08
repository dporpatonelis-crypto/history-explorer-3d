import { useState } from 'react';
import { AncientAgora } from '@/components/AncientAgora';
import { DialogPanel } from '@/components/DialogPanel';
import { ProgressTracker } from '@/components/ProgressTracker';
import { useProgress } from '@/hooks/useProgress';
import { NPCData } from '@/data/npcData';

const Index = () => {
  const [activeNPC, setActiveNPC] = useState<NPCData | null>(null);
  const { visited, markVisited, resetProgress } = useProgress();

  const handleNPCInteract = (npc: NPCData) => {
    setActiveNPC(npc);
    markVisited(npc.id);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-foreground">
      <AncientAgora visited={visited} onNPCInteract={handleNPCInteract} />
      <ProgressTracker visited={visited} onReset={resetProgress} />

      {/* Title */}
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

      {activeNPC && (
        <DialogPanel npc={activeNPC} onClose={() => setActiveNPC(null)} />
      )}
    </div>
  );
};

export default Index;
