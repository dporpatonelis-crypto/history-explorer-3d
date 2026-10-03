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

  it('retains the unaffected template characters, content and media in Jerusalem', () => {
    const replacedIds = new Set(['socrates', 'hypatia', 'moses', 'apostle-paul']);
    expect(jerusalemScenario.characters.filter((character) => !replacedIds.has(character.id))).toEqual(
      divineEconomyScenario.characters.filter((character) => character.name !== 'tree' && !replacedIds.has(character.id)),
    );
    expect(jerusalemScenario.characters.every((character) => character.name !== 'tree')).toBe(true);
    expect(jerusalemScenario.dialogs.filter((row) => !replacedIds.has(row.character_id)))
      .toEqual(divineEconomyScenario.dialogs.filter((row) => !replacedIds.has(row.character_id)));
    expect(jerusalemScenario.facts.filter((row) => !replacedIds.has(row.character_id)))
      .toEqual(divineEconomyScenario.facts.filter((row) => !replacedIds.has(row.character_id)));
    expect(jerusalemScenario.screens.right_image_url).toBe(divineEconomyScenario.screens.right_image_url);
    expect(jerusalemScenario.screens.right_label).toBe(divineEconomyScenario.screens.right_label);
    expect(jerusalemScenario.interactive).toEqual(divineEconomyScenario.interactive);
    expect(jerusalemScenario.character_interactives).toEqual(divineEconomyScenario.character_interactives);
    expect(jerusalemScenario.props.slice(0, 2)).toEqual(
      divineEconomyScenario.props.filter((prop) => prop.id !== 'agia_sophia'),
    );
  });

  it('replaces the two characters in place and keeps dialog and completion references valid', () => {
    for (const [oldId, newId, name] of [['socrates', 'moses', 'Μωυσής'], ['hypatia', 'apostle-paul', 'Απόστολος Παύλος']]) {
      const original = divineEconomyScenario.characters.find((character) => character.id === oldId)!;
      const replacement = jerusalemScenario.characters.find((character) => character.id === newId)!;
      expect(replacement.name).toBe(name);
      expect([replacement.position_x, replacement.position_y, replacement.position_z])
        .toEqual([original.position_x, original.position_y, original.position_z]);
      expect(jerusalemScenario.completion.required_character_ids).toContain(newId);
      expect(jerusalemScenario.completion.required_character_ids).not.toContain(oldId);
      expect(jerusalemScenario.dialogs.filter((row) => row.character_id === newId)).toHaveLength(2);
      expect(jerusalemScenario.facts.filter((row) => row.character_id === newId)).toHaveLength(2);
    }
    const ids = new Set(jerusalemScenario.characters.map((character) => character.id));
    expect([...jerusalemScenario.dialogs, ...jerusalemScenario.facts].every((row) => ids.has(row.character_id))).toBe(true);
    expect(jerusalemScenario.completion.required_character_ids.every((id) => ids.has(id))).toBe(true);
    expect(JSON.stringify(jerusalemScenario)).not.toMatch(/socrates|hypatia|σωκρατικ|Σωκράτης|Υπατία/);
  });

  it('places all six biblical objects in front of distinct character positions and clear of the guide', () => {
    const objects = jerusalemScenario.props.slice(2);
    expect(objects.map((prop) => prop.id).sort()).toEqual([
      'ark-of-covenant', 'bronze-serpent', 'budding-rod', 'covenant-tablets', 'lamb', 'manna-jar',
    ]);
    expect(new Set(objects.map((prop) => prop.position_x)).size).toBe(6);
    for (const prop of objects) {
      const character = jerusalemScenario.characters.find((npc) => npc.position_x === prop.position_x)!;
      expect(character).toBeDefined();
      expect(prop.position_z).toBeGreaterThan(character.position_z + 1);
      expect(Math.abs(prop.position_x)).toBeGreaterThan(2);
      expect(prop.idle).toBe(false);
      expect(prop.glbModel).toMatch(/^\/models\/jerusalem\/biblical\/.*_VR_1K\.glb$/);
    }
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
