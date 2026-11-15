import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { createServer, request } from 'node:http';
import { createAccountHandler } from './app.mjs';
import { createAuthGate } from './auth-gate.mjs';
import { createDatabaseLifecycle } from './database.mjs';

it('rejects excess auth work across nicknames, resets budget and releases each slot once', () => {
  let now=0;const gate=createAuthGate({concurrency:2,perMinute:3,now:()=>now});
  const a=gate.tryAcquire(),b=gate.tryAcquire();expect(gate.tryAcquire()).toBeNull();
  a();a();const c=gate.tryAcquire();expect(gate.tryAcquire()).toBeNull();b();c();
  expect(gate.tryAcquire()).toBeNull();now=60_000;expect(gate.tryAcquire()).toBeTypeOf('function');
});
it('keeps accounts unavailable until retry succeeds and cancels recovery on shutdown', async () => {
  const pool=new EventEmitter();pool.query=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
  const callbacks=[],cancel=vi.fn(),schedule=vi.fn(callback=>{callbacks.push(callback);return {unref(){}};});
  const db=createDatabaseLifecycle({pool,schema:'schema',schedule,cancel});
  await db.start();expect(db.isReady()).toBe(false);expect(schedule.mock.calls[0][1]).toBe(1000);
  await callbacks.shift()();await Promise.resolve();expect(db.isReady()).toBe(true);
  pool.query.mockRejectedValueOnce(new Error('offline again'));pool.emit('error',new Error('idle failure'));
  await Promise.resolve();await Promise.resolve();expect(db.isReady()).toBe(false);
  db.stop();expect(cancel).toHaveBeenCalled();await callbacks.shift()();expect(pool.query).toHaveBeenCalledTimes(3);
});

async function withServer(options, run) {
  const handle=createAccountHandler({pool:{query:vi.fn()},sessionSecret:'x'.repeat(32),...options});
  const failures=[];const server=createServer((req,res)=>void handle(req,res).catch(error=>{failures.push(error);res.destroy();}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {await run(base);expect(failures).toEqual([]);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
it('returns 400 for malformed raw targets and continues serving later requests', async () => {
  await withServer({},async base=>{
    const url=new URL(base);
    const status=await new Promise((resolve,reject)=>request({hostname:url.hostname,port:url.port,path:'http://['},response=>{response.resume();response.on('end',()=>resolve(response.statusCode));}).on('error',reject).end());
    expect(status).toBe(400);expect((await fetch(base+'/healthz')).status).toBe(200);
  });
});
it('reports healthy game service while accounts reconnect, then enables API requests', async () => {
  let ready=false;await withServer({accountsReady:()=>ready},async base=>{
    expect(await (await fetch(base+'/healthz')).json()).toEqual({status:'ok',accounts:'unavailable'});
    expect((await fetch(base+'/api/progress')).status).toBe(503);
    ready=true;expect((await fetch(base+'/api/progress')).status).toBe(401);
  });
});
it('releases the auth slot even when authentication fails', async () => {
  const gate=createAuthGate({concurrency:1});
  await withServer({authGate:gate,pool:{query:async()=>({rows:[]})}},async base=>{
    const attempt=()=>fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'pilot',password:'example-pass'})});
    expect((await attempt()).status).toBe(401);expect((await attempt()).status).toBe(401);
  });
});
