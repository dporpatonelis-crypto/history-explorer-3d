import { useCallback, useEffect, useState } from 'react';

function storageKeyFor(scope: string) {
  return scope === 'agora' ? 'ancientAgora_progress' : `ancientAgora_progress:${scope}`;
}

function readProgress(key: string): Set<string> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(saved)
      ? new Set(saved.filter((value): value is string => typeof value === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

export function useProgress(scope = 'agora') {
  const storageKey = storageKeyFor(scope);
  const [progress, setProgress] = useState(() => ({
    scope,
    visited: readProgress(storageKey),
  }));
  const visited = progress.scope === scope ? progress.visited : readProgress(storageKey);

  useEffect(() => {
    if (progress.scope !== scope) {
      setProgress({ scope, visited: readProgress(storageKey) });
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify([...progress.visited]));
  }, [progress, scope, storageKey]);

  const markVisited = useCallback((npcId: string) => {
    setProgress((previous) => {
      const current = previous.scope === scope ? previous.visited : readProgress(storageKey);
      return { scope, visited: new Set(current).add(npcId) };
    });
  }, [scope, storageKey]);

  const resetProgress = useCallback(() => {
    localStorage.removeItem(storageKey);
    setProgress({ scope, visited: new Set() });
  }, [scope, storageKey]);

  return { visited, markVisited, resetProgress };
}
