"""Blender 5.1: build the game character from user-downloaded Mixamo FBXs.

Usage: blender --background --factory-startup --python prepare-mixamo.py -- DOWNLOADS OUTPUT_DIR
Raw FBXs stay outside the repository. The separate editable blend is written to OUTPUT_DIR.
"""
import bpy
import pathlib
import sys

downloads, output = map(pathlib.Path, sys.argv[sys.argv.index('--') + 1:])
output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(downloads / 'Ch48_nonPBR.fbx'))
target = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
target.animation_data_clear()
model_objects = list(bpy.data.objects)

# Keep a simple PBR material and only the source diffuse maps. Original source is 4K.
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    bsdf = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    diffuse = bsdf.inputs['Base Color'].links[0].from_node.image if bsdf.inputs['Base Color'].is_linked else None
    material.node_tree.nodes.clear()
    bsdf = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = .72
    output_node = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])
    if diffuse:
        diffuse.scale(min(1024, diffuse.size[0]), min(1024, diffuse.size[1]))
        diffuse.pack()
        texture = material.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = diffuse
        material.node_tree.links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])

target.animation_data_create()
for name, filename in [('Idle', 'Breathing Idle.fbx'), ('Walk', 'Walking.fbx')]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(downloads / filename))
    imported = set(bpy.data.objects) - before
    skeleton = next(o for o in imported if o.type == 'ARMATURE')
    action = skeleton.animation_data.action
    action.name = name
    # Both exports were retargeted to Astra by Mixamo, so their rest skeletons match.
    strip = target.animation_data.nla_tracks.new()
    strip.name = name
    clip = strip.strips.new(name, 1, action)
    clip.action_slot = action.slots[0]
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)

bpy.context.scene.render.fps = 30
bpy.context.scene.frame_set(1)
for obj in bpy.context.selected_objects:
    obj.select_set(False)
for obj in model_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = target
bpy.ops.wm.save_as_mainfile(filepath=str(output / 'astra-editable.blend'))
bpy.ops.export_scene.gltf(filepath=str(output / 'astra.glb'), use_selection=True,
    export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS',
    export_force_sampling=True, export_image_format='JPEG', export_jpeg_quality=85)
print('GAME_EXPORT', (output / 'astra.glb').stat().st_size)
