import { npcData } from '@/data/npcData';
import { RotateCcw, Zap, ZapOff } from 'lucide-react';

interface ProgressTrackerProps {
  visited: Set<string>;
  onReset: () => void;
  performanceMode: boolean;
  onTogglePerformance: () => void;
}

export function ProgressTracker({ visited, onReset, performanceMode, onTogglePerformance }: ProgressTrackerProps) {
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
          <button
            onClick={onTogglePerformance}
            className={`p-1.5 rounded-lg transition-colors ${
              performanceMode
                ? 'bg-accent/20 text-accent'
                : 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
            title={performanceMode ? 'Performance Mode: ON' : 'Performance Mode: OFF'}
          >
            {performanceMode ? <ZapOff size={14} /> : <Zap size={14} />}
          </button>
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
        {performanceMode && (
          <p className="font-cormorant text-[10px] text-accent mt-1">⚡ Λειτουργία χαμηλής κατανάλωσης</p>
        )}
      </div>
    </div>
  );
}
