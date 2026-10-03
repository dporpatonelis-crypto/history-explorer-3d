# Jerusalem environment for History Explorer 3D

The requested implementation runs in ChatGPT cloud. This branch stages the existing
Blender compact GLB exports and visual references; application code is unchanged.

## Approved scope

Add a separate library scenario, **Ιεροσόλυμα την εποχή του Χριστού**, to the existing
History Explorer 3D. Change the environment while keeping the same application and
interaction systems: desktop navigation, WebXR locomotion and respawn, NPC dialogs,
speech/lip sync, props, two media screens, completion workflow, quiz and rewards,
library selection, JSON import/export, and extra model uploads.

Use `public/data/to-schedio-tis-theias-oikonomias.json` as the working lesson template
so the new environment demonstrates the existing full workflow. Preserve its actual
lesson NPCs, dialogs, facts, interactive media, completion requirements, quiz and host.
Those are reusable lesson content, not claims that every NPC lived in first-century
Jerusalem. Replace only decorative environment entries (`name: "tree"`, with no
dialogs, facts or interactive media), the Agia Sophia decoration and the hardcoded
Agora backdrop. Do not invent new historical teaching content or rewrite existing
lessons. Keep the current startup pointer and existing scenarios intact.

## Available assets

All three exports use glTF Y-up coordinates, metres, embedded PNG textures up to 2K,
and a bottom-centre pivot. Geometry is retained without automatic LOD or decimation.
They are ordinary GLBs, not Git LFS pointers. The source Blender files and local
prototype are deliberately not required by the cloud task.

| Asset | Runtime URL | Size | Triangles | Dimensions X/Y/Z (metres) |
| --- | --- | ---: | ---: | --- |
| House | `/models/jerusalem/Jerusalem_House_compact_2k.glb` | 12,948,504 bytes | 50,000 | 6.34 / 8.80 / 7.07 |
| Market | `/models/jerusalem/Jerusalem_Market_compact_2k.glb` | 13,379,580 bytes | 50,000 | 3.47 / 2.45 / 1.94 |
| Temple complex | `/models/jerusalem/Jerusalem_Temple_compact_2k.glb` | 12,769,724 bytes | 48,346 | 58.00 / 28.00 / 68.84 |

The three files total 39,097,808 bytes (37.3 MiB). `assets.json` contains checksums,
exact bounds, texture information and the full geometry budget. Validate with
`python3 docs/jerusalem/inspect_assets.py`. The validator uses only the standard
library and checks GLB v2 headers, embedded buffer ranges, PNG dimensions, pivots,
triangle counts and the texture cap. No Blender installation is needed in the cloud.

Existing GitHub assets include `Dimitris.glb`, NPCs, `tree.glb` and
`ancient_tiles.glb`. `solomon_temple_optimized_v1.glb` is available, but the new
environment should use the supplied Jerusalem temple complex, not relabel Solomon's
Temple as the temple in the time of Christ.

## Visual direction

Use the four `reference/*.png` Blender renders as the source of visual direction:
warm pale limestone, a central open paved route, houses and market stalls on both
sides, and the temple at the far end. These are **Blender reference images**, not
screenshots of the web implementation. This is an artistic scene, not a verified
archaeological reconstruction. Do not add that claim to the product.

The prototype extends much farther than the current app's interaction area. Adapt
the composition to the existing camera, spawn, NPC and screen arrangement; do not
copy its full 128m route. Keep an accessible level route for the current locomotion
system. Reserve the central teaching area for NPCs and screens. Do not add an
elevated route unless locomotion supports it. Keep the spawn clear and ensure desktop
and VR users can see and reach the NPCs, quiz host and media screens.

The temple is a 58m-by-69m complex at scale 1. For the current teaching area, a
starting scale around 0.30–0.35 and a position behind the teaching area can work;
determine orientation and final transforms visually. Give the temple enough camera
far distance and fog range to remain visible. Use a small number of houses and
stalls, share GLTF resources and materials, and avoid multiplying 50k-triangle meshes
across the scene unnecessarily. Only load Jerusalem assets when selected. Do not
bundle both 2K and 3K variants or silently claim Quest performance without testing.

## Integration requirements

- Extend the scenario system with an optional validated environment identifier or
  config. Existing scenarios without it retain the current Agora environment.
- Store the new scenario at `public/data/jerusalem-time-of-christ.json` and add a
  Greek-titled entry to `public/data/manifest.json`. Provide a direct preview link
  if practical, without changing the active scenario pointer.
- Select the renderer in `src/pages/Index.tsx` from scenario data; keep one shared
  app with all interaction logic. Show the appropriate scene title and instruction.
- Update scenario types/parsing, library switching and JSON export so the environment
  choice survives load/save. Preserve protected `dataUrl` preview validation rather
  than relaxing character/prop restrictions globally.
- Use `src/lib/assetUrl.ts` and `import.meta.env.BASE_URL` as applicable. The latest
  main branch has GitHub Pages subpath fixes. Preserve those for the new GLBs.
- Check that switching scenarios clears stale dialogs, stops prior media/speech,
  hides old decorative assets and handles progress consistently. New environment
  loading must not crash the app on missing files.
- Keep `public/data/active-scenario.json`, original lessons and default Agora
  behavior intact. Use a feature branch and return a reviewable pull request.

## Acceptance

Run the asset validator, install dependencies from the lockfile, run relevant tests
and both normal and GitHub Pages base-path builds. Add focused tests for environment
fallback, scenario loading/saving, and scene switching where needed. Inspect the web
scene at the default desktop camera and the VR spawn; verify that every required NPC,
quiz host and screen remains usable. Capture an actual implementation screenshot.
Report tested behavior separately from real-headset checks. Return the PR and preview
with any remaining limitations. Do not merge or deploy production as part of this task.
