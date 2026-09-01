import { useState, useEffect } from 'react';
import { NPCData, npcData as fallbackData } from '@/data/npcData';
import { InteractiveMediaConfig, ScreenConfig } from '@/components/EnvironmentScreens';
import { ScenarioProp } from '@/components/ScenarioProps';
import { LessonQuiz, QuizQuestion } from '@/data/quizData';

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

interface ScenarioCompletion {
  required_character_ids: string[];
}

interface ScenarioQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  audio_url?: string;
}

interface ScenarioQuiz {
  id: string;
  host_prop_id: string;
  host_name?: string;
  host_title?: string;
  intro?: string;
  pass_score: number;
  reward_text: string;
  reward_audio_url?: string;
  questions: ScenarioQuizQuestion[];
}

interface ScenarioJSON {
  characters: ScenarioCharacter[];
  dialogs: ScenarioDialog[];
  facts: ScenarioFact[];
  screens?: ScreenConfig;
  interactive?: InteractiveMediaConfig;
  props?: ScenarioProp[];
  completion?: ScenarioCompletion;
  quiz?: ScenarioQuiz;
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

function sanitizeMediaUrl(value?: string): string | undefined {
  const clean = value?.trim();
  return clean && /^(https?:\/\/|\/)/.test(clean) ? clean : undefined;
}

function sanitizeCompletion(
  completion: ScenarioCompletion | undefined,
  characterIds: Set<string>,
): string[] | undefined {
  if (!Array.isArray(completion?.required_character_ids)) return undefined;
  const ids = [...new Set(completion.required_character_ids.filter((id) => characterIds.has(id)))];
  return ids.length ? ids : undefined;
}

function sanitizeQuiz(quiz?: ScenarioQuiz): LessonQuiz | undefined {
  if (!quiz || !Array.isArray(quiz.questions)) return undefined;

  const questions = quiz.questions.reduce<QuizQuestion[]>((valid, question) => {
    const options = Array.isArray(question.options)
      ? question.options.map((option) => option?.trim()).filter(Boolean)
      : [];
    const correctIndex = Number(question.correct_index);
    if (
      !question.id?.trim() ||
      !question.prompt?.trim() ||
      options.length < 2 ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= options.length
    ) {
      return valid;
    }

    valid.push({
      id: question.id.trim(),
      prompt: question.prompt.trim(),
      options,
      correctIndex,
      ...(question.explanation?.trim() ? { explanation: question.explanation.trim() } : {}),
      ...(sanitizeMediaUrl(question.audio_url) ? { audioUrl: sanitizeMediaUrl(question.audio_url) } : {}),
    });
    return valid;
  }, []);

  if (!quiz.id?.trim() || !quiz.host_prop_id?.trim() || !quiz.reward_text?.trim() || !questions.length) {
    return undefined;
  }

  const requestedPassScore = Number(quiz.pass_score);
  const passScore = Number.isInteger(requestedPassScore)
    ? Math.min(Math.max(requestedPassScore, 1), questions.length)
    : Math.ceil((questions.length * 2) / 3);

  return {
    id: quiz.id.trim(),
    hostPropId: quiz.host_prop_id.trim(),
    hostName: quiz.host_name?.trim() || 'Δημήτρης',
    hostTitle: quiz.host_title?.trim() || 'Συντονιστής κατανόησης',
    intro: quiz.intro?.trim() || 'Απάντησε στις ερωτήσεις κατανόησης.',
    passScore,
    rewardText: quiz.reward_text.trim(),
    ...(sanitizeMediaUrl(quiz.reward_audio_url)
      ? { rewardAudioUrl: sanitizeMediaUrl(quiz.reward_audio_url) }
      : {}),
    questions,
  };
}

function parseScenario(data: ScenarioJSON): {
  npcs: NPCData[];
  screens?: ScreenConfig;
  interactive?: InteractiveMediaConfig;
  completionIds?: string[];
  quiz?: LessonQuiz;
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
    completionIds: sanitizeCompletion(
      data.completion,
      new Set(data.characters.map((character) => character.id)),
    ),
    quiz: sanitizeQuiz(data.quiz),
  };
}

function previewDataUrl(): string | null {
  const value = new URLSearchParams(window.location.search).get('dataUrl');
  if (!value) return null;
  try {
    const parsed = new URL(value, window.location.href);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function validateProtectedScenario(candidate: ScenarioJSON, template: ScenarioJSON): void {
  const requiredKeys = ['characters', 'dialogs', 'facts', 'props', 'screens'];
  const allowedKeys = new Set([...requiredKeys, 'interactive', 'completion', 'quiz']);
  const actualKeys = Object.keys(candidate);
  if (requiredKeys.some((key) => !actualKeys.includes(key)) || actualKeys.some((key) => !allowedKeys.has(key))) {
    throw new Error('Scenario may contain only characters, dialogs, facts, props, screens and interactive media');
  }
  if (stableJson(candidate.characters) !== stableJson(template.characters)) {
    throw new Error('Protected characters/models differ from the default template');
  }
  if (stableJson(candidate.props ?? []) !== stableJson(template.props ?? [])) {
    throw new Error('Protected props differ from the default template');
  }
  const allowedIds = new Set(template.characters.map((character) => character.id));
  if (!Array.isArray(candidate.dialogs) || candidate.dialogs.some((dialog) =>
    !allowedIds.has(dialog.character_id) || !dialog.question?.trim() || !dialog.answer?.trim())) {
    throw new Error('Scenario contains an invalid dialog');
  }
  if (!Array.isArray(candidate.facts) || candidate.facts.some((fact) =>
    !allowedIds.has(fact.character_id) || !fact.fact?.trim())) {
    throw new Error('Scenario contains an invalid historical fact');
  }
  const screenKeys = Object.keys(candidate.screens ?? {}).sort();
  if (JSON.stringify(screenKeys) !== JSON.stringify(['left_image_url', 'left_label', 'right_image_url', 'right_label'])) {
    throw new Error('Screens must contain only the two media URLs and labels');
  }
  if (candidate.interactive) {
    const interactiveKeys = Object.keys(candidate.interactive);
    if (
      interactiveKeys.some((key) => !['label', 'target_screen', 'video_url'].includes(key)) ||
      !sanitizeInteractive(candidate.interactive)
    ) {
      throw new Error('Interactive media contains invalid fields or URL');
    }
  }
  if (candidate.completion && !sanitizeCompletion(candidate.completion, allowedIds)) {
    throw new Error('Completion must contain valid required character ids');
  }
  if (candidate.quiz && !sanitizeQuiz(candidate.quiz)) {
    throw new Error('Quiz contains invalid questions, scoring or media fields');
  }
}

export function useScenario(scenarioName = 'default') {
  const [npcs, setNpcs] = useState<NPCData[]>(fallbackData);
  const [screens, setScreens] = useState<ScreenConfig | undefined>();
  const [source, setSource] = useState<'fallback' | 'json'>('fallback');
  const [loading, setLoading] = useState(true);
  const [rawScenario, setRawScenario] = useState<ScenarioJSON | null>(null);
  const [props, setProps] = useState<ScenarioProp[] | undefined>();
  const [interactive, setInteractive] = useState<InteractiveMediaConfig | undefined>();
  const [completionIds, setCompletionIds] = useState<string[] | undefined>();
  const [quiz, setQuiz] = useState<LessonQuiz | undefined>();

  const applyScenario = (data: ScenarioJSON) => {
    setRawScenario(data);
    const parsed = parseScenario(data);
    if (parsed.npcs.length > 0) {
      setNpcs(parsed.npcs);
      setSource('json');
    }
    setScreens(parsed.screens);
    setInteractive(parsed.interactive);
    setCompletionIds(parsed.completionIds);
    setQuiz(parsed.quiz);
    setProps(Array.isArray(data.props) ? data.props.filter((p) => p?.glbModel?.trim()) : undefined);
  };

  useEffect(() => {
    let cancelled = false;
    const externalUrl = previewDataUrl();
    const defaultUrl = `/scenarios/${scenarioName}.json?v=${Date.now()}`;

    const load = async () => {
      try {
        const templateResponse = await fetch(defaultUrl, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        if (!templateResponse.ok) throw new Error(`Default template HTTP ${templateResponse.status}`);
        const template = await templateResponse.json() as ScenarioJSON;
        let data = template;
        if (externalUrl) {
          const response = await fetch(externalUrl, { cache: 'no-store' });
          if (!response.ok) throw new Error(`Sacred dataUrl HTTP ${response.status}`);
          const candidate = await response.json() as ScenarioJSON;
          validateProtectedScenario(candidate, template);
          data = {
            ...candidate,
            interactive: candidate.interactive ?? template.interactive,
          };
        }
        if (!cancelled) applyScenario(data);
        if (externalUrl) console.info('[useScenario] Loaded protected Sacred Studio scenario');
      } catch (error) {
        console.error('[useScenario] Scenario load failed:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => { cancelled = true; };
  }, [scenarioName]);

  return {
    npcs,
    screens,
    interactive,
    props,
    completionIds,
    quiz,
    source,
    loading,
    rawScenario,
    applyScenario,
  };
}
