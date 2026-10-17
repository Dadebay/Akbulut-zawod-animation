"""Convert the licensed Artec cab crop to a local, textured glTF asset.

Requires numpy, trimesh, Pillow. Input is a texture-preserving 260k-face crop
of Truck.obj (y >= 5700 mm), with Truck_1.png and cab.obj.mtl beside it.
Source: https://www.artec3d.com/3d-models/semi-trailer-truck
The archive's CC BY 3.0 license is retained beside the exported GLB.
"""
from io import BytesIO
from pathlib import Path
import numpy as np
from PIL import Image
import trimesh

source = Path('/tmp/akbulut-artec-scan/cab-hq.obj')
scene = trimesh.load(source, force='scene', process=False)
for mesh in scene.geometry.values():
    p = mesh.vertices.copy()
    normals = mesh.vertex_normals.copy()
    normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
    # Right-handed cyclic axis mapping, millimetres to scene metres.
    mesh.vertices = np.column_stack((p[:, 1]/1000-6.15, p[:, 2]/1000, p[:, 0]/1000))
    # Replace the scan's uneven tyre/wheel surfaces with concentric, animated
    # wheel assemblies in Three.js. The arch and the cab sheet metal stay intact.
    centres = mesh.vertices[mesh.faces].mean(axis=1)
    in_wheel = ((centres[:, 0]-.55)**2 + (centres[:, 1]-.535)**2 < .565**2) & (np.abs(centres[:, 2]) > .82)
    mesh.update_faces(~in_wheel)
    # Preserve smooth scan normals across UV seams; recalculating after the OBJ
    # vertex split would make the bodywork look like crumpled sheet metal.
    mesh.vertex_normals = np.column_stack((normals[:, 1], normals[:, 2], normals[:, 0]))
    texture = mesh.visual.material.image
    texture.thumbnail((6144, 6144), Image.Resampling.LANCZOS)
    encoded = BytesIO()
    texture.save(encoded, format='JPEG', quality=93, subsampling=0)
    encoded.seek(0)
    mesh.visual.material = trimesh.visual.material.PBRMaterial(
        name='MAN_scanned_paint', baseColorTexture=Image.open(encoded),
        baseColorFactor=[255, 255, 255, 255], metallicFactor=0, roughnessFactor=.85,
    )
scene.metadata.update({
    'source': 'Semi-trailer truck by Artec 3D, https://www.artec3d.com/3d-models/semi-trailer-truck',
    'license': 'CC BY 3.0 (license supplied in original archive)',
    'modifications': 'Cab cropped, simplified to 260k triangles before replacing the scanned wheel surfaces; three gentle Taubin smoothing passes and original smooth normals retained, converted to metres; original UV texture resized to 6K JPEG. White/blue paint and clean glazing are applied by the application shader. Separate custom wheels, chassis and curtain-side trailer added in the application.',
})
output = Path('public/models/man-tractor-cab.glb')
output.write_bytes(scene.export(file_type='glb', include_normals=True))
print({'bytes': output.stat().st_size, 'faces': sum(len(m.faces) for m in scene.geometry.values()), 'bounds': scene.bounds.tolist()})
