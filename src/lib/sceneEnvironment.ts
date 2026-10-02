export const JERUSALEM_ENVIRONMENT = 'jerusalem-time-of-christ' as const;
export const AGORA_ENVIRONMENT = 'agora' as const;

export type SceneEnvironmentId = typeof AGORA_ENVIRONMENT | typeof JERUSALEM_ENVIRONMENT;

export interface ScenePresentation {
  title: string;
  instruction: string;
}

const PRESENTATIONS: Record<SceneEnvironmentId, ScenePresentation> = {
  agora: {
    title: 'Αρχαία Αγορά — Εκπαιδευτική Εξερεύνηση',
    instruction: 'Κάνε κλικ σε έναν φιλόσοφο για να μάθεις περισσότερα',
  },
  [JERUSALEM_ENVIRONMENT]: {
    title: 'Ιεροσόλυμα την εποχή του Χριστού — Εκπαιδευτική Εξερεύνηση',
    instruction: 'Επίλεξε ένα πρόσωπο για να ανοίξεις τον διάλογο',
  },
};

/** Unknown or absent environment ids deliberately retain the historical Agora default. */
export function parseSceneEnvironment(value: unknown): SceneEnvironmentId {
  return value === JERUSALEM_ENVIRONMENT ? JERUSALEM_ENVIRONMENT : AGORA_ENVIRONMENT;
}

export function getScenePresentation(environment: SceneEnvironmentId): ScenePresentation {
  return PRESENTATIONS[environment];
}
