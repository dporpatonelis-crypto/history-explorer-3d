import { useState, useEffect } from 'react';
import { NPCData, npcData as fallbackData } from '@/data/npcData';
import { InteractiveMediaConfig, ScreenConfig } from '@/components/EnvironmentScreens';
import { ScenarioProp } from '@/components/ScenarioProps';

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
  scale?: number;
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
  interactive?: InteractiveMediaConfig;
  props?: ScenarioProp[];
}

function sanitizeScreens(screens?: ScreenConfig): ScreenConfig | undefined {
  if (!screens) return undefined;
  const clean: ScreenConfig = { left_image_url: '', right_image_url: '' };
  // Validate URLs: must start with http or /
  if (screens.left_image_url && /^(https?:\/\/|\/)/.test(screens.left_image_url.trim())) {
    clean.left_image_url = screens.left_image_url.trim();
  } else if (screens.left_image_url) {
    console.warn('[useScenario] Invalid left_image_url, skipping:', screens.left_image_url);
  }
  if (screens.right_image_url && /^(https?:\/\/|\/)/.test(screens.right_image_url.trim())) {
    clean.right_image_url = screens.right_image_url.trim();
  } else if (screens.right_image_url) {
    console.warn('[useScenario] Invalid right_image_url, skipping:', screens.right_image_url);
  }
  if (screens.left_label) clean.left_label = screens.left_label;
  if (screens.right_label) clean.right_label = screens.right_label;
  return clean;
}

function sanitizeInteractive(interactive?: InteractiveMediaConfig): InteractiveMediaConfig | undefined {
  if (!interactive?.video_url?.trim() || !/^(https?:\/\/|\/)/.test(interactive.video_url.trim())) {
    return undefined;
  }
  return {
    video_url: interactive.video_url.trim(),
    target_screen: interactive.target_screen === 'left' ? 'left' : 'right',
    ...(interactive.label?.trim() ? { label: interactive.label.trim() } : {}),
  };
}

function parseScenario(data: ScenarioJSON): {
  npcs: NPCData[];
  screens?: ScreenConfig;
  interactive?: InteractiveMediaConfig;
} {
  const npcs = data.characters.map((char) => ({
    id: char.id,
    name: char.name,
    title: char.title,
    position: [char.position_x, char.position_y, char.position_z] as [number, number, number],
    rotation: char.rotation,
    color: char.color,
    robeColor: char.robeColor,
    description: char.description,
    glbModel: char.glbModel?.trim() || undefined,
    scale: char.scale || undefined,
    dialogs: data.dialogs
      .filter((d) => d.character_id === char.id)
      .map((d) => ({ question: d.question, answer: d.answer })),
    historicalFacts: data.facts
      .filter((f) => f.character_id === char.id)
      .map((f) => f.fact),
  }));
  return {
    npcs,
    screens: sanitizeScreens(data.screens),
    interactive: sanitizeInteractive(data.interactive),
  };
}

export function useScenario(scenarioName = 'default') {
  const [npcs, setNpcs] = useState<NPCData[]>(fallbackData);
  const [screens, setScreens] = useState<ScreenConfig | undefined>();
  const [source, setSource] = useState<'fallback' | 'json'>('fallback');
  const [loading, setLoading] = useState(true);
  const [rawScenario, setRawScenario] = useState<ScenarioJSON | null>(null);
  const [props, setProps] = useState<ScenarioProp[] | undefined>();
  const [interactive, setInteractive] = useState<InteractiveMediaConfig | undefined>();

  const applyScenario = (data: ScenarioJSON) => {
    setRawScenario(data);
    const parsed = parseScenario(data);
    if (parsed.npcs.length > 0) {
      setNpcs(parsed.npcs);
      setSource('json');
    }
    setScreens(parsed.screens);
    setInteractive(parsed.interactive);
    setProps(Array.isArray(data.props) ? data.props.filter((p) => p?.glbModel?.trim()) : undefined);
  };

  useEffect(() => {
    let cancelled = false;

    fetch(`/scenarios/${scenarioName}.json?v=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: ScenarioJSON) => {
        if (cancelled) return;
        applyScenario(data);
      })
      .catch(() => {
        // Fallback — keep hardcoded data
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [scenarioName]);

  return { npcs, screens, interactive, props, source, loading, rawScenario, applyScenario };
}
