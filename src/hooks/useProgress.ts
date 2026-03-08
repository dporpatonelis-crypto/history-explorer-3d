import { useState, useEffect } from 'react';

export function useProgress() {
  const [visited, setVisited] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('ancientAgora_progress');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem('ancientAgora_progress', JSON.stringify([...visited]));
  }, [visited]);

  const markVisited = (npcId: string) => {
    setVisited(prev => new Set(prev).add(npcId));
  };

  const resetProgress = () => {
    setVisited(new Set());
    localStorage.removeItem('ancientAgora_progress');
  };

  return { visited, markVisited, resetProgress };
}
