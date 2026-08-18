import { useRef, useState } from 'react';
import { Boxes, Upload, Trash2, X } from 'lucide-react';
import type { ScenarioProp } from './ScenarioProps';

export interface ExtraModel extends ScenarioProp {
  id: string;
  name: string;
}

interface ExtraModelsPanelProps {
  models: ExtraModel[];
  onChange: (models: ExtraModel[]) => void;
}

export function ExtraModelsPanel({ models, onChange }: ExtraModelsPanelProps) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const added: ExtraModel[] = Array.from(files)
      .filter((f) => /\.(glb|gltf)$/i.test(f.name))
      .map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: f.name,
        glbModel: URL.createObjectURL(f),
        position_x: 0,
        position_y: 0,
        position_z: 0,
        rotation: 0,
        scale: 1,
        idle: false,
      }));
    if (added.length) onChange([...models, ...added]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const update = (id: string, patch: Partial<ExtraModel>) =>
    onChange(models.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const remove = (id: string) => {
    const target = models.find((m) => m.id === id);
    if (target?.glbModel.startsWith('blob:')) URL.revokeObjectURL(target.glbModel);
    onChange(models.filter((m) => m.id !== id));
  };

  const numField = (
    label: string,
    value: number,
    step: number,
    onSet: (v: number) => void
  ) => (
    <label className="flex flex-col gap-1">
      <span className="font-cinzel text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onSet(Number(e.target.value))}
        className="w-full rounded-md border border-border bg-background/60 px-2 py-1 text-xs text-foreground"
      />
    </label>
  );

  return (
    <>
      <div className="fixed top-16 right-4 z-40">
        <button
          onClick={() => setOpen(true)}
          className="progress-badge flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md hover:bg-secondary/40 transition-colors"
          title="Προσωρινά extra μοντέλα από τοπικά αρχεία"
        >
          <Boxes size={16} className="text-foreground" />
          <span className="font-cinzel text-xs font-semibold text-foreground">
            Extra Models{models.length ? ` (${models.length})` : ''}
          </span>
        </button>
      </div>

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
                <Boxes size={20} className="text-foreground" />
                <h2 className="font-cinzel text-lg font-bold text-foreground">Extra Μοντέλα</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-md hover:bg-secondary/40 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 border-b border-border">
              <input
                ref={fileRef}
                type="file"
                accept=".glb,.gltf"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-secondary/40 transition-colors"
              >
                <Upload size={16} />
                <span className="font-cinzel text-xs font-semibold">Φόρτωση GLB από υπολογιστή</span>
              </button>
              <p className="mt-2 font-cormorant text-xs text-muted-foreground">
                Τα μοντέλα είναι προσωρινά (χάνονται με την ανανέωση). Για μόνιμα, χρησιμοποίησε το
                πεδίο <code>props</code> στο JSON σενάριο.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {models.length === 0 && (
                <p className="text-center font-cormorant text-muted-foreground">
                  Δεν έχει φορτωθεί κανένα extra μοντέλο.
                </p>
              )}
              {models.map((m) => (
                <div key={m.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-cinzel text-xs font-semibold text-foreground truncate">
                      {m.name}
                    </span>
                    <button
                      onClick={() => remove(m.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/20 text-destructive transition-colors"
                      title="Αφαίρεση"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {numField('X', m.position_x ?? 0, 0.5, (v) => update(m.id, { position_x: v }))}
                    {numField('Y', m.position_y ?? 0, 0.1, (v) => update(m.id, { position_y: v }))}
                    {numField('Z', m.position_z ?? 0, 0.5, (v) => update(m.id, { position_z: v }))}
                    {numField('Rot°', m.rotation ?? 0, 15, (v) => update(m.id, { rotation: v }))}
                    {numField('Scale', m.scale ?? 1, 0.25, (v) =>
                      update(m.id, { scale: Math.max(0.05, v) })
                    )}
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs font-cormorant text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={m.idle !== false}
                      onChange={(e) => update(m.id, { idle: e.target.checked })}
                    />
                    Idle κίνηση
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
