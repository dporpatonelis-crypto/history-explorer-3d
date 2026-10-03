"""Export the user's optimized gallery meshes without saving its BLEND.
Run with Blender --background <Biblical_Assets_VR_Gallery.blend> --python <this file>.
"""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public/models/jerusalem/biblical"
OUTPUT.mkdir(parents=True, exist_ok=True)
NAMES = ["Moses", "Ark_of_Covenant", "Covenant_Tablets", "Budding_Rod",
         "Manna_Jar", "Bronze_Serpent", "Lamb"]

for name in NAMES:
    obj = bpy.data.objects[name]
    assert obj.type == "MESH"
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    original_location = obj.location.copy()
    obj.location = (0, 0, 0)
    texture_cap = 2048 if name == 'Moses' else 1024
    for image in bpy.data.images:
        if image.name.startswith(name + '_') and max(image.size) > texture_cap:
            image.scale(texture_cap, texture_cap)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / f"{name}_VR_{texture_cap // 1024}K.glb"),
        export_format="GLB", use_selection=True, export_yup=True,
        export_animations=False, export_cameras=False, export_lights=False,
    )
    obj.location = original_location
    print(f"EXPORTED {name}", flush=True)
