import {it,expect} from 'vitest';
import {TERRAIN_TARGETS,STAR_TARGETS,exposeTarget,sortMolecule,AIR_SAMPLE} from './science-work';
it('only records aimed observations, retains partial exposure, and clamps hidden-tab elapsed time',()=>{
 for(const targets of [TERRAIN_TARGETS,STAR_TARGETS]){
  const p=targets[0];let values=[0,0,0];
  expect(exposeTarget(values,targets,350,250,.1,true)).toEqual(values);
  expect(exposeTarget(values,targets,p.x,p.y,5,false)).toEqual(values);
  values=exposeTarget(values,targets,p.x,p.y,30,true);expect(values[0]).toBeLessThan(.1);
  for(let n=0;n<15;n++)values=exposeTarget(values,targets,p.x,p.y,.1,true);
  expect(values).toEqual([1,0,0]);
 }
});
it('sorts each molecule once and rejects wrong detectors or forged particles',()=>{
 let sorted:readonly number[]=[];expect(sortMolecule(sorted,0,1)).toBe(sorted);expect(sortMolecule(sorted,-1,0)).toBe(sorted);
 AIR_SAMPLE.forEach((kind,i)=>{sorted=sortMolecule(sorted,i,kind);expect(sortMolecule(sorted,i,kind)).toBe(sorted);});expect(sorted).toHaveLength(6);
});
