import {db,owner,fail,defaults} from '@/lib/studio';
import {MONSTER_SCRIPT,MONSTER_CONTINUITY,MONSTER_SHOTS,MONSTER_PANELS} from '@/lib/demo';
export async function POST(req:Request){try{
 const u=await owner(req),d=db();
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(u));
 const suffix=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,24);
 const project='monster-demo-'+suffix,board=project+'-board';
 await d.batch([
  d.prepare('INSERT OR IGNORE INTO projects (id,owner,title,created) VALUES (?,?,?,?)').bind(project,u,'Monster Bestie',Date.now()),
  ...MONSTER_SHOTS.map((shot,i)=>d.prepare('INSERT OR IGNORE INTO scenes (id,owner,project,title,draft,created) VALUES (?,?,?,?,?,?)').bind(project+'-'+i,u,project,shot.title,JSON.stringify({...defaults,prompt:shot.action,camera:shot.camera,sound:shot.dialogue,look:'Phone footage',aspect_ratio:'9:16'}),Date.now()+i)),
  d.prepare('INSERT OR IGNORE INTO boards (id,owner,title,script,continuity,ratio,panels,created) VALUES (?,?,?,?,?,?,?,?)').bind(board,u,'Monster Bestie',MONSTER_SCRIPT,MONSTER_CONTINUITY,'9:16',JSON.stringify(MONSTER_PANELS),Date.now())
 ]);
 return Response.json({project,board,scene:project+'-0'});
 }catch(e){return fail(e);}}
