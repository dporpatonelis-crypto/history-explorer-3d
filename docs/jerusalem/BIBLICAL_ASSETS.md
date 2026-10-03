# Jerusalem characters and biblical objects

The Jerusalem scenario replaces Socrates with Moses at x = -3.5 and Hypatia
with Apostle Paul at x = 3.5. Their existing positions and interaction flow
are retained. Dialogs, facts, the related quiz question, and completion IDs
now refer to the replacement characters.

Moses is a static export of the existing 40,000-triangle optimized mesh in
`Biblical_Assets_VR_Gallery.blend`. Paul is the existing
`Apostle_Paul_VR_2K.glb` from the Blender asset library. Both use 2K textures.
The original Blender files are not modified.

Six existing gallery objects use the same optimized geometry with textures
reduced to 1K for their smaller displayed size. They are static scene props,
placed on the floor at y = 0.05 and z = 2, ahead of the character row at z = 0.3.
Their widest rendered dimension is 0.81–1.26 metres. Each occupies a distinct
character lane, with the central guide's lane clear.

| Object | Character lane | x | Maximum dimension (m) |
| --- | --- | ---: | ---: |
| Budding Rod of Aaron | Aristotle | -8 | 1.17 |
| Ark of the Covenant | Alexander | -5.75 | 1.26 |
| Covenant Tablets | Moses | -3.5 | 0.81 |
| Manna Jar | Apostle Paul | 3.5 | 0.81 |
| Bronze Serpent | Constantine | 5.75 | 1.08 |
| Lamb | Saint | 8 | 0.99 |

`export_biblical_assets.py` exports selected gallery meshes without saving
the source BLEND. `inspect_biblical_assets.py` validates embedded GLBs,
triangle counts, texture caps, ground pivots, and hashes and writes
`biblical-assets.json`. Assets require no compression decoder.

The Agora and original Divine Economy scenario are unchanged. The temple,
curved-screen layout, and 15-slide Jerusalem presentation are retained.
Browser rendering is checked; headset performance has not been measured.
