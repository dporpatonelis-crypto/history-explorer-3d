export interface LabeledScenarioProp {
  id?: string;
  dialog_label?: string;
}

export function resolvePropInteractionLabel(
  prop: LabeledScenarioProp,
  interactivePropId?: string,
): string {
  return prop.dialog_label?.trim()
    || (prop.id === interactivePropId ? 'Dimitris quiz' : 'Αλληλεπίδραση');
}
