"""Validate embedded biblical GLBs and record their geometry/texture budgets."""
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
records = []
paths = sorted((ROOT / "public/models/jerusalem/biblical").glob("*.glb"))
assert len(paths) == 8
for path in paths:
    raw = path.read_bytes()
    assert struct.unpack_from("<III", raw) == (0x46546C67, 2, len(raw))
    json_size, kind = struct.unpack_from("<II", raw, 12)
    assert kind == 0x4E4F534A
    model = json.loads(raw[20:20 + json_size])
    bin_size, kind = struct.unpack_from("<II", raw, 20 + json_size)
    assert kind == 0x004E4942
    binary = memoryview(raw)[28 + json_size:]
    assert len(binary) == bin_size
    assert len(model['buffers']) == 1 and 'uri' not in model['buffers'][0]
    for view in model['bufferViews']:
        assert view['buffer'] == 0
        assert view.get('byteOffset', 0) + view['byteLength'] <= bin_size
    assert len(model['nodes']) == len(model['meshes']) == 1
    assert not model.get('animations') and not model.get('skins')
    assert not model.get('cameras') and not model.get('extensionsRequired')
    primitives = model['meshes'][0]['primitives']
    assert all(p.get('mode', 4) == 4 for p in primitives)
    triangles = sum(model['accessors'][p['indices']]['count'] // 3 for p in primitives)
    assert triangles <= 40000
    positions = [model['accessors'][p['attributes']['POSITION']] for p in primitives]
    low = [min(a['min'][i] for a in positions) for i in range(3)]
    high = [max(a['max'][i] for a in positions) for i in range(3)]
    assert abs(low[1]) < .001
    cap = 2048 if '_2K.' in path.name else 1024
    textures = []
    for image in model['images']:
        assert 'uri' not in image and image['mimeType'] == 'image/png'
        view = model['bufferViews'][image['bufferView']]
        start = view.get('byteOffset', 0)
        png = binary[start:start + view['byteLength']]
        assert bytes(png[:8]) == b'\x89PNG\r\n\x1a\n'
        dimensions = list(struct.unpack_from('>II', png, 16))
        assert max(dimensions) <= cap
        textures.append({'name': image.get('name'), 'dimensions': dimensions})
    records.append({'file': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(), 'triangles': triangles,
                    'textures': textures, 'dimensions_y_up': [high[i] - low[i] for i in range(3)]})
    print(path.name, triangles, len(raw), 'bytes')
manifest = {'source': 'Biblical_Assets_VR_Gallery.blend and Apostle_Paul_VR_2K.glb',
            'geometry': 'Existing optimized meshes, no further decimation',
            'textures': 'Characters 2K; objects 1K for browser/VR memory',
            'assets': records, 'total_bytes': sum(r['bytes'] for r in records),
            'total_triangles': sum(r['triangles'] for r in records)}
(ROOT / 'docs/jerusalem/biblical-assets.json').write_text(json.dumps(manifest, indent=2) + '\n')
