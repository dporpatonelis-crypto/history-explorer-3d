import { describe, expect, it } from 'vitest';
import divineEconomyScenario from '../../public/data/to-schedio-tis-theias-oikonomias.json';
import jerusalemScenario from '../../public/data/jerusalem-time-of-christ.json';
import {
  getScenePresentation,
  JERUSALEM_ENVIRONMENT,
  parseSceneEnvironment,
} from '../lib/sceneEnvironment';
import { resolveScenarioPreviewUrl } from '../lib/startupScenario';
import { resolveAssetUrl } from '../lib/assetUrl';

describe('optional scene environments', () => {
  it('keeps missing and unsupported environment ids on the Agora fallback', () => {
    expect(parseSceneEnvironment(undefined)).toBe('agora');
    expect(parseSceneEnvironment('unknown-scene')).toBe('agora');
  });

  it('uses the Jerusalem title and resolves only the named direct preview', () => {
    expect(parseSceneEnvironment(jerusalemScenario.environment)).toBe(JERUSALEM_ENVIRONMENT);
    expect(getScenePresentation(JERUSALEM_ENVIRONMENT).title)
      .toBe('Ιεροσόλυμα την εποχή του Χριστού — Εκπαιδευτική Εξερεύνηση');
    expect(resolveScenarioPreviewUrl(JERUSALEM_ENVIRONMENT)).toMatch(/\/data\/jerusalem-time-of-christ\.json$/);
    expect(resolveScenarioPreviewUrl('../active-scenario')).toBeNull();
  });

  it('retains the template lesson and removes only empty Agora scenery from Jerusalem', () => {
    expect(jerusalemScenario.characters).toEqual(
      divineEconomyScenario.characters.filter((character) => character.name !== 'tree'),
    );
    expect(jerusalemScenario.characters.every((character) => character.name !== 'tree')).toBe(true);
    expect(jerusalemScenario.dialogs).toEqual(divineEconomyScenario.dialogs);
    expect(jerusalemScenario.facts).toEqual(divineEconomyScenario.facts);
    expect(jerusalemScenario.screens.right_image_url).toBe(divineEconomyScenario.screens.right_image_url);
    expect(jerusalemScenario.screens.right_label).toBe(divineEconomyScenario.screens.right_label);
    expect(jerusalemScenario.interactive).toEqual(divineEconomyScenario.interactive);
    expect(jerusalemScenario.character_interactives).toEqual(divineEconomyScenario.character_interactives);
    expect(jerusalemScenario.completion).toEqual(divineEconomyScenario.completion);
    expect(jerusalemScenario.quiz).toEqual(divineEconomyScenario.quiz);
    expect(jerusalemScenario.props).toEqual(
      divineEconomyScenario.props.filter((prop) => prop.id !== 'agia_sophia'),
    );
  });

  it('uses the supplied Old Testament deck on the Jerusalem left screen in slide order', () => {
    const media = new URL(jerusalemScenario.screens.left_image_url, 'https://example.test');
    const slides = new URLSearchParams(media.hash.slice(1)).get('sb-slides')!.split('|');
    expect(slides).toEqual(Array.from({ length: 15 }, (_, index) =>
      `/media/old-testament/slide-${String(index + 1).padStart(2, '0')}.webp`));
    expect(media.pathname).toBe(slides[0]);
    expect(jerusalemScenario.screens.left_label).toBe('Από τη Σκιά στην Αλήθεια — Παλαιά και Καινή Διαθήκη');
  });

  it('keeps the environment id through the same JSON round-trip used by download', () => {
    expect(JSON.parse(JSON.stringify(jerusalemScenario)).environment).toBe(JERUSALEM_ENVIRONMENT);
  });

  it('resolves public model paths under the GitHub Pages base path exactly once', () => {
    expect(resolveAssetUrl('/models/jerusalem/temple.glb', '/history/'))
      .toBe('/history/models/jerusalem/temple.glb');
    expect(resolveAssetUrl('/history/models/jerusalem/temple.glb', '/history/'))
      .toBe('/history/models/jerusalem/temple.glb');
  });
});
