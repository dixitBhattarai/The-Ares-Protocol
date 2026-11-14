import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorkInteraction, createWorkPrompt, filterInteractables, usableMachines, WORK_MACHINES } from './interactables';

afterEach(()=>vi.unstubAllGlobals());

describe('proximity supplied work interactables',()=>{
  it('rejects unknown, duplicate, wrong-station and forged/non-finite positions without mutating input',()=>{
    const air=WORK_MACHINES[0],wrong={...air,station:'solar' as const};
    const input=[air,air,wrong,{...air,id:'bad' as typeof air.id},{...WORK_MACHINES[1],position:{x:NaN,y:1,z:0}}];
    expect(filterInteractables(input)).toEqual([air]);
    expect(filterInteractables([{...air,position:{...air.position,x:air.position.x+5}}])).toEqual([]);
    const copy=filterInteractables([air]);copy[0].position.x=200;expect(air.position.x).not.toBe(200);
  });
  it('offers only nearby machines in the occupied building and sorts the nearest first',()=>{
    const air=WORK_MACHINES[0];expect(usableMachines(air.position,'habitat')[0].id).toBe('air');
    expect(usableMachines(air.position,null)).toEqual([]);expect(usableMachines(air.position,'solar')).toEqual([]);
    expect(usableMachines({x:0,y:.8,z:6},'habitat')).toEqual([]);
  });
  it('dispatches once per eligible interaction, and never dispatches removed or disabled work',()=>{
    const controller=createWorkInteraction(),emit=vi.fn();controller.onInteract(emit);controller.setInteractables([WORK_MACHINES[0]]);
    expect(controller.activate('shelter')).toBe(false);expect(controller.activate('air')).toBe(true);expect(controller.activate('air')).toBe(false);
    controller.setInteractables([WORK_MACHINES[0]]);expect(controller.activate('air')).toBe(false);expect(emit).toHaveBeenCalledExactlyOnceWith('air');
    controller.setInteractables([]);expect(controller.activate('air')).toBe(false);controller.setInteractables([WORK_MACHINES[0]]);expect(controller.activate('air')).toBe(true);
    controller.dispose();expect(controller.activate('air')).toBe(false);expect(emit).toHaveBeenCalledTimes(2);
  });
});

class ElementStub extends EventTarget {
  textContent='';hidden=false;disabled=false;className='';type='';attrs=new Map<string,string>();children:ElementStub[]=[];
  set innerHTML(_value:string){throw Error('Prompt must use plain text');}
  setAttribute(key:string,value:string){this.attrs.set(key,value);}
  append(item:ElementStub){this.children.push(item);}
  remove(){}
}

describe('one accessible world prompt, no job list',()=>{
  it('sets escaped prompt content and the screen-reader label, and clears on empty input',()=>{
    const tags:string[]=[],button=new ElementStub(),host=new ElementStub();vi.stubGlobal('document',{createElement:(tag:string)=>{tags.push(tag);return button;}});
    const action=vi.fn(),prompt=createWorkPrompt(host as unknown as HTMLElement,action);
    prompt.setPrompt('  E · <service air>  ');expect(button.textContent).toBe('E · <service air>');expect(button.attrs.get('aria-label')).toBe(button.textContent);expect(button.hidden).toBe(false);
    prompt.setPrompt(' ');expect(button.hidden).toBe(true);expect(button.textContent).toBe('');
    expect(tags).toEqual(['button']);expect(host.children).toHaveLength(1);expect(tags).not.toContain('ul');expect(tags).not.toContain('select');
    button.dispatchEvent(new Event('click'));expect(action).toHaveBeenCalledTimes(1);prompt.dispose();button.dispatchEvent(new Event('click'));expect(action).toHaveBeenCalledTimes(1);
  });
});
