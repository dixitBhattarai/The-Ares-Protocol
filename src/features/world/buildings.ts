import * as THREE from 'three';
import { BUILDING_HALF_SIZE, type StationId } from '../../contracts';
import type { StationVisual } from './models';
import type { ModelKit, WorldResources } from './resources';
import { createSlidingDoor } from './doors';
import { dressRoom, furnishRoom } from './interiors';
import { createWorkMachines } from './work-machines';

/** Hollow, furnished buildings in world coordinates; no separate room scene is needed. */
export function createBuilding(id:StationId,kit:ModelKit,resources:WorldResources,work=true):StationVisual {
  const group=new THREE.Group();group.name=id;group.userData.stationId=id;
  const room=new THREE.Group();room.position.y=-1;group.add(room);
  const windows=resources.material(new THREE.MeshStandardMaterial({color:'#96dcca',emissive:'#76c5cf',emissiveIntensity:.2,roughness:.4}));
  const indicator=resources.material(new THREE.MeshStandardMaterial({color:'#bce9b3',emissive:'#8ab982',emissiveIntensity:.3}));
  const beacon=resources.material(new THREE.MeshStandardMaterial({color:'#91d0a3',emissive:'#91d0a3',emissiveIntensity:.2}));
  const h=BUILDING_HALF_SIZE,walls:THREE.Mesh[]=[];
  // Interior surfaces must render and obstruct the follow camera from either side.
  kit.materials.ivory.side=THREE.DoubleSide;kit.materials.trim.side=THREE.DoubleSide;
  kit.flatBox(room,kit.materials.trim,[6.5,.1,6.5],[0,-.05,0]);
  const wallMaterial=id==='greenhouse'?resources.material(new THREE.MeshStandardMaterial({color:'#a9d9c4',transparent:true,opacity:.35,roughness:.3,side:THREE.DoubleSide})):kit.materials.ivory;
  for(const x of [-h+.1,h-.1])walls.push(kit.flatBox(room,wallMaterial,[.2,2.6,h*2],[x,1.3,0]));
  walls.push(kit.flatBox(room,wallMaterial,[h*2,2.6,.2],[0,1.3,-h+.1]));
  for(const x of [-2,2])walls.push(kit.flatBox(room,kit.materials.ivory,[2.4,2.6,.2],[x,1.3,h-.1]));
  kit.box(room,kit.materials.trim,[1.6,.35,.2],[0,2.42,h-.1]);
  const {steel}=dressRoom(room,kit,resources);
  const screens=[0,1,2].map(()=>resources.material(new THREE.MeshStandardMaterial({color:'#80cbda',emissive:'#18374e',emissiveIntensity:.5})));
  screens.forEach((screen,index)=>{
    if(typeof document==='undefined')return;
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
    const context=canvas.getContext('2d');
    if(context){
      context.fillStyle='#153743';context.fillRect(0,0,256,128);
      context.fillStyle='#d7fff2';context.textAlign='center';context.font='bold 58px sans-serif';context.fillText(String(index+1),128,72);
      context.font='18px sans-serif';context.fillText(id.toUpperCase(),128,108);
      const texture=resources.texture(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;screen.map=texture;
    }
  });
  const equipment=new THREE.Group();room.add(equipment);furnishRoom(equipment,id,kit,screens,steel);
  if(work)createWorkMachines(id,room,kit,resources);
  const accent={habitat:'#ffbd78',solar:'#a8dfff',greenhouse:'#94edac'}[id];
  const practical=new THREE.PointLight(accent,7,7,2);practical.position.set(0,2.2,.4);room.add(practical);
  const lamp=resources.material(new THREE.MeshBasicMaterial({color:accent}));
  for(const x of [-2.4,2.4])kit.flatBox(room,lamp,[.08,.05,5.2],[x,2.36,0]);
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');
    if(ctx){ctx.fillStyle='#162b36';ctx.fillRect(0,0,512,96);ctx.font='bold 40px sans-serif';ctx.textAlign='center';ctx.fillStyle=accent;ctx.fillText({habitat:'01  HABITAT',solar:'02  SOLAR',greenhouse:'03  GREENHOUSE'}[id],256,62);
      const texture=resources.texture(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;
      kit.flatBox(room,resources.material(new THREE.MeshBasicMaterial({map:texture})),[2.8,.48,.035],[0,2.45,h+.025]);
    }
  }
  const roof=new THREE.Group();room.add(roof);
  kit.flatBox(roof,kit.materials.trim,[6.45,.16,6.45],[0,2.7,0]);
  const panelMaterial=id==='solar'?resources.material(new THREE.MeshStandardMaterial({color:'#23475d',metalness:.65,roughness:.24})):kit.materials.blue;
  if(id==='solar')for(const x of [-1.6,1.6]) {
    kit.box(roof,panelMaterial,[2.8,.08,5.7],[x,2.83,0]);
    for(let z=-2.5;z<2.6;z+=.6)kit.flatBox(roof,windows,[2.65,.02,.48],[x,2.89,z]);
  }
  if(id==='greenhouse')kit.sphere(roof,windows,[2.8,.38,2.8],[0,2.85,0]);
  const shelterPanels:THREE.Mesh[]=[];
  for(const x of [-2,2]) {
    kit.box(room,windows,[1.45,.65,.04],[x,1.6,h+.01]);
    const panel=kit.box(room,kit.materials.blue,[1.5,.7,.03],[x,1.6,h+.04]);panel.scale.y=.01;panel.visible=false;shelterPanels.push(panel);
  }
  kit.box(room,indicator,[.5,.09,.04],[0,2.77,h+.08]);
  kit.sphere(room,beacon,[.1,.1,.1],[h-.3,2.9,h-.3]);
  const door=createSlidingDoor(kit,id,false,.10);door.group.position.set(0,1.12,h-.03);door.group.scale.set(1.15,1.2,1);room.add(door.group);
  const envelope=resources.geometry(new THREE.BoxGeometry(6.7,3.3,6.7));
  const selection=new THREE.LineSegments(resources.geometry(new THREE.EdgesGeometry(envelope)),resources.material(new THREE.LineBasicMaterial({color:'#ffe0a2'})));selection.position.y=.5;selection.visible=false;
  return {group,windows,indicator,beacon,shelterPanels,selection,door,screens,roof,walls};
}
