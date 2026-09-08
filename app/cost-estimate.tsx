'use client';
import {useEffect,useState} from 'react';
import {price} from '@/lib/pricing';
export default function CostEstimate({draft,count=1}:{draft:{model?:string;resolution:string;duration:number;references?:string[]};count?:number}){
 const [dimensions,setDimensions]=useState<Record<string,{width:number;height:number}>>({}),[failed,setFailed]=useState(false);
 const ids=JSON.stringify(draft.references||[]);
 useEffect(()=>{let active=true;setFailed(false);for(const id of JSON.parse(ids)){if(dimensions[id])continue;const image=new Image();image.onload=()=>{if(active)setDimensions(d=>({...d,[id]:{width:image.naturalWidth,height:image.naturalHeight}}));};image.onerror=()=>{if(active)setFailed(true);};image.src='/api/media?id='+encodeURIComponent(id);}return()=>{active=false;};},[ids]);
 const p=price(draft,count,dimensions),refs=!!draft.references?.length;
 return <div className="cost-breakdown"><div className="estimate"><span>Estimated cost · {count} {count===1?'test':'tests'}</span><strong>{p.total===null?(failed?'Estimate unavailable':'Calculating…'):`$${p.total.toFixed(3)}`}</strong></div>{refs&&<p>Video: ${p.video?.toFixed(3)} · References: {p.references===null?'calculating…':`$${p.references.toFixed(3)}`}</p>}<p>{refs?(draft.model==='minimax/h3'?'First 5 images included; $0.08 per additional image per test.':'First 4,096 image tokens included per test; $0.02 per 1,000 extra tokens. Image dimensions determine tokens.'):''}</p><p>Published list rates · checked Sep 8, 2026. Updates as you change settings; actual fal charges may differ with discounts and rounding. <a href={p.source} target="_blank" rel="noreferrer">Pricing ↗</a></p></div>;
}
