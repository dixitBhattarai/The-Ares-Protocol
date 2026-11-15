import {it,expect} from 'vitest';
import {createPhysics} from './index';
it('supports distant Mars walking on solid ground, blocks landmark props, and retains Earth bounds',async()=>{
 const p=await createPhysics();p.setFreeRoam?.(true);p.reset?.({x:50,y:.8,z:10});p.walkPath?.([{x:55,y:.8,z:10}]);for(let i=0;i<120;i++)p.step(1/60);expect(p.getPlayerPose().x).toBeGreaterThan(54);expect(p.getPlayerPose().y).toBeCloseTo(.8,2);
 p.reset?.({x:36,y:.8,z:30});p.walkPath?.([{x:43,y:.8,z:30}]);for(let i=0;i<100;i++)p.step(1/60);expect(p.getPlayerPose().x).toBeLessThan(38.2);
 p.setGravityBody?.('earth');p.reset?.({x:50,y:.8,z:10});p.step(1/60);expect(p.getPlayerPose().x).toBe(18);p.dispose();
});
