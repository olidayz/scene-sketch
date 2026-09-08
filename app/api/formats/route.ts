import {db,owner,fail,parseDraft,defaults} from '@/lib/studio';
export async function POST(req:Request){try{const u=await owner(req),b=await req.json() as any,d=db();
 if(b.action==='create'){
  const title=String(b.title||'').trim().slice(0,100);if(!title)throw new Error('Give the format a name.');const id=crypto.randomUUID();
  let settings={...defaults,aspect_ratio:'9:16'},description='';
  if(b.scene){const s=await d.prepare('SELECT draft FROM scenes WHERE id=? AND owner=?').bind(b.scene,u).first<any>();if(!s)throw new Error('Scene not found.');settings={...settings,...parseDraft(JSON.parse(s.draft))};description=JSON.parse(s.draft).prompt||'';}
  const clean={look:settings.look,camera:settings.camera,sound:settings.sound,aspect_ratio:settings.aspect_ratio,model:settings.model,resolution:settings.resolution,duration:settings.duration,prompt_expansion_mode:settings.prompt_expansion_mode};
  await d.prepare('INSERT INTO formats (id,owner,title,description,defaults,created) VALUES (?,?,?,?,?,?)').bind(id,u,title,description.slice(0,2000),JSON.stringify(clean),Date.now()).run();return Response.json({id});
 }
 const f=await d.prepare('SELECT * FROM formats WHERE id=? AND owner=?').bind(b.id,u).first<any>();if(!f)throw new Error('Format not found.');
 if(b.action==='save'){
  const title=String(b.title||'').trim().slice(0,100);if(!title)throw new Error('Give the format a name.');
  const draft=parseDraft({...defaults,...b.defaults,prompt:'',seed:'',image:'',endImage:''});
  if(!Array.isArray(b.cast)||b.cast.length>30||b.cast.some((id:any)=>typeof id!=='string'))throw new Error('Choose up to 30 cast members.');
  const cast=[...new Set(b.cast)] as string[];for(const id of cast){if(!await d.prepare('SELECT id FROM characters WHERE id=? AND owner=?').bind(id,u).first())throw new Error('Character not found.');}
  const clean={look:draft.look,camera:draft.camera,sound:draft.sound,aspect_ratio:draft.aspect_ratio,model:draft.model,resolution:draft.resolution,duration:draft.duration,prompt_expansion_mode:draft.prompt_expansion_mode};
  const r=await d.prepare('UPDATE formats SET title=?,description=?,defaults=?,rules=?,cast=?,revision=revision+1 WHERE id=? AND owner=? AND revision=?').bind(title,String(b.description||'').slice(0,2000),JSON.stringify(clean),String(b.rules||'').slice(0,6000),JSON.stringify(cast),f.id,u,b.revision).run();if(!r.meta.changes)throw new Error('The format changed in another session. Reopen it before saving.');return Response.json({ok:true});
 }
 if(b.action==='episode'){
  const title=String(b.title||'').trim().slice(0,100);if(!title)throw new Error('Name this episode.');const id=crypto.randomUUID();await d.prepare('INSERT INTO projects (id,owner,title,format_id,kind,created) VALUES (?,?,?,?,?,?)').bind(id,u,title,f.id,'episode',Date.now()).run();return Response.json({id});
 }
 if(b.action==='adopt'){
  const p=await d.prepare('SELECT * FROM projects WHERE id=? AND owner=?').bind(b.project,u).first<any>();if(!p||p.kind==='playground')throw new Error('Choose an existing episode.');await d.prepare('UPDATE projects SET format_id=? WHERE id=? AND owner=?').bind(f.id,p.id,u).run();return Response.json({ok:true});
 }
 if(b.action==='add_cast'){
  if(!await d.prepare('SELECT id FROM characters WHERE id=? AND owner=?').bind(b.character,u).first())throw new Error('Character not found.');
  await d.prepare("UPDATE formats SET cast=json_insert(cast,'$[#]',?),revision=revision+1 WHERE id=? AND owner=? AND NOT EXISTS (SELECT 1 FROM json_each(formats.cast) WHERE value=?)").bind(b.character,f.id,u,b.character).run();return Response.json({ok:true});
 }
 throw new Error('Unknown format action.');
}catch(e){return fail(e);}}
