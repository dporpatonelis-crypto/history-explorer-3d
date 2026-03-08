import { npcData } from '@/data/npcData';
import { RotateCcw } from 'lucide-react';

interface ProgressTrackerProps {
  visited: Set<string>;
  onReset: () => void;
}

export function ProgressTracker({ visited, onReset }: ProgressTrackerProps) {
  const total = npcData.length;
  const count = visited.size;
  const pct = Math.round((count / total) * 100);

  return (
    <div className="fixed top-4 left-4 z-40">
      <div className="progress-badge rounded-xl px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-cinzel text-xs font-semibold text-foreground">Πρόοδος</p>
            <p className="font-cormorant text-sm text-muted-foreground">
              {count}/{total} φιλόσοφοι
            </p>
          </div>
          <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {count > 0 && (
            <button
              onClick={onReset}
              className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Επαναφορά"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
