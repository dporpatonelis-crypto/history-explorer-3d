type Details = Record<string, string | number | boolean | null>;
export interface DiagnosticEvent { at: string; type: string; details: Details }
interface Report { version: 1; activeXR: boolean; events: DiagnosticEvent[] }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export const VR_REPORT_KEY = 'history-explorer-vr-report-v1';
const MAX_EVENTS = 80;

/** Bounded, local-only history. Storage failure must never interrupt a lesson. */
export function createVRDiagnostics(storage?: StorageLike) {
  let report: Report = { version: 1, activeXR: false, events: [] };
  let persistent = Boolean(storage);
  try {
    const saved = JSON.parse(storage?.getItem(VR_REPORT_KEY) ?? 'null');
    if (saved?.version === 1 && typeof saved.activeXR === 'boolean' && Array.isArray(saved.events)) {
      report = { version: 1, activeXR: saved.activeXR, events: saved.events.filter(
        (event: DiagnosticEvent) => event && typeof event.at === 'string' && typeof event.type === 'string'
          && event.details && typeof event.details === 'object',
      ).slice(-MAX_EVENTS) };
    }
  } catch { /* Ignore stale or blocked storage. */ }

  function record(type: string, details: Details = {}) {
    if (type === 'xr-start') report.activeXR = true;
    if (type === 'xr-end') report.activeXR = false;
    report.events.push({ at: new Date().toISOString(), type, details });
    report.events = report.events.slice(-MAX_EVENTS);
    try { storage?.setItem(VR_REPORT_KEY, JSON.stringify(report)); }
    catch { persistent = false; }
  }

  function beginPage(userAgent: string) {
    // An unclosed session can also mean a refresh or browser shutdown, not necessarily a crash.
    if (report.activeXR) record('previous-xr-session-unclosed');
    report.activeXR = false;
    record('page-open', { userAgent: userAgent.slice(0, 400), diagnosticsVersion: 1 });
  }

  return { record, beginPage, export: () => JSON.stringify({ ...report, persistent }, null, 2) };
}

let diagnostics: ReturnType<typeof createVRDiagnostics>;
export function getVRDiagnostics() {
  if (!diagnostics) {
    let storage: StorageLike;
    try { storage = window.localStorage; } catch { /* Private browsing may block storage. */ }
    diagnostics = createVRDiagnostics(storage);
    diagnostics.beginPage(navigator.userAgent);
  }
  return diagnostics;
}

export function diagnosticMessage(error: unknown): string {
  return (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 500);
}

export function videoDiagnosticDetails(video: HTMLVideoElement): Details {
  let media = 'video';
  try { media = new URL(video.currentSrc || video.src, window.location.origin).pathname.split('/').pop() || 'video'; }
  catch { /* Keep the generic label. */ }
  return {
    media, purpose: video.dataset.lessonVideoPurpose ?? 'screen',
    time: Number(video.currentTime.toFixed(2)),
    duration: Number.isFinite(video.duration) ? video.duration : null,
    rate: video.playbackRate, paused: video.paused, readyState: video.readyState,
    width: video.videoWidth, height: video.videoHeight,
    errorCode: video.error?.code ?? null,
  };
}

export function observeVideoDiagnostics(video: HTMLVideoElement) {
  const types = ['loadedmetadata', 'playing', 'waiting', 'stalled', 'ended', 'error'] as const;
  const listeners = types.map(type => {
    const listener = () => getVRDiagnostics().record(`video-${type}`, videoDiagnosticDetails(video));
    video.addEventListener(type, listener);
    return () => video.removeEventListener(type, listener);
  });
  return () => listeners.forEach(remove => remove());
}
