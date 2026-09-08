import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';
const sql=new DatabaseSync(':memory:');
for(const file of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
const DB={prepare(query){let args=[];return {bind(...values){args=values;return this;},async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}};}};},async batch(statements){return Promise.all(statements.map(s=>s.run()));}};
globalThis.__env={DB,KEY_ENCRYPTION_SECRET:'test-only-encryption-secret-not-production'};
globalThis.__headers=new Headers({'oai-authenticated-user-id':'owner-a'});
function moduleURL(file,studio){let source=readFileSync(file,'utf8').replace("import { env } from 'cloudflare:workers';","const env = globalThis.__env;").replace("import { headers } from 'next/headers';","const headers = async () => globalThis.__headers;");source=source.replaceAll("'@/lib/demo'",JSON.stringify('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync('lib/demo.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')));if(studio)source=source.replaceAll("'@/lib/studio'",JSON.stringify(studio));source=source.replaceAll("'@/lib/prompting'",JSON.stringify(moduleURLPrompt)).replaceAll("'@/lib/storyboard'",JSON.stringify(moduleURLStoryboard));const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');}
const moduleURLPrompt='data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync('lib/prompting.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const moduleURLStoryboard='data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync('lib/storyboard.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const url=moduleURL('lib/studio.ts');const studio=await import(url);const generate=await import(moduleURL('app/api/generate/route.ts',url));
const request=(body)=>new Request('https://studio.example/api/generate',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://studio.example'},body:JSON.stringify(body)});
test('unauthenticated and cross-origin requests are rejected',async()=>{globalThis.__headers=new Headers();await assert.rejects(()=>studio.owner(),/sign in/);globalThis.__headers=new Headers({'oai-authenticated-user-id':'owner-a'});await assert.rejects(()=>studio.owner(new Request('https://studio.example/api',{method:'POST',headers:{origin:'https://evil.example'}})),/origin/);});
test('keys are encrypted, readable only by their owner, and never stored plaintext',async()=>{await studio.saveKey('owner-a','test-fal-key');const row=sql.prepare('SELECT encrypted FROM connections').get();assert.equal(row.encrypted.includes('test-fal-key'),false);assert.equal(await studio.key(),'test-fal-key');globalThis.__headers.set('oai-authenticated-user-id','owner-b');assert.equal(await studio.connected('owner-b'),false);await assert.rejects(()=>studio.key(),/Connect/);globalThis.__headers.set('oai-authenticated-user-id','owner-a');});
test('generation validates settings and rejects untrusted service URLs',()=>{assert.throws(()=>studio.parseDraft({...studio.defaults,duration:999}),/settings/);assert.throws(()=>studio.parseDraft({...studio.defaults,model:'unapproved/model'}),/supported/);assert.equal(studio.parseDraft({...studio.defaults,model:undefined}).model,'minimax/h3-max');assert.throws(()=>studio.parseDraft({...studio.defaults,seed:'-1'}),/Seed/);assert.throws(()=>studio.queueURL('https://example.com/collect'),/Unexpected/);});
test('missing key makes no paid request',async()=>{globalThis.__headers.set('oai-authenticated-user-id','owner-b');const res=await generate.POST(request({}));assert.equal(res.status,400);assert.match((await res.json()).error,/Connect/);globalThis.__headers.set('oai-authenticated-user-id','owner-a');});
test('same take ID submits to fal only once and stores exact seed',async()=>{sql.prepare('INSERT INTO scenes (id,owner,project,title,draft,created) VALUES (?,?,?,?,?,?)').run('scene-a','owner-a','p','Test','{}',1);const original=globalThis.fetch;let calls=0;globalThis.fetch=async(url,init)=>{calls++;assert.equal(url,'https://queue.fal.run/minimax/h3-max-turbo/text-to-video');assert.equal(init.headers.Authorization,'Key test-fal-key');assert.equal(init.redirect,'manual');const payload=JSON.parse(init.body);assert.equal(payload.enable_safety_checker,true);assert.match(payload.prompt,/Super 8 film texture/);assert.match(payload.prompt,/A bird takes flight/);return Response.json({request_id:'fal-1',status_url:'https://queue.fal.run/minimax/h3-max/requests/fal-1/status',response_url:'https://queue.fal.run/minimax/h3-max/requests/fal-1'});};try{const body={id:'12345678-1234-1234-1234-123456789abc',scene:'scene-a',draft:{...studio.defaults,prompt:'A bird takes flight.',look:'Super 8'}};assert.equal((await generate.POST(request(body))).status,200);assert.equal((await generate.POST(request(body))).status,200);assert.equal(calls,1);const take=sql.prepare('SELECT input,status FROM takes WHERE id=?').get(body.id);assert.equal(take.status,'IN_QUEUE');assert.equal(JSON.parse(take.input).prompt,'A bird takes flight.');assert.match(JSON.parse(take.input).submitted_prompt,/Super 8 film texture/);assert.equal(JSON.parse(take.input).model,'minimax/h3-max-turbo');assert.ok(Number.isInteger(Number(JSON.parse(take.input).seed)));}finally{globalThis.fetch=original;}});
test('another owner cannot generate into someone else’s scene',async()=>{globalThis.__headers.set('oai-authenticated-user-id','owner-b');await studio.saveKey('owner-b','other-key');const res=await generate.POST(request({id:'22345678-1234-1234-1234-123456789abc',scene:'scene-a',draft:{...studio.defaults,prompt:'A bird'}}));assert.equal(res.status,400);assert.match((await res.json()).error,/Scene not found/);globalThis.__headers.set('oai-authenticated-user-id','owner-a');});

test('opting out of adaptation preserves the original prompt exactly',async()=>{const p=await import(moduleURLPrompt);assert.equal(p.preparePrompt({prompt:'Alien eating a doughnut.',duration:5,model:'minimax/h3-max-turbo',adapt_prompt:false,look:'Super 8',sound:'No music'}),'Alien eating a doughnut.');});

test('storyboard planning is idempotent and board edits are owner-scoped',async()=>{
 const route=await import(moduleURL('app/api/storyboard/route.ts',url));
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,init)=>{calls++;assert.equal(url,'https://queue.fal.run/openrouter/router');const input=JSON.parse(init.body);assert.equal(input.enable_web_search,false);return Response.json({status_url:'https://queue.fal.run/openrouter/router/requests/p1/status',response_url:'https://queue.fal.run/openrouter/router/requests/p1'});};
 try{const body={action:'plan',id:'33345678-1234-1234-1234-123456789abc',script:'Alien eats a doughnut.',title:'Doughnut',count:4,ratio:'16:9'};
 assert.equal((await route.POST(request(body))).status,200);assert.equal((await route.POST(request(body))).status,200);assert.equal(calls,1);
 globalThis.__headers.set('oai-authenticated-user-id','owner-b');assert.equal((await route.POST(request({action:'sketch',board:body.id}))).status,400);assert.equal(calls,1);
 }finally{globalThis.fetch=original;globalThis.__headers.set('oai-authenticated-user-id','owner-a');}
});
test('storyboard rejects invalid shot lists and separates dialogue from drawing prompts',async()=>{const sb=await import(moduleURLStoryboard);assert.throws(()=>sb.decodePlan('{"panels":[]}'),/1–16/);const plan=sb.decodePlan(JSON.stringify({continuity:'Alien has three eyes',panels:[{title:'Bite',action:'Alien bites a doughnut',camera:'Close-up',dialogue:'Delicious!'}]}));const prompt=sb.sketchPrompt(plan.panels[0],plan.continuity);assert.match(prompt,/three eyes/);assert.match(prompt,/graphite pencil/);assert.equal(prompt.includes('Delicious!'),false);});

test('fal requests reject redirects without following them or parsing their bodies',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(target,init)=>{
  calls++;assert.equal(target,'https://queue.fal.run/minimax/h3-max-turbo/text-to-video');
  assert.equal(init.redirect,'manual');
  return new Response('Redirecting',{status:302,headers:{Location:'https://example.com/collect'}});
 };
 try{await assert.rejects(()=>studio.fal('https://queue.fal.run/minimax/h3-max-turbo/text-to-video',{method:'POST',body:'{}'}),/Unexpected redirect/);assert.equal(calls,1);}
 finally{globalThis.fetch=original;}
});

test('Monster Bestie demo is idempotent and isolated per owner',async()=>{
 const route=await import(moduleURL('app/api/demo/route.ts',url));
 const a=await (await route.POST(request({}))).json();const b=await (await route.POST(request({}))).json();assert.equal(a.project,b.project);
 assert.equal(sql.prepare('SELECT COUNT(*) as n FROM scenes WHERE project=?').get(a.project).n,3);
 const board=sql.prepare('SELECT * FROM boards WHERE id=?').get(a.board);assert.equal(JSON.parse(board.panels).length,6);
 globalThis.__headers.set('oai-authenticated-user-id','owner-b');const other=await (await route.POST(request({}))).json();assert.notEqual(other.project,a.project);globalThis.__headers.set('oai-authenticated-user-id','owner-a');
});
test('Character generation is idempotent and selecting another owner’s reference is rejected',async()=>{
 const route=await import(moduleURL('app/api/characters/route.ts',url));const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(target,init)=>{calls++;assert.equal(target,'https://queue.fal.run/fal-ai/flux/schnell');const p=JSON.parse(init.body);assert.equal(p.num_images,2);assert.equal(p.enable_safety_checker,true);assert.match(p.prompt,/SAME character/);return Response.json({status_url:'https://queue.fal.run/fal-ai/flux/requests/character/status',response_url:'https://queue.fal.run/fal-ai/flux/requests/character'});};
 try{const body={action:'generate',id:'a2345678-1234-1234-1234-123456789abc',kind:'alien',layout:'sheet',style:'spacecadet',name:'Groan',description:'A patient alien wearing a tiny tiara.'};assert.equal((await route.POST(request(body))).status,200);assert.equal((await route.POST(request(body))).status,200);assert.equal(calls,1);
 assert.equal((await route.POST(request({action:'select',id:body.id,image:'unowned'}))).status,400);
 globalThis.__headers.set('oai-authenticated-user-id','owner-b');assert.equal((await route.POST(request({action:'poll',id:body.id}))).status,400);
 }finally{globalThis.fetch=original;globalThis.__headers.set('oai-authenticated-user-id','owner-a');}
});
test('A completed character saves its images and can be selected without another generation',async()=>{
 const route=await import(moduleURL('app/api/characters/route.ts',url));const original=globalThis.fetch;const previousBucket=globalThis.__env.BUCKET;const saved=[];
 globalThis.__env.BUCKET={put:async(id,bytes)=>saved.push(id)};
 globalThis.fetch=async(target,init)=>{
  if(target==='https://queue.fal.run/fal-ai/flux/requests/character/status')return Response.json({status:'COMPLETED'});
  if(target==='https://queue.fal.run/fal-ai/flux/requests/character')return Response.json({images:[{url:'https://fal.media/char0.jpg'},{url:'https://fal.media/char1.jpg'}],has_nsfw_concepts:[false,false]});
  assert.match(String(target),/^https:\/\/fal.media\/char[01].jpg$/);assert.equal(init.redirect,'manual');return new Response(new Uint8Array([255,216,255]));
 };
 try{const id='a2345678-1234-1234-1234-123456789abc';assert.equal((await route.POST(request({action:'poll',id}))).status,200);assert.equal(saved.length,2);const c=sql.prepare('SELECT * FROM characters WHERE id=?').get(id);assert.equal(c.status,'COMPLETED');assert.equal((await route.POST(request({action:'select',id,image:saved[0]}))).status,200);assert.equal(sql.prepare('SELECT selected FROM characters WHERE id=?').get(id).selected,saved[0]);
 }finally{globalThis.fetch=original;globalThis.__env.BUCKET=previousBucket;}
});
