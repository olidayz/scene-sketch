import test from 'node:test';
import assert from 'node:assert/strict';
import { localDevelopment } from '../build/local-development.mjs';

function invoke(headers, remoteAddress='127.0.0.1') {
  let middleware;
  localDevelopment().configureServer({middlewares:{use(fn){middleware=fn;}}});
  const req={headers:{...headers},rawHeaders:Object.entries(headers).flat(),socket:{remoteAddress}};
  const res={statusCode:200,end(body){this.body=body;}};
  let next=false;
  middleware(req,res,()=>{next=true;});
  return {req,res,next};
}
test('local development supplies a fixed identity and replaces spoofed identity',()=>{
  const result=invoke({host:'localhost:5173','oai-authenticated-user-id':'someone-else'});
  assert.equal(result.next,true);
  assert.equal(result.req.headers['oai-authenticated-user-id'],'local-developer');
  const forwarded=new Headers();
  for(let i=0;i<result.req.rawHeaders.length;i+=2) forwarded.append(result.req.rawHeaders[i],result.req.rawHeaders[i+1]);
  assert.equal(forwarded.get('oai-authenticated-user-id'),'local-developer');
});
test('local development rejects remote hosts, peers, and cross-origin requests',()=>{
  for(const result of [invoke({host:'evil.example'}),invoke({host:'localhost:5173'},'192.168.1.2'),invoke({host:'localhost:5173',origin:'https://evil.example'}),invoke({host:'localhost:5173',origin:'http://localhost:9000'})]) {
    assert.equal(result.res.statusCode,403);
    assert.equal(result.next,false);
  }
  assert.equal(invoke({host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173'}).next,true);
});
test('local identity plugin only applies to development serving, never builds or previews',()=>{
  const plugin=localDevelopment();
  assert.equal(plugin.apply({}, {command:'serve',mode:'development',isPreview:false}),true);
  for(const env of [{command:'build',mode:'development'},{command:'serve',mode:'production'},{command:'serve',mode:'development',isPreview:true}]) assert.equal(plugin.apply({},env),false);
});
