"""Blender background conversion: -- source.glb output-directory (keeps an editable copy)."""
import bpy, pathlib, sys
source, destination=map(pathlib.Path,sys.argv[sys.argv.index('--')+1:])
destination.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
for image in bpy.data.images:
    if not image.size[0] or not image.size[1]:continue
    ratio=min(1,1024/max(image.size))
    if ratio<1:image.scale(max(1,int(image.size[0]*ratio)),max(1,int(image.size[1]*ratio)))
    image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(destination/'space-man.blend'))
bpy.ops.export_scene.gltf(filepath=str(destination/'space-man.glb'),export_format='GLB',export_image_format='JPEG',export_jpeg_quality=85)
