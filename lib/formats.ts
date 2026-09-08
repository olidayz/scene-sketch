import {db,defaults} from '@/lib/studio';
export async function formatDefaults(project:string,u:string){
 const p=await db().prepare('SELECT * FROM projects WHERE id=? AND owner=?').bind(project,u).first<any>();
 if(!p)throw new Error('Episode not found.');
 if(!p.format_id)return {...defaults,format_rules:'',cast_context:''};
 const f=await db().prepare('SELECT * FROM formats WHERE id=? AND owner=?').bind(p.format_id,u).first<any>();if(!f)throw new Error('Format not found.');
 const rows=await db().prepare('SELECT id,name,description FROM characters WHERE owner=?').bind(u).all<any>();
 const ids=JSON.parse(f.cast);const cast=rows.results.filter((c:any)=>ids.includes(c.id)).map((c:any)=>`${c.name}: ${c.description}`).join('\n').slice(0,6000);
 return {...defaults,...JSON.parse(f.defaults),prompt:'',image:'',endImage:'',seed:'',format_rules:f.rules,cast_context:cast,adapt_prompt:true};
}
