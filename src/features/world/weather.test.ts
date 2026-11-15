import { expect, it } from 'vitest';
import * as THREE from 'three';
import type { GameState } from '../../contracts';
import { createMarsWeather, createWeatherTimeline } from './weather';
import { WorldResources } from './resources';
const state = (elapsed:number, extra:Partial<GameState> = {}):GameState => ({phase:'running',turn:0,resources:{power:70,oxygen:70,supplies:70},science:0,shielding:0,log:[],taskRun:{session:0,elapsed,completedIds:[],protections:{}},...extra});
it('builds a dust warning/front, clears stale notices, and resets on replay',()=>{
 const t=createWeatherTimeline();t.setState(state(40,{upcomingHazardNotice:'Dust buildup · 5s'}));expect(t.strength()).toBe(.65);
 t.setState(state(45,{lastHazardNotice:'Dust buildup hit'}));expect(t.strength()).toBe(1);
 t.setState(state(65,{lastHazardNotice:'Dust buildup hit'}));expect(t.strength()).toBeGreaterThan(0);
 t.setState(state(80,{lastHazardNotice:'Dust buildup hit'}));expect(t.strength()).toBe(0);
 t.setState(state(0,{phase:'ready'}));expect(t.strength()).toBe(0);
 t.setState(state(90,{lastHazardNotice:'Solar storm hit'}));expect(t.strength()).toBe(0);
});
it('responds to repeated dust events even if their outcome text is identical',()=>{
 const t=createWeatherTimeline();t.setState(state(45,{lastHazardNotice:'Dust buildup prevented'}));
 t.setState(state(80,{lastHazardNotice:'Dust buildup prevented',upcomingHazardNotice:'Dust buildup · 5s'}));
 t.setState(state(85,{lastHazardNotice:'Dust buildup prevented'}));expect(t.strength()).toBe(1);
});
it('freezes while paused, presents steady reduced motion, and keeps grains outside the dome',()=>{
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#b87d69',.0095);const resources=new WorldResources();const weather=createMarsWeather(scene,resources);
 weather.setState(state(45,{lastHazardNotice:'Dust buildup hit'}));weather.update(.1,true,true);expect(weather.intensity()).toBe(1);
 const dust=scene.getObjectByName('martian-weather')!.children.find(o=>o instanceof THREE.Points) as THREE.Points;
 const values=Array.from(dust.geometry.attributes.position.array);weather.update(10,false,false);expect(Array.from(dust.geometry.attributes.position.array)).toEqual(values);
 for(let i=0;i<values.length;i+=3)if(values[i+1]>0)expect(Math.hypot(values[i],values[i+2]+2)).toBeGreaterThan(15);
 weather.setState(state(0,{phase:'ready'}));weather.update(0,true,true);expect(weather.intensity()).toBe(0);weather.dispose();expect(scene.getObjectByName('martian-weather')).toBeUndefined();resources.dispose();
});
