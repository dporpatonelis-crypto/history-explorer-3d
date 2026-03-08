import { useState } from 'react';
import { NPCData } from '@/data/npcData';
import { X, ChevronRight, BookOpen, ScrollText, Sparkles, ExternalLink } from 'lucide-react';

interface DialogPanelProps {
  npc: NPCData;
  onClose: () => void;
}

export function DialogPanel({ npc, onClose }: DialogPanelProps) {
  const [activeTab, setActiveTab] = useState<'dialog' | 'facts' | 'interactive'>('dialog');
  const [selectedDialog, setSelectedDialog] = useState<number | null>(null);
  const interactiveBoardUrl = import.meta.env.VITE_MIND_WEAVER_URL ?? '/projects/dc70f638-3c2d-4ffe-a28d-1ef03fa06b32';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
      <div
        className="dialog-panel relative w-full max-w-lg rounded-xl p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-cinzel text-2xl font-bold text-foreground">{npc.name}</h2>
            <p className="font-cormorant text-base text-muted-foreground italic">{npc.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <p className="font-cormorant text-base text-foreground/80 mb-4">{npc.description}</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => { setActiveTab('dialog'); setSelectedDialog(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-cinzel text-sm transition-colors ${
              activeTab === 'dialog'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <BookOpen size={14} /> Διάλογοι
          </button>
          <button
            onClick={() => setActiveTab('facts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-cinzel text-sm transition-colors ${
              activeTab === 'facts'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <ScrollText size={14} /> Ιστορικά
          </button>
          <button
            onClick={() => setActiveTab('interactive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-cinzel text-sm transition-colors ${
              activeTab === 'interactive'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <Sparkles size={14} /> Interactive
          </button>
        </div>

        {/* Content */}
        {activeTab === 'dialog' && (
          <div className="space-y-2">
            {selectedDialog === null ? (
              npc.dialogs.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDialog(i)}
                  className="w-full text-left p-3 rounded-lg bg-secondary/60 hover:bg-secondary transition-colors flex items-center justify-between group"
                >
                  <span className="font-cormorant text-base text-foreground">{d.question}</span>
                  <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              ))
            ) : (
              <div className="space-y-3">
                <p className="font-cinzel text-sm font-semibold text-primary">
                  {npc.dialogs[selectedDialog].question}
                </p>
                <div className="p-4 rounded-lg bg-secondary/40 border border-border">
                  <p className="font-cormorant text-base leading-relaxed text-foreground">
                    «{npc.dialogs[selectedDialog].answer}»
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDialog(null)}
                  className="text-sm font-cinzel text-accent hover:text-accent/80 transition-colors"
                >
                  ← Πίσω στις ερωτήσεις
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'facts' && (
          <ul className="space-y-2">
            {npc.historicalFacts.map((fact, i) => (
              <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/40">
                <span className="text-gold mt-0.5">◆</span>
                <span className="font-cormorant text-base text-foreground">{fact}</span>
              </li>
            ))}
          </ul>
        {activeTab === 'interactive' && (
          <div className="space-y-3 p-4 rounded-lg bg-secondary/40 border border-border">
            <p className="font-cormorant text-base text-foreground">
              Άνοιξε το διαδραστικό board για δραστηριότητες μαθητή στο Idea Weaver Board.
            </p>
            <a
              href={interactiveBoardUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-cinzel text-sm hover:opacity-90 transition-opacity"
            >
              Άνοιγμα Interactive Board <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
