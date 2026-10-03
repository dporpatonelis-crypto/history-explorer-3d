/** Older scenarios require every listed character; a threshold allows any N. */
export function resolveCompletionTarget(characterCount: number, requestedCount?: number): number {
  if (requestedCount === undefined || !Number.isInteger(requestedCount) || requestedCount < 1) return characterCount;
  return Math.min(requestedCount, characterCount);
}

export function getCompletionProgress(
  characterIds: string[],
  visited: ReadonlySet<string>,
  requestedCount?: number,
) {
  const ids = [...new Set(characterIds)];
  const target = resolveCompletionTarget(ids.length, requestedCount);
  const count = ids.filter((id) => visited.has(id)).length;
  return { count, target, reached: target > 0 && count >= target };
}
