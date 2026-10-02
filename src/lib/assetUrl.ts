const BASE_URL = import.meta.env.BASE_URL;

/** Resolve root-relative public assets for both root hosting and GitHub Pages subpaths. */
export function resolveAssetUrl(value?: string, baseUrl = BASE_URL): string | undefined {
  const clean = value?.trim();
  if (!clean) return undefined;
  if (/^(https?:\/\/|blob:|data:)/i.test(clean)) return clean;

  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  if (clean.startsWith(base)) return clean;
  if (clean.startsWith('/')) return base + clean.replace(/^\/+/, '');
  return clean;
}
