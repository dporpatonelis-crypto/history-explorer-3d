import { Component, useEffect, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { diagnosticMessage, getVRDiagnostics } from '@/lib/vrDiagnostics';

function downloadReport() {
  const url = URL.createObjectURL(new Blob([getVRDiagnostics().export()], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'history-explorer-vr-report.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { getVRDiagnostics().record('scene-error', { message: diagnosticMessage(error) }); }
  render() {
    return this.state.failed ? (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p>Η σκηνή σταμάτησε λόγω σφάλματος. Αποθήκευσε την αναφορά πριν τη φορτώσεις ξανά.</p>
        <button className="progress-badge rounded-lg px-4 py-2" onClick={downloadReport}>Αποθήκευση αναφοράς VR</button>
        <button className="progress-badge rounded-lg px-4 py-2" onClick={() => window.location.reload()}>Φόρτωση ξανά</button>
      </div>
    ) : this.props.children;
  }
}

interface Props {
  disableShadows: boolean;
  hideHoverMarkers: boolean;
  onShadowsChange: (value: boolean) => void;
  onHoverMarkersChange: (value: boolean) => void;
}

export function VRDiagnosticsPanel({ disableShadows, hideHoverMarkers, onShadowsChange, onHoverMarkersChange }: Props) {
  const [open, setOpen] = useState(false);
  const [graphicsLost, setGraphicsLost] = useState(false);
  useEffect(() => {
    getVRDiagnostics();
    const lost = () => { setGraphicsLost(true); setOpen(true); };
    const restored = () => setGraphicsLost(false);
    window.addEventListener('lesson-graphics-lost', lost);
    window.addEventListener('lesson-graphics-restored', restored);
    return () => {
      window.removeEventListener('lesson-graphics-lost', lost);
      window.removeEventListener('lesson-graphics-restored', restored);
    };
  }, []);
  return (
    <>
      <button className="fixed left-4 top-24 z-40 progress-badge rounded-lg px-3 py-2 text-sm" onClick={() => setOpen(true)}>Έλεγχος VR</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Έλεγχος VR</DialogTitle>
            <DialogDescription>Αποθήκευσε τα στοιχεία ενός προβλήματος ή δοκίμασε τις δύο επιλογές ξεχωριστά.</DialogDescription>
          </DialogHeader>
          {graphicsLost && <p role="alert">Διακόπηκε η λειτουργία των γραφικών.</p>}
          <p className="text-sm">Αν μαυρίσει η σκηνή, βγες από το VR και αποθήκευσε την αναφορά. Αν χρειαστεί, άνοιξε ξανά την ίδια σελίδα στο ίδιο πρόγραμμα και στην ίδια συσκευή.</p>
          <p className="text-sm">Η αναφορά κρατά τα πρόσφατα συμβάντα γραφικών και βίντεο στη συσκευή σου και δεν αποστέλλεται αυτόματα.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hideHoverMarkers} onChange={event => onHoverMarkersChange(event.target.checked)} />
            Δοκιμή χωρίς κύκλους επιλογής
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={disableShadows} onChange={event => onShadowsChange(event.target.checked)} />
            Δοκιμή χωρίς σκιές
          </label>
          <button className="progress-badge rounded-lg px-4 py-2" onClick={downloadReport}>Αποθήκευση αναφοράς VR</button>
        </DialogContent>
      </Dialog>
    </>
  );
}
