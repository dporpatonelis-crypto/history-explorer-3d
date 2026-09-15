const BASE_URL = import.meta.env.BASE_URL;

export interface StartupScenarioConfig {
  file?: unknown;
}

export function resolveStartupScenarioUrl(config: unknown): string | null {
  if (!config || Array.isArray(config) || typeof config !== 'object') return null;
  const file = (config as StartupScenarioConfig).file;
  if (typeof file !== 'string') return null;

  const clean = file.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/.test(clean) || clean.includes('..')) {
    return null;
  }
  return BASE_URL + `data/${clean}`;
}
