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
function moduleURL(file,studio){let source=readFileSync(file,'utf8').replace("import { env } from 'cloudflare:workers';","const env = globalThis.__env;").replace("import { headers } from 'next/headers';","const headers = async () => globalThis.__headers;");source=source.replaceAll("'@/lib/demo'",JSON.stringify('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync('lib/demo.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')));if(source.includes("'@/lib/formats'"))source=source.replaceAll("'@/lib/formats'",JSON.stringify(moduleURL('lib/formats.ts',studio)));if(studio)source=source.replaceAll("'@/lib/studio'",JSON.stringify(studio));source=source.replaceAll("'@/lib/prompting'",JSON.stringify(moduleURLPrompt)).replaceAll("'@/lib/storyboard'",JSON.stringify(moduleURLStoryboard));const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');}
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
test('Visual look choices survive saving and adapt the submitted prompt',async()=>{
 const prompting=await import(moduleURLPrompt);
 for(const look of ['Phone footage','Super 8','CCTV','News broadcast','Glossy commercial']){
  const draft=studio.parseDraft({...studio.defaults,prompt:'An alien holds coffee.',look});
  assert.equal(draft.look,look);assert.ok(prompting.preparePrompt(draft).includes(prompting.looks[look]));
 }
});
test('Scene character links persist and reject references outside the owner’s cast',async()=>{
 const workspace=await import(moduleURL('app/api/workspace/route.ts',url));
 const c=sql.prepare('SELECT * FROM characters WHERE owner=?').get('owner-a');
 const draft={...studio.defaults,prompt:'The alien drinks tea.',character_id:c.id,character_image:JSON.parse(c.images)[0]};
 assert.equal((await workspace.POST(request({action:'draft',id:'scene-a',draft}))).status,200);
 assert.equal(JSON.parse(sql.prepare('SELECT draft FROM scenes WHERE id=?').get('scene-a').draft).character_id,c.id);
 assert.equal((await workspace.POST(request({action:'draft',id:'scene-a',draft:{...draft,character_image:'not-an-owned-reference'}}))).status,400);
});

test('Formats own episodes and new scenes inherit style, rules and cast',async()=>{
 const formats=await import(moduleURL('app/api/formats/route.ts',url)),workspace=await import(moduleURL('app/api/workspace/route.ts',url));
 const created=await (await formats.POST(request({action:'create',title:'Alien Temu'}))).json();const f=sql.prepare('SELECT * FROM formats WHERE id=?').get(created.id);
 const c=sql.prepare('SELECT * FROM characters WHERE owner=?').get('owner-a');
 assert.equal((await formats.POST(request({action:'save',id:f.id,revision:0,title:'Alien Temu',description:'Cheap cosmic products',defaults:{...studio.defaults,look:'CCTV',aspect_ratio:'9:16'},rules:'Unbox, test, rate.',cast:[c.id]}))).status,200);
 const p=await (await formats.POST(request({action:'episode',id:f.id,title:'Gravity boots'}))).json();
 const scene=await (await workspace.POST(request({action:'scene',project:p.id,title:'The first step'}))).json();
 const draft=JSON.parse(sql.prepare('SELECT draft FROM scenes WHERE id=?').get(scene.id).draft);assert.equal(draft.look,'CCTV');assert.equal(draft.format_rules,'Unbox, test, rate.');assert.match(draft.cast_context,/Groan/);
 assert.equal((await formats.POST(request({action:'save',id:f.id,revision:0,title:'Stale',defaults:studio.defaults,cast:[]}))).status,400);
 globalThis.__headers.set('oai-authenticated-user-id','owner-b');assert.equal((await formats.POST(request({action:'episode',id:f.id,title:'Not mine'}))).status,400);globalThis.__headers.set('oai-authenticated-user-id','owner-a');
});
test('Playground is idempotent, has no format defaults, and promotes scenes without losing takes',async()=>{
 const workspace=await import(moduleURL('app/api/workspace/route.ts',url));
 const a=await (await workspace.POST(request({action:'playground'}))).json(),b=await (await workspace.POST(request({action:'playground'}))).json();assert.equal(a.id,b.id);
 const s=await (await workspace.POST(request({action:'scene',project:a.id,title:'Free test'}))).json();const draft=JSON.parse(sql.prepare('SELECT draft FROM scenes WHERE id=?').get(s.id).draft);assert.equal(draft.format_rules,'');assert.equal(draft.cast_context,'');
 const existing=sql.prepare('SELECT id FROM takes WHERE scene=?').all('scene-a');const target=sql.prepare("SELECT id FROM projects WHERE kind='episode' LIMIT 1").get();assert.equal((await workspace.POST(request({action:'move_scene',id:'scene-a',project:target.id}))).status,200);assert.deepEqual(sql.prepare('SELECT id FROM takes WHERE scene=?').all('scene-a'),existing);
});
test('Episode board lists include legacy boards while excluding other episodes and owners',async()=>{
 const route=await import(moduleURL('app/api/storyboard/route.ts',url));
 for(const [id,owner,project] of [['scope-board','owner-a','episode-scope'],['legacy-board','owner-a',''],['other-board','owner-a','other-episode'],['private-board','owner-b','episode-scope']])sql.prepare('INSERT INTO boards (id,owner,title,script,ratio,project,created) VALUES (?,?,?,?,?,?,?)').run(id,owner,id,'Script','9:16',project,1);
 const response=await route.GET(new Request('https://studio.example/api/storyboard?project=episode-scope'));assert.equal(response.status,200);const rows=await response.json();assert.ok(rows.some(r=>r.id==='scope-board'));assert.ok(rows.some(r=>r.id==='legacy-board'&&r.title.includes('Unassigned')));assert.ok(!rows.some(r=>['other-board','private-board'].includes(r.id)));
});
test('References route to H3 Max with ordered assets, persist, and reject unowned images',async()=>{
 const previous=globalThis.__env.BUCKET,original=globalThis.fetch;let calls=0;
 globalThis.__env.BUCKET={get:async()=>({arrayBuffer:async()=>new Uint8Array([255,216,255]).buffer})};
 sql.prepare('INSERT INTO assets (id,owner,mime,name) VALUES (?,?,?,?)').run('subject-ref','owner-a','image/jpeg','Alien');
 globalThis.fetch=async(endpoint,init)=>{calls++;assert.equal(endpoint,'https://queue.fal.run/minimax/h3-max/reference-to-video');const p=JSON.parse(init.body);assert.equal(p.reference_image_urls.length,1);assert.equal(p.image_url,undefined);assert.equal(p.aspect_ratio,'16:9');assert.match(p.prompt,/not opening or ending frames/);return Response.json({request_id:'ref-take',status_url:'https://queue.fal.run/minimax/h3-max/requests/ref-take/status',response_url:'https://queue.fal.run/minimax/h3-max/requests/ref-take'});};
 try{const draft={...studio.defaults,prompt:'Image 1 walks through the garden.',references:['subject-ref']};const id='b2345678-1234-1234-1234-123456789abc';assert.equal((await generate.POST(request({id,scene:'scene-a',draft}))).status,200);assert.deepEqual(JSON.parse(sql.prepare('SELECT input FROM takes WHERE id=?').get(id).input).references,['subject-ref']);assert.equal((await generate.POST(request({id:'c2345678-1234-1234-1234-123456789abc',scene:'scene-a',draft:{...draft,references:['unowned']}}))).status,400);assert.equal(calls,1);assert.throws(()=>studio.parseDraft({...draft,image:'start'}),/either/);assert.throws(()=>studio.parseDraft({...draft,references:Array(13).fill('subject-ref')}),/12/);}finally{globalThis.__env.BUCKET=previous;globalThis.fetch=original;}
});
test('Reference uploads accept images above the old 1 MiB framework cap and enforce 5 MiB',async()=>{
 const media=await import(moduleURL('app/api/media/route.ts',url));const previous=globalThis.__env.BUCKET;let size=0;globalThis.__env.BUCKET={put:async(_id,bytes)=>{size=bytes.length;}};
 const upload=size=>{const bytes=new Uint8Array(size);bytes[0]=255;bytes[1]=216;const form=new FormData();form.set('file',new File([bytes],'reference.jpg',{type:'image/jpeg'}));return new Request('https://studio.example/api/media',{method:'POST',body:form,headers:{origin:'https://studio.example'}});};
 try{assert.equal((await media.POST(upload(2*1024*1024))).status,200);assert.equal(size,2*1024*1024);assert.equal((await media.POST(upload(5*1024*1024+1))).status,400);assert.match(readFileSync('next.config.ts','utf8'),/bodySizeLimit:\s*'6mb'/);}finally{globalThis.__env.BUCKET=previous;}
});
test('H3 supports high-resolution reference generation and preserves its model',async()=>{
 const original=globalThis.fetch,previous=globalThis.__env.BUCKET;
 globalThis.__env.BUCKET={get:async()=>({arrayBuffer:async()=>new Uint8Array([255,216,255]).buffer})};let calls=0;
 globalThis.fetch=async(endpoint,init)=>{calls++;assert.equal(endpoint,'https://queue.fal.run/minimax/h3/reference-to-video');const p=JSON.parse(init.body);assert.equal(p.resolution,'2K');assert.equal(p.reference_image_urls.length,1);return Response.json({request_id:'h3-hq',status_url:'https://queue.fal.run/minimax/h3/requests/h3-hq/status',response_url:'https://queue.fal.run/minimax/h3/requests/h3-hq'});};
 try{const draft={...studio.defaults,model:'minimax/h3',resolution:'2K',references:['subject-ref'],prompt:'Image 1 walks through a room.'};assert.equal((await generate.POST(request({id:'d2345678-1234-1234-1234-123456789abc',scene:'scene-a',draft}))).status,200);assert.equal(calls,1);assert.equal(studio.parseDraft({...draft,resolution:'4K'}).model,'minimax/h3');assert.throws(()=>studio.parseDraft({...draft,model:'minimax/h3-max'}),/settings/);assert.throws(()=>studio.parseDraft({...draft,references:Array(10).fill('subject-ref')}),/9 reference/);assert.equal(studio.parseDraft({...studio.defaults,model:'minimax/h3-max',resolution:'1080P'}).resolution,'1080P');}finally{globalThis.fetch=original;globalThis.__env.BUCKET=previous;}
});
test('Reference cost estimates include dimensions, free allowance and batch count',async()=>{
 const {price}=await import(moduleURL('lib/pricing.ts',url));const refs=['a','b','c','d','e'],dimensions=Object.fromEntries(refs.map(id=>[id,{width:1024,height:1024}]));
 const d={model:'minimax/h3-max',duration:5,resolution:'768P',references:refs};assert.equal(price({...d,references:refs.slice(0,4)},1,dimensions).total,.4);assert.ok(Math.abs(price(d,2,dimensions).total-.84096)<.000001);assert.equal(price(d).total,null);assert.equal(price({...d,model:'minimax/h3',resolution:'2K'}).total,.65);assert.equal(price({...d,model:'minimax/h3',resolution:'4K',references:[...refs,'f']}).total,.88);
});
test('fal preserves useful rejection reasons and distinguishes rejection from uncertain submission',async()=>{
 const original=globalThis.fetch;try{
 globalThis.fetch=async()=>Response.json({detail:[{loc:['body','resolution'],msg:'Unsupported resolution'}]},{status:422});
 const r=await generate.POST(request({id:'e2345678-1234-1234-1234-123456789abc',scene:'scene-a',draft:{...studio.defaults,prompt:'An alien waves.'}}));assert.equal(r.status,400);assert.match((await r.json()).error,/Unsupported resolution/);assert.equal(sql.prepare('SELECT status FROM takes WHERE id=?').get('e2345678-1234-1234-1234-123456789abc').status,'FAILED');
 globalThis.fetch=async()=>{throw new Error('Network timeout');};await generate.POST(request({id:'f2345678-1234-1234-1234-123456789abc',scene:'scene-a',draft:{...studio.defaults,prompt:'An alien waves.'}}));assert.equal(sql.prepare('SELECT status FROM takes WHERE id=?').get('f2345678-1234-1234-1234-123456789abc').status,'CHECK_REQUIRED');
 }finally{globalThis.fetch=original;}
});
test('Rechecking a failed fal job retrieves its reason without submitting another generation',async()=>{
 const poll=await import(moduleURL('app/api/poll/route.ts',url));const original=globalThis.fetch;const id='d2345678-1234-1234-1234-123456789abc';sql.prepare("UPDATE takes SET status='FAILED' WHERE id=?").run(id);let calls=0;
 globalThis.fetch=async(target,init)=>{assert.ok(!init.method||init.method==='GET');calls++;return String(target).endsWith('/status')?Response.json({status:'COMPLETED'}):Response.json({detail:'Provider denied this request: policy check.'},{status:403});};
 try{assert.equal((await poll.POST(request({id,recheck:true}))).status,200);assert.equal(calls,2);assert.match(sql.prepare('SELECT error FROM takes WHERE id=?').get(id).error,/policy check/);}finally{globalThis.fetch=original;}
});
