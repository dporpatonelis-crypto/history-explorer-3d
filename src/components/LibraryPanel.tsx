import { useState, useEffect } from 'react';
import { Library, Download, X, FileText, RefreshCw } from 'lucide-react';

interface ScenarioEntry {
  file: string;
  title: string;
  description?: string;
  thumbnail?: string;
}

interface Manifest {
  scenarios: ScenarioEntry[];
}

interface LibraryPanelProps {
  currentScenario: any;
  onLoadScenario: (data: any) => void;
}

export function LibraryPanel({ currentScenario, onLoadScenario }: LibraryPanelProps) {
  const [open, setOpen] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadManifest = () => {
    setLoading(true);
    setError(null);
    fetch(`/data/manifest.json?v=${Date.now()}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Manifest not found');
        return res.json();
      })
      .then((data: Manifest) => {
        setScenarios(data.scenarios || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) loadManifest();
  }, [open]);

  const handleLoad = async (file: string) => {
    try {
      const res = await fetch(`/data/${file}?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load scenario');
      const data = await res.json();
      onLoadScenario(data);
      setOpen(false);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSave = () => {
    if (!currentScenario) return;
    const blob = new Blob([JSON.stringify(currentScenario, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    a.download = `scenario-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Trigger buttons */}
      <div className="fixed top-4 right-4 z-40 flex gap-2">
        <button
          onClick={() => setOpen(true)}
          className="progress-badge flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md hover:bg-secondary/40 transition-colors"
          title="Βιβλιοθήκη σεναρίων"
        >
          <Library size={16} className="text-foreground" />
          <span className="font-cinzel text-xs font-semibold text-foreground">Βιβλιοθήκη</span>
        </button>
        <button
          onClick={handleSave}
          disabled={!currentScenario}
          className="progress-badge flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md hover:bg-secondary/40 transition-colors disabled:opacity-50"
          title="Αποθήκευση τρέχοντος σεναρίου ως JSON"
        >
          <Download size={16} className="text-foreground" />
          <span className="font-cinzel text-xs font-semibold text-foreground">Αποθήκευση</span>
        </button>
      </div>

      {/* Library modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="dialog-panel rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Library size={20} className="text-foreground" />
                <h2 className="font-cinzel text-lg font-bold text-foreground">
                  Βιβλιοθήκη Σεναρίων
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadManifest}
                  className="p-2 rounded-md hover:bg-secondary/40 transition-colors"
                  title="Ανανέωση"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-md hover:bg-secondary/40 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading && (
                <p className="text-center font-cormorant text-muted-foreground">Φόρτωση...</p>
              )}
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {!loading && !error && scenarios.length === 0 && (
                <p className="text-center font-cormorant text-muted-foreground">
                  Δεν βρέθηκαν σενάρια στο <code>public/data/</code>
                </p>
              )}
              <div className="grid gap-3">
                {scenarios.map((s) => (
                  <button
                    key={s.file}
                    onClick={() => handleLoad(s.file)}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors text-left"
                  >
                    <FileText size={20} className="text-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-cinzel text-sm font-semibold text-foreground">
                        {s.title}
                      </h3>
                      {s.description && (
                        <p className="font-cormorant text-sm text-muted-foreground mt-1">
                          {s.description}
                        </p>
                      )}
                      <p className="font-mono text-xs text-muted-foreground/70 mt-1">{s.file}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-border bg-secondary/20">
              <p className="font-cormorant text-xs text-muted-foreground text-center">
                Πρόσθεσε νέα σενάρια στο <code>public/data/</code> και ενημέρωσε το <code>manifest.json</code>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
