import { useState, useEffect } from 'react';
import { NPCData, npcData as fallbackData } from '@/data/npcData';
import { ScreenConfig } from '@/components/EnvironmentScreens';

interface ScenarioCharacter {
  id: string;
  name: string;
  title: string;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation: number;
  color: string;
  robeColor: string;
  description: string;
  glbModel?: string;
}

interface ScenarioDialog {
  character_id: string;
  question: string;
  answer: string;
}

interface ScenarioFact {
  character_id: string;
  fact: string;
}

interface ScenarioJSON {
  characters: ScenarioCharacter[];
  dialogs: ScenarioDialog[];
  facts: ScenarioFact[];
  screens?: ScreenConfig;
}

function parseScenario(data: ScenarioJSON): { npcs: NPCData[]; screens?: ScreenConfig } {
  const npcs = data.characters.map((char) => ({
    id: char.id,
    name: char.name,
    title: char.title,
    position: [char.position_x, char.position_y, char.position_z] as [number, number, number],
    rotation: char.rotation,
    color: char.color,
    robeColor: char.robeColor,
    description: char.description,
    glbModel: char.glbModel || undefined,
    dialogs: data.dialogs
      .filter((d) => d.character_id === char.id)
      .map((d) => ({ question: d.question, answer: d.answer })),
    historicalFacts: data.facts
      .filter((f) => f.character_id === char.id)
      .map((f) => f.fact),
  }));
  return { npcs, screens: data.screens };
}

export function useScenario(scenarioName = 'default') {
  const [npcs, setNpcs] = useState<NPCData[]>(fallbackData);
  const [screens, setScreens] = useState<ScreenConfig | undefined>();
  const [source, setSource] = useState<'fallback' | 'json'>('fallback');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/scenarios/${scenarioName}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: ScenarioJSON) => {
        if (cancelled) return;
        const parsed = parseScenario(data);
        if (parsed.npcs.length > 0) {
          setNpcs(parsed.npcs);
          setSource('json');
        }
        if (parsed.screens) {
          setScreens(parsed.screens);
        }
      })
      .catch(() => {
        // Fallback — keep hardcoded data
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [scenarioName]);

  return { npcs, screens, source, loading };
}
