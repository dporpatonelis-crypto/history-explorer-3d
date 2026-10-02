"""Validate the compact GLBs and write assets.json using only Python's standard library.
Run from any directory: python3 docs/jerusalem/inspect_assets.py
"""
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public/models/jerusalem"
records = []
paths = sorted(ASSETS.glob("*.glb"))
assert len(paths) == 3, "Expected the three Jerusalem compact GLBs"
for path in paths:
    data = path.read_bytes()
    magic, version, length = struct.unpack_from("<III", data)
    assert magic == 0x46546C67 and version == 2 and length == len(data), path.name
    json_length, json_type = struct.unpack_from("<II", data, 12)
    assert json_type == 0x4E4F534A, path.name
    model = json.loads(data[20:20 + json_length])
    bin_offset = 20 + json_length
    bin_length, bin_type = struct.unpack_from("<II", data, bin_offset)
    assert bin_type == 0x004E4942 and bin_offset + 8 + bin_length == len(data), path.name
    binary = memoryview(data)[bin_offset + 8:]
    assert len(model["buffers"]) == 1 and "uri" not in model["buffers"][0], path.name
    assert model["buffers"][0]["byteLength"] <= len(binary), path.name
    for view in model["bufferViews"]:
        assert view["buffer"] == 0, path.name
        assert view.get("byteOffset", 0) + view["byteLength"] <= len(binary), path.name
    # These exports have one mesh/node, baked transformations and Y-up metre geometry.
    assert len(model["nodes"]) == 1 and len(model["meshes"]) == 1, path.name
    assert model["scenes"][model.get("scene", 0)]["nodes"] == [0], path.name
    assert not any(key in model["nodes"][0] for key in ["matrix", "translation", "rotation", "scale"]), path.name
    primitives = model["meshes"][0]["primitives"]
    positions = [model["accessors"][p["attributes"]["POSITION"]] for p in primitives]
    minimum = [min(p["min"][i] for p in positions) for i in range(3)]
    maximum = [max(p["max"][i] for p in positions) for i in range(3)]
    assert abs(minimum[1]) < 0.001, path.name
    triangles = 0
    for primitive in primitives:
        assert primitive.get("mode", 4) == 4, path.name
        count = model["accessors"][primitive["indices"]]["count"]
        assert count % 3 == 0, path.name
        triangles += count // 3
    assert triangles <= 50000, path.name
    textures = []
    for image in model.get("images", []):
        assert "uri" not in image and image["mimeType"] == "image/png", path.name
        view = model["bufferViews"][image["bufferView"]]
        offset = view.get("byteOffset", 0)
        png = binary[offset:offset + view["byteLength"]]
        assert bytes(png[:8]) == b"\x89PNG\r\n\x1a\n", path.name
        size = list(struct.unpack_from(">II", png, 16))
        assert 0 < min(size) and max(size) <= 2048, path.name
        textures.append({"size": size, "name": image.get("name", "")})
    records.append({
        "file": path.relative_to(ROOT).as_posix(),
        "url": "/" + path.relative_to(ROOT / "public").as_posix(),
        "sha256": hashlib.sha256(data).hexdigest(),
        "bytes": len(data),
        "triangles": triangles,
        "mesh_objects": len(model["meshes"]),
        "textures": textures,
        "bounds_gltf_y_up": {"min": minimum, "max": maximum},
        "dimensions_gltf_y_up": [maximum[i] - minimum[i] for i in range(3)],
        "pivot": "bottom centre",
        "extensions_used": model.get("extensionsUsed", []),
    })
manifest = {
    "theme": "Jerusalem in the time of Christ",
    "historical_policy": "Artistic reference-based environment; not an archaeological reconstruction.",
    "source": "Existing Blender asset-library compact 2K exports",
    "optimization": "Textures capped at 2048px; source geometry retained; no automatic LOD or mesh decimation.",
    "coordinate_system": "glTF: right-handed, Y up, metres",
    "assets": records,
    "total_bytes": sum(record["bytes"] for record in records),
    "total_unique_triangles": sum(record["triangles"] for record in records),
}
(ROOT / "docs/jerusalem/assets.json").write_text(json.dumps(manifest, indent=2) + "\n")
for record in records:
    print(f"{record['file']}: {record['bytes']:,} bytes, {record['triangles']:,} triangles, dimensions {record['dimensions_gltf_y_up']}")
print("Validated GLB headers, embedded buffers and PNG textures, dimensions, pivots, texture cap and geometry budget.")
