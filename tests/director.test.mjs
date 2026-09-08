import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function moduleURL(file,replacements={}){
  let source=readFileSync(file,'utf8');
  for(const [from,to] of Object.entries(replacements))source=source.replaceAll(from,to);
  return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
}
const director=await import(moduleURL('lib/director.ts'));
test('Director validates initial inputs and expires its promotional price',()=>{
  const input={prompt:'Camera follows a cyclist',resolution:'480p',aspect_ratio:'16:9',memory:12,seed:''};
  assert.equal(director.directorConfig(input).seed,null);
  assert.throws(()=>director.directorConfig({...input,memory:0}),/Memory/);
  assert.throws(()=>director.directorConfig({...input,resolution:'1080p'}),/supported/);
  assert.throws(()=>director.directorConfig({...input,audio_url:'http://example.com/a.mp3'}),/HTTPS/);
  assert.equal(director.livePrice(Date.parse('2026-09-13')).minimum,1.2);
  assert.equal(director.livePrice(Date.parse('2026-09-14')).minimum,4.8);
});
test('Director proxy rejects anonymous users and unapproved apps, and keeps credentials server-side',async()=>{
  const studio=`const owner=async()=>{if(!globalThis.__signedIn)throw new Error('Sign in');}; const key=async()=>'test-only-key'; const fail=e=>Response.json({error:e.message},{status:400});`;
  const proxy=await import(moduleURL('app/api/fal/proxy/route.ts',{
    "import {owner,key,fail} from '@/lib/studio';":studio,
    "'@fal-ai/server-proxy/nextjs'":JSON.stringify(import.meta.resolve('@fal-ai/server-proxy/nextjs')),
  }));
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,init)=>{calls++;assert.equal(url,'https://wma.fal.run/ice');assert.equal(new Headers(init.headers).get('authorization'),'Key test-only-key');return Response.json({iceServers:[]});};
  const req=(target,app='minimax/h3-max/director')=>new Request('https://studio.example/api/fal/proxy',{method:'POST',headers:{'x-fal-target-url':target,'content-type':'application/json'},body:JSON.stringify({app_id:app})});
  try{
    globalThis.__signedIn=false;
    assert.equal((await proxy.POST(req('https://wma.fal.run/ice'))).status,400);
    globalThis.__signedIn=true;
    assert.equal((await proxy.POST(req('https://evil.example/collect'))).status,400);
    assert.equal((await proxy.POST(req('https://wma.fal.run/ice','unapproved/model'))).status,400);
    assert.equal((await proxy.POST(req('https://wma.fal.run/arbitrary'))).status,400);
    assert.equal(calls,0);
    const res=await proxy.POST(req('https://wma.fal.run/ice'));
    assert.equal(res.status,200);assert.equal(calls,1);
    assert.equal((await res.text()).includes('test-only-key'),false);
  }finally{globalThis.fetch=original;delete globalThis.__signedIn;}
});

test('Director ICE and session responses allow framework headers without losing the upstream response',async()=>{
  const proxy=await import(moduleURL('app/api/fal/proxy/route.ts',{
    "import {owner,key,fail} from '@/lib/studio';":"const owner=async()=>{}; const key=async()=>'test-only-key'; const fail=e=>Response.json({error:e.message},{status:400});",
    "'@fal-ai/server-proxy/nextjs'":JSON.stringify(import.meta.resolve('@fal-ai/server-proxy/nextjs')),
  }));
  const original=globalThis.fetch;
  try{
    for(const [path,status,body] of [
      ['/ice',200,{iceServers:[]}],
      ['/session',200,{sdp:'test-answer',type:'answer'}],
      ['/session',503,{detail:'No capacity available'}],
    ]){
      const requestBody=JSON.stringify({app_id:'minimax/h3-max/director',sdp:'test-offer',type:'offer'});
      // A real fetch Response has immutable headers, unlike Response.json().
      const upstream=await original('data:application/json,'+encodeURIComponent(JSON.stringify(body)));
      Object.defineProperty(upstream,'status',{value:status});
      assert.throws(()=>upstream.headers.set('vary','Origin'),/immutable/);
      let calls=0;
      globalThis.fetch=async(url,init)=>{
        calls++;assert.equal(url,'https://wma.fal.run'+path);
        assert.equal(init.body,requestBody);
        assert.equal(new Headers(init.headers).get('authorization'),'Key test-only-key');
        return upstream;
      };
      const res=await proxy.POST(new Request('https://studio.example/api/fal/proxy',{method:'POST',headers:{'x-fal-target-url':'https://wma.fal.run'+path},body:requestBody}));
      res.headers.set('vary','RSC');
      assert.equal(res.headers.get('vary'),'RSC');
      assert.equal(res.status,status);assert.equal(calls,1);
      assert.deepEqual(await res.json(),body);
    }
  }finally{globalThis.fetch=original;}
});
