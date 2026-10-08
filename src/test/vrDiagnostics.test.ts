import { describe, expect, it, vi } from 'vitest';
import { createVRDiagnostics, videoDiagnosticDetails, VR_REPORT_KEY } from '@/lib/vrDiagnostics';

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('VR crash reports', () => {
  it('retains video position and context loss through a page restart', () => {
    const saved = storage();
    const first = createVRDiagnostics(saved);
    first.beginPage('Quest browser');
    first.record('xr-start');
    first.record('video-playing', { media: 'reward.mp4', time: 31 });
    first.record('webgl-context-lost');
    const restarted = createVRDiagnostics(saved);
    restarted.beginPage('Quest browser');
    const report = JSON.parse(restarted.export());
    expect(report.events.map((event: { type: string }) => event.type)).toContain('webgl-context-lost');
    expect(report.events.find((event: { type: string }) => event.type === 'video-playing').details.time).toBe(31);
    expect(report.events.map((event: { type: string }) => event.type)).toContain('previous-xr-session-unclosed');
    expect(report.activeXR).toBe(false);
  });

  it('does not flag a normally ended session as unclosed', () => {
    const saved = storage();
    const first = createVRDiagnostics(saved);
    first.record('xr-start');
    first.record('xr-end');
    const restarted = createVRDiagnostics(saved);
    restarted.beginPage('browser');
    expect(restarted.export()).not.toContain('previous-xr-session-unclosed');
  });

  it('bounds the history and keeps the latest fault', () => {
    const report = createVRDiagnostics(storage());
    for (let index = 0; index < 200; index++) report.record('sample', { index });
    report.record('video-error', { time: 12 });
    const events = JSON.parse(report.export()).events;
    expect(events).toHaveLength(80);
    expect(events.at(-1).type).toBe('video-error');
  });

  it('continues in memory when browser storage fails', () => {
    const blocked = { getItem: vi.fn(() => { throw new Error('denied'); }),
      setItem: vi.fn(() => { throw new Error('quota'); }) };
    const report = createVRDiagnostics(blocked);
    expect(() => report.record('webgl-context-lost')).not.toThrow();
    expect(JSON.parse(report.export()).persistent).toBe(false);
    expect(JSON.parse(report.export()).events[0].type).toBe('webgl-context-lost');
  });

  it('discards malformed saved reports', () => {
    const saved = storage();
    saved.setItem(VR_REPORT_KEY, '{broken');
    expect(JSON.parse(createVRDiagnostics(saved).export()).events).toEqual([]);
    saved.setItem(VR_REPORT_KEY, JSON.stringify({ version: 1, activeXR: false, events: [null, {}] }));
    expect(JSON.parse(createVRDiagnostics(saved).export()).events).toEqual([]);
  });

  it('records video decode state without exporting its query or fragment', () => {
    const video = document.createElement('video');
    video.src = 'https://example.com/reward.mp4?token=private#fragment';
    video.dataset.lessonVideoPurpose = 'completion-reward';
    video.currentTime = 12.75;
    video.playbackRate = 2 / 3;
    const details = videoDiagnosticDetails(video);
    expect(details.media).toBe('reward.mp4');
    expect(details.time).toBe(12.75);
    expect(details.rate).toBeCloseTo(2 / 3);
    expect(details.duration).toBeNull();
    expect(JSON.stringify(details)).not.toContain('private');
  });
});
