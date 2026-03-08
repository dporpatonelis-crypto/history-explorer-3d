import { useState } from 'react';
import { NPCData, npcData } from '@/data/npcData';

interface AncientAgoraProps {
  visited: Set<string>;
  onNPCInteract: (npc: NPCData) => void;
  performanceMode: boolean;
}

const npcScreenPositions: Record<string, { top: string; left: string; scale: number; z: number }> = {
  socrates: { top: '61%', left: '41%', scale: 1.08, z: 32 },
  plato: { top: '59%', left: '60%', scale: 1.05, z: 31 },
  aristotle: { top: '54%', left: '51%', scale: 1.12, z: 33 },
  hypatia: { top: '65%', left: '47%', scale: 1, z: 30 },
  pythagoras: { top: '64%', left: '56%', scale: 1, z: 30 },
};

function buildEmbedUrl(performanceMode: boolean) {
  const base = 'https://sketchfab.com/models/4552d90409924583b1fadfc9953134cb/embed';
  const params = new URLSearchParams({
    autostart: performanceMode ? '0' : '1',
    preload: performanceMode ? '0' : '1',
    ui_hint: '0',
    ui_theme: 'dark',
    ui_controls: performanceMode ? '0' : '1',
    ui_infos: performanceMode ? '0' : '1',
    ui_inspector: '0',
    dnt: '1',
    ...(performanceMode && {
      transparent: '1',
      max_texture_size: '256',
    }),
  });
  return `${base}?${params.toString()}`;
}

export function AncientAgora({ visited, onNPCInteract, performanceMode }: AncientAgoraProps) {
  const [force3DLoad, setForce3DLoad] = useState(false);
  const useStaticFallback = performanceMode && !force3DLoad;

  return (
    <div className="relative w-full h-screen bg-background">
      {useStaticFallback ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-muted/60 via-background to-muted/60">
          <div className="rounded-2xl border border-border bg-card/90 px-5 py-4 text-center shadow-lg">
            <p className="font-cinzel text-sm text-foreground">Safe Performance Mode</p>
            <p className="font-cormorant text-sm text-muted-foreground">Το 3D απενεργοποιήθηκε για αποφυγή crash.</p>
            <button
              onClick={() => setForce3DLoad(true)}
              className="mt-3 rounded-md bg-primary px-3 py-1.5 font-cinzel text-xs text-primary-foreground transition-opacity hover:opacity-90"
            >
              Φόρτωση 3D προσωρινά
            </button>
          </div>
        </div>
      ) : (
        <iframe
          title="The Parthenon Rebuilt"
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; fullscreen; xr-spatial-tracking"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={buildEmbedUrl(performanceMode)}
        />
      )}

      <div className="absolute inset-0 z-20 pointer-events-none">
        {npcData.map((npc) => {
          const pos = npcScreenPositions[npc.id];
          if (!pos) return null;
          const isVisited = visited.has(npc.id);

          return (
            <button
              key={npc.id}
              onClick={() => onNPCInteract(npc)}
              className="absolute z-20 group flex flex-col items-center gap-1 pointer-events-auto transition-transform hover:scale-105"
              style={{
                top: pos.top,
                left: pos.left,
                zIndex: pos.z,
                transform: `translate(-50%, -50%) scale(${pos.scale})`,
              }}
            >
              {!performanceMode && (
                <span className="absolute w-14 h-14 rounded-full bg-primary/20 animate-ping" />
              )}

              <div
                className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-cinzel font-bold shadow-lg backdrop-blur-sm transition-colors ${
                  isVisited
                    ? 'border-primary bg-primary/80 text-primary-foreground'
                    : 'border-primary bg-background/80 text-primary'
                }`}
              >
                {npc.name.charAt(0)}
                {isVisited && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent border-2 border-background flex items-center justify-center text-[8px] text-accent-foreground">✓</span>
                )}
              </div>

              <span className="npc-label px-2 py-0.5 rounded-md text-xs font-cinzel font-bold text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-card/80">
                {npc.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
