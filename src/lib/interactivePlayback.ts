export function shouldLoopInteractiveVideo(purpose: string, loop?: boolean): boolean {
  return loop ?? purpose === 'quiz-reward';
}

/** Keep speech audible at supported media rates; omitted rates preserve old scenarios. */
export function resolveInteractivePlaybackRate(rate?: number): number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate >= 0.25 && rate <= 4
    ? rate
    : 1;
}
