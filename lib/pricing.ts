// Published fal list rates, checked 2026-09-08. Estimates exclude account discounts.
// https://fal.ai/models/minimax/h3-max/reference-to-video
// https://fal.ai/models/minimax/h3/reference-to-video
export const modelNames:Record<string,string>={'minimax/h3-max-turbo':'H3 Max Turbo · budget','minimax/h3-max':'H3 Max · quality','minimax/h3':'H3 · high resolution'};
export const resolutions=(model?:string)=>model==='minimax/h3'?['480P','768P','2K','4K']:['480P','768P','1080P'];
export function price(input:{model?:string;resolution:string;duration:number;references?:string[]},count=1,dimensions:Record<string,{width:number;height:number}>={}){
 const refs=input.references||[],model=input.model==='minimax/h3'?'minimax/h3':refs.length?'minimax/h3-max':input.model||'minimax/h3-max';
 const rates:Record<string,Record<string,number>>={'minimax/h3':{'480P':.05,'768P':.06,'2K':.13,'4K':.16},'minimax/h3-max':{'480P':.05,'768P':.08,'1080P':.16},'minimax/h3-max-turbo':{'480P':.025,'768P':.04,'1080P':.08}};
 const rate=rates[model]?.[input.resolution];const video=rate===undefined?null:rate*input.duration*count;
 const known=model==='minimax/h3'||refs.every(id=>dimensions[id]?.width>0&&dimensions[id]?.height>0);
 const tokens=refs.reduce((sum,id)=>sum+(dimensions[id]?dimensions[id].width*dimensions[id].height/1024:0),0);
 const references=known?(model==='minimax/h3'?Math.max(0,refs.length-5)*.08:Math.max(0,tokens-4096)/1000*.02)*count:null;
 return {video,references,total:video===null||references===null?null:video+references,tokens,source:`https://fal.ai/models/${model}/${refs.length?'reference-to-video':'text-to-video'}`};
}
