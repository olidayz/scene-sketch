import { createRouteHandler } from '@fal-ai/server-proxy/nextjs';
import type { NextRequest } from 'next/server';
import {owner,key,fail} from '@/lib/studio';
const proxy=createRouteHandler({allowedEndpoints:['minimax/h3-max/director','minimax/h3-max/director/ice'],allowedUrlPatterns:['fal.run/minimax/h3-max/director/**','fal.run/minimax/h3-max/director'],serviceHosts:['wma.fal.run'],allowUnauthorizedRequests:false,isAuthenticated:async()=>{await owner();return true;},resolveFalAuth:async()=>`Key ${await key()}`});
async function handle(req:NextRequest){try{await owner(req);const target=req.headers.get('x-fal-target-url');if(!target||new URL(target).protocol!=='https:')return Response.json({error:'Invalid Director service'},{status:400});return await proxy.POST(req);}catch(e){return fail(e);}}
export const POST=handle;
export const GET=handle;
export const PUT=handle;
