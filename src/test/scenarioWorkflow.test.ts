import { describe, expect, it } from 'vitest';
import defaultScenario from '../../public/scenarios/default.json';
import divineEconomyScenario from '../../public/data/to-schedio-tis-theias-oikonomias.json';
import { resolvePropInteractionLabel } from '../lib/scenarioPropLabels';

describe('scenario-scoped completion workflow', () => {
  it('keeps the default scenario free of an automatic quiz workflow', () => {
    expect('completion' in defaultScenario).toBe(false);
    expect('quiz' in defaultScenario).toBe(false);
  });

  it('configures the Divine Economy scenario explicitly', () => {
    expect(divineEconomyScenario.completion.required_character_ids).toHaveLength(5);
    expect(divineEconomyScenario.completion.reward_interactive.video_url)
      .toBe('/media/alexander-bucephalus-relay-v5-web.mp4');
    expect(divineEconomyScenario.quiz.pass_score).toBe(2);
    expect(divineEconomyScenario.quiz.questions).toHaveLength(3);
    expect(divineEconomyScenario.quiz.reward_interactive.video_url)
      .toBe('/media/theia-oikonomia-history-relay.mp4');
  });

  it('uses the Divine Economy relay by default but keeps Alexander model-specific', () => {
    expect(divineEconomyScenario.interactive.video_url)
      .toBe('/media/theia-oikonomia-history-relay.mp4');
    expect(divineEconomyScenario.character_interactives['Alexander.glb'].video_url)
      .toBe('/media/alexander-bucephalus-relay-v5-web.mp4');
  });

  it('keeps the bishop label separate from the Dimitris quiz host', () => {
    const bishop = divineEconomyScenario.props.find((prop) => prop.id === 'bishop');
    const dimitris = divineEconomyScenario.props.find((prop) => prop.id === 'dimitris');

    expect(bishop?.glbModel).toBe('/models/bishop_face_lipsync_optimized_v5.glb');
    expect(resolvePropInteractionLabel(bishop!, divineEconomyScenario.quiz.host_prop_id))
      .toBe('Ιεράρχης');
    expect(resolvePropInteractionLabel(dimitris!, divineEconomyScenario.quiz.host_prop_id))
      .toBe('Dimitris quiz');
  });
});
