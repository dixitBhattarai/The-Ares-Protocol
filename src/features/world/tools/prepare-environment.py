"""Optimize user-supplied GLBs in a separate Blender process; keep editable copies outside Git."""
import bpy, pathlib, sys, json
source, output = map(pathlib.Path, sys.argv[sys.argv.index('--')+1:])
output.mkdir(parents=True, exist_ok=True)
report=[]
for filename in ['Curiosity_static.glb','24881_Mars_1_6792.glb','Earth_1_12756.glb','moon.glb','mars_-_olympus_mons.glb','warehouse_fbx_model_free.glb','modern_city_block.glb','low-poly_city_night.glb']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source/filename))
    objects=[o for o in bpy.data.objects if o.type=='MESH']
    triangles=sum(len(o.data.polygons) for o in objects)
    for obj in objects:
        if triangles>100000:
            bpy.context.view_layer.objects.active=obj
            modifier=obj.modifiers.new('Game mesh reduction','DECIMATE');modifier.ratio=30000/triangles
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    for image in bpy.data.images:
        if image.size[0] and image.size[1]:
            ratio=min(1,1024/max(image.size))
            if ratio<1:image.scale(max(1,int(image.size[0]*ratio)),max(1,int(image.size[1]*ratio)))
            image.pack()
    name={'Curiosity_static.glb':'curiosity','24881_Mars_1_6792.glb':'mars-globe','Earth_1_12756.glb':'earth-globe','moon.glb':'moon','mars_-_olympus_mons.glb':'olympus-mons','warehouse_fbx_model_free.glb':'warehouse','modern_city_block.glb':'city-block','low-poly_city_night.glb':'city-night'}[filename]
    bpy.ops.wm.save_as_mainfile(filepath=str(output/(name+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(output/(name+'.glb')),export_format='GLB',export_animations=False,export_image_format='JPEG',export_jpeg_quality=85)
    report.append({'source':filename,'output':name+'.glb','bytes':(output/(name+'.glb')).stat().st_size,'meshObjects':len(objects),'inputFaces':triangles,'outputFaces':sum(len(o.data.polygons) for o in objects)})
    print('ASSET_READY',report[-1],flush=True)
(output/'report.json').write_text(json.dumps(report,indent=2))
