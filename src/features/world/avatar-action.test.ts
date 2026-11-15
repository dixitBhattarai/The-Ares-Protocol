import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { createAvatarActionLayer } from './avatar-action';
import { createLocomotion } from './locomotion';
import { createAvatarTools } from './avatar-tools';
import { createModelKit, WorldResources } from './resources';
import { createAstronaut, setAstronautActivity, setAstronautMotion, updateAstronautAnimation, resetAstronautActions } from './astronaut';

function fixture() {
  const model = new THREE.Group(); model.position.set(4,.8,-3);
  const bones = new Map<string,THREE.Bone>();
  for (const name of ['Hips','Spine','Spine1','Spine2','Neck','Head','LeftUpLeg','LeftLeg','RightUpLeg','RightLeg','LeftArm','LeftForeArm','RightArm','RightForeArm','LeftHand','RightHand']) {
    const bone = new THREE.Bone(); bone.name='mixamorig1'+name; model.add(bone); bones.set(name,bone);
  }
  const layer = createAvatarActionLayer(model);
  return {model,bones,layer};
}
function frame(layer: ReturnType<typeof createAvatarActionLayer>, dt=.1, active=true, reduced=false) {
  if (active) layer.beforeMixer();
  layer.update(dt,active,reduced);
}

describe('physics-driven avatar action layers',()=>{
  it('tucks during ascent, extends in descent and absorbs landing without moving the physics root',()=>{
    const {model,bones,layer}=fixture();
    layer.setMotion({grounded:false,verticalSpeed:2,body:'mars'});
    for(let i=0;i<4;i++)frame(layer);
    expect(layer.getState().mode).toBe('takeoff');
    const tuck=bones.get('LeftLeg')!.rotation.x;
    expect(tuck).toBeGreaterThan(.4);
    layer.setMotion({grounded:false,verticalSpeed:-2,body:'mars'});frame(layer);
    expect(layer.getState().mode).toBe('fall');expect(bones.get('LeftLeg')!.rotation.x).toBeLessThan(tuck);
    layer.setMotion({grounded:true,verticalSpeed:0,body:'mars'});frame(layer,.02);
    expect(layer.getState().mode).toBe('land');expect(bones.get('Hips')!.position.y).toBeLessThan(0);
    for(let i=0;i<9;i++)frame(layer);
    expect(layer.getState().mode).toBe('idle');expect(Math.abs(bones.get('Hips')!.position.y)).toBeLessThan(.001);
    expect(model.position.toArray()).toEqual([4,.8,-3]);
  });
  it('kneels and scoops, inspects a sample, freezes on pause, and resets every modified joint',()=>{
    const {model,bones,layer}=fixture();
    layer.setActivity({action:'dig',progress:.3});for(let i=0;i<8;i++)frame(layer);
    expect(layer.getState().mode).toBe('dig');expect(bones.get('LeftLeg')!.rotation.x).toBeGreaterThan(1.5);
    const scooping=bones.get('RightArm')!.quaternion.clone();frame(layer);
    expect(bones.get('RightArm')!.quaternion.equals(scooping)).toBe(false);
    const clock=layer.getState().clock,pose=bones.get('RightArm')!.quaternion.clone();frame(layer,2,false);
    expect(layer.getState().clock).toBe(clock);expect(bones.get('RightArm')!.quaternion.equals(pose)).toBe(true);
    layer.setActivity({action:'research',progress:.6});for(let i=0;i<7;i++)frame(layer);
    expect(layer.getState().mode).toBe('research');expect(Math.abs(bones.get('RightForeArm')!.rotation.x)).toBeGreaterThan(1);
    layer.reset();expect(layer.getState().mode).toBe('idle');for(const bone of bones.values()){expect(bone.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(.001);expect(bone.position.length()).toBe(0);}
    expect(model.position.toArray()).toEqual([4,.8,-3]);
  });
  it('holds a stable reduced-motion pose, ignores orbit fall and rejects invalid telemetry',()=>{
    const {bones,layer}=fixture();layer.setActivity({action:'dig',progress:.3});frame(layer,0,true,true);
    const pose=bones.get('RightArm')!.quaternion.clone(),clock=layer.getState().clock;
    frame(layer,2,true,true);expect(layer.getState().clock).toBe(clock);expect(bones.get('RightArm')!.quaternion.angleTo(pose)).toBeLessThan(.0001);
    layer.setActivity({action:'none',progress:0});layer.setMotion({grounded:false,verticalSpeed:0,body:'orbit'});frame(layer);
    expect(layer.getState().mode).toBe('idle');layer.setMotion({grounded:false,verticalSpeed:NaN,body:'mars'});frame(layer);expect(layer.getState().mode).toBe('idle');
  });
  it('restores the original mixer pose after repeated action frames instead of accumulating bone offsets',()=>{
    const {model,bones}=fixture();
    const clips=['Idle','Walk'].map(name=>new THREE.AnimationClip(name,1,[new THREE.QuaternionKeyframeTrack('mixamorig1LeftLeg.quaternion',[0,1],[0,0,0,1,0,0,0,1])]));
    const animation=createLocomotion(model,clips);animation.setActivity({action:'dig',progress:.5});
    for(let i=0;i<60;i++)animation.update(1/60,true,false);
    expect(bones.get('LeftLeg')!.rotation.x).toBeCloseTo(1.58,2);
    animation.setActivity({action:'none',progress:0});animation.update(.1,true,false);
    expect(bones.get('LeftLeg')!.rotation.x).toBeCloseTo(0,5);
    animation.setMotion({grounded:false,verticalSpeed:2,body:'mars'});animation.update(.1,true,true);
    expect(animation.getActionState().mode).toBe('takeoff');animation.setMotion({grounded:true,verticalSpeed:0,body:'mars'});animation.update(.1,true,true);
    expect(animation.getActionState().mode).toBe('idle');animation.dispose();
  });
  it('animates the procedural fallback when the downloaded player cannot load',()=>{
    const resources=new WorldResources(),visual=createAstronaut(createModelKit(resources));
    setAstronautActivity(visual,{action:'dig',progress:.2});for(let i=0;i<5;i++)updateAstronautAnimation(visual,.1,true,false);
    expect(visual.legs[0].rotation.x).toBeLessThan(-.8);
    setAstronautActivity(visual,{action:'none',progress:0});setAstronautMotion(visual,{grounded:false,verticalSpeed:2,body:'mars'});updateAstronautAnimation(visual,.1,true,false);
    expect(visual.legs[0].rotation.x).toBeLessThan(-.1);resetAstronautActions(visual);expect(visual.legs[0].rotation.x).toBe(0);resources.dispose();
  });
});

describe('animated sample equipment',()=>{
  it('follows the actual sanitized hand bones and switches the scoop for a scanner',()=>{
    const resources=new WorldResources(),{model,bones}=fixture();const tools=createAvatarTools(createModelKit(resources));model.add(tools.group);
    bones.get('RightHand')!.position.set(.2,.6,.1);bones.get('LeftHand')!.position.set(-.2,.6,.1);
    tools.update(model,{action:'dig',progress:.2},.1,true,false);
    const scoop=tools.group.getObjectByName('sampling-scoop')!,scanner=tools.group.getObjectByName('sample-scanner')!;
    expect(scoop.visible).toBe(true);expect(scanner.visible).toBe(false);expect(scoop.position.x).toBeCloseTo(.2);
    bones.get('RightHand')!.position.x=.4;tools.update(model,{action:'research',progress:.4},.1,true,false);
    expect(scoop.visible).toBe(false);expect(scanner.visible).toBe(true);expect(scanner.position.x).toBeCloseTo(.4);
    tools.reset();expect(tools.group.visible).toBe(false);resources.dispose();
  });
});

it('preserves vertical root breathing on a rotated centimetre Armature while removing horizontal drift',()=>{
  const model=new THREE.Group(),armature=new THREE.Group(),hips=new THREE.Bone();
  armature.rotation.x=Math.PI/2;armature.scale.setScalar(.01);model.add(armature);hips.name='mixamorig1Hips';armature.add(hips);
  const clips=['Idle','Walk'].map(name=>new THREE.AnimationClip(name,1,[new THREE.VectorKeyframeTrack('mixamorig1Hips.position',[0,1],[0,0,-90,20,4,-100])]));
  const animation=createLocomotion(model,clips);animation.setMoving(true);for(let i=0;i<5;i++)animation.update(.1,true,false);
  expect(Math.abs(hips.position.x)).toBeLessThan(.0001);expect(Math.abs(hips.position.y)).toBeLessThan(.0001);expect(hips.position.z).toBeLessThan(-90);
  expect(hips.getWorldPosition(new THREE.Vector3()).y).toBeGreaterThan(.9);animation.dispose();
});

it('keeps a grounded boot planted when the imported rig uses rotated scaled parents',()=>{
  const model=new THREE.Group(),armature=new THREE.Group(),hips=new THREE.Bone();armature.rotation.x=Math.PI/2;armature.scale.setScalar(.01);model.add(armature);
  hips.name='mixamorig1Hips';hips.position.z=-90;hips.rotation.x=-Math.PI/2;armature.add(hips);
  const thigh=new THREE.Bone(),shin=new THREE.Bone(),foot=new THREE.Bone();thigh.name='mixamorig1LeftUpLeg';shin.name='mixamorig1LeftLeg';foot.name='mixamorig1LeftFoot';
  thigh.rotation.z=Math.PI;hips.add(thigh);thigh.add(shin);shin.position.y=40;shin.add(foot);foot.position.y=40;
  const baseline=foot.getWorldPosition(new THREE.Vector3()).y,layer=createAvatarActionLayer(model);layer.setActivity({action:'dig',progress:.3});
  for(let i=0;i<30;i++)frame(layer,1/60);expect(foot.getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(baseline,4);expect(model.position.toArray()).toEqual([0,0,0]);
});
