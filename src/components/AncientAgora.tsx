import { NPCData, npcData } from '@/data/npcData';

interface AncientAgoraProps {
  visited: Set<string>;
  onNPCInteract: (npc: NPCData) => void;
}

// Map NPC positions to screen overlay positions (percentage-based)
const npcScreenPositions: Record<string, { top: string; left: string }> = {
  socrates: { top: '55%', left: '20%' },
  plato: { top: '50%', left: '75%' },
  aristotle: { top: '45%', left: '50%' },
  hypatia: { top: '60%', left: '35%' },
  pythagoras: { top: '55%', left: '65%' },
};

export function AncientAgora({ visited, onNPCInteract }: AncientAgoraProps) {
  return (
    <div className="relative w-full h-screen">
      {/* Sketchfab Embed */}
      <iframe
        title="The Parthenon Rebuilt"
        className="w-full h-full border-0"
        allowFullScreen
        allow="autoplay; fullscreen; xr-spatial-tracking"
        src="https://sketchfab.com/models/4552d90409924583b1fadfc9953134cb/embed?autostart=1&ui_hint=0&ui_theme=dark"
      />

      {/* NPC Overlay — pointer-events-none so iframe stays interactive */}
      <div className="absolute inset-0 z-20 pointer-events-none">
      {npcData.map((npc) => {
        const pos = npcScreenPositions[npc.id];
        if (!pos) return null;
        const isVisited = visited.has(npc.id);

        return (
          <button
            key={npc.id}
            onClick={() => onNPCInteract(npc)}
            className="absolute z-20 group flex flex-col items-center gap-1 transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 pointer-events-auto"
            style={{ top: pos.top, left: pos.left }}
          >
            {/* Pulse ring */}
            <span className="absolute w-14 h-14 rounded-full bg-primary/20 animate-ping" />

            {/* Avatar circle */}
            <div
              className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-cinzel font-bold shadow-lg backdrop-blur-sm transition-colors ${
                isVisited
                  ? 'border-green-400 bg-green-900/60 text-green-200'
                  : 'border-primary bg-background/70 text-primary'
              }`}
            >
              {npc.name.charAt(0)}
              {isVisited && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background flex items-center justify-center text-[8px] text-background">✓</span>
              )}
            </div>

            {/* Name label */}
            <span className="npc-label px-2 py-0.5 rounded-md text-xs font-cinzel font-bold text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {npc.name}
            </span>
          </button>
        );
      })}
      </div>
    </div>
  );
}
