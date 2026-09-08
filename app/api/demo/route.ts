import {db,owner,fail,defaults} from '@/lib/studio';
import {MONSTER_SCRIPT,MONSTER_CONTINUITY,MONSTER_SHOTS,MONSTER_PANELS} from '@/lib/demo';
export async function POST(req:Request){try{
 const u=await owner(req),d=db();
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(u));
 const suffix=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,24);
 const project='monster-demo-'+suffix,board=project+'-board',format='monster-format-'+suffix;
 await d.batch([
 d.prepare('INSERT OR IGNORE INTO formats (id,owner,title,description,defaults,rules,created) VALUES (?,?,?,?,?,?,?)').bind(format,u,'Monster Bestie','A terrifying alien. A little girl. Everyday best-friend rituals.',JSON.stringify({look:'Phone footage',camera:'Parent’s handheld phone footage. Natural light. Keep the action readable.',sound:'Natural room tone and dialogue. No music.',aspect_ratio:'9:16',model:'minimax/h3-max-turbo',resolution:'480P',duration:5,prompt_expansion_mode:'balanced'}),'Immediate visual hook, simple build, clear payoff. Preserve the girl and alien’s appearance. Keep it candid and affectionate. Avoid unnecessary camera cuts.',Date.now()),
  d.prepare('INSERT OR IGNORE INTO projects (id,owner,title,created) VALUES (?,?,?,?)').bind(project,u,'Monster Bestie',Date.now()),
  ...MONSTER_SHOTS.map((shot,i)=>d.prepare('INSERT OR IGNORE INTO scenes (id,owner,project,title,draft,created) VALUES (?,?,?,?,?,?)').bind(project+'-'+i,u,project,shot.title,JSON.stringify({...defaults,board_id:board,panel_id:MONSTER_PANELS[[0,2,5][i]].id,prompt:shot.action,camera:shot.camera,sound:shot.dialogue,look:'Phone footage',aspect_ratio:'9:16'}),Date.now()+i)),
  d.prepare('INSERT OR IGNORE INTO boards (id,owner,title,script,continuity,ratio,panels,created) VALUES (?,?,?,?,?,?,?,?)').bind(board,u,'Monster Bestie',MONSTER_SCRIPT,MONSTER_CONTINUITY,'9:16',JSON.stringify(MONSTER_PANELS),Date.now())
 ]);
 await d.prepare("UPDATE projects SET format_id=?,title='The tea party' WHERE id=? AND owner=? AND format_id=''").bind(format,project,u).run();await d.prepare("UPDATE boards SET project=? WHERE id=? AND owner=? AND project=''").bind(project,board,u).run();return Response.json({format,project,board,scene:project+'-0'});
 }catch(e){return fail(e);}}
