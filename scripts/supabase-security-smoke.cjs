// Explicit live QA only: uses disposable accounts supplied by an authorized operator.
// Never commit the configuration or account-state files (they contain access tokens).
const fs=require('fs'),assert=require('assert/strict');
if(!['pending','approved'].includes(process.argv[2]))throw Error('Specify pending or approved and supply explicit disposable QA configuration paths.');
const expectedStatus=process.env.QA_EXPECTED_STATUS??'pending';
if(!['pending','rejected'].includes(expectedStatus))throw Error('Invalid restricted-account status');
const {url,key}=JSON.parse(fs.readFileSync(process.env.QA_PUBLIC_CONFIG_PATH));
const state=JSON.parse(fs.readFileSync(process.env.QA_ACCOUNT_STATE_PATH));const accounts=state.accounts;
let passed=0;function ok(value,name){assert(value,name);passed++;console.log('PASS '+name)}
async function call(path,account,method='GET',body,extra={}){const r=await fetch(url+path,{method,headers:{apikey:key,...(account?{Authorization:'Bearer '+account.token}:{}),...(body instanceof Uint8Array?{'Content-Type':'application/octet-stream'}:{'Content-Type':'application/json'}),...extra},body:body===undefined?undefined:body instanceof Uint8Array?body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,ok:r.ok,data}}
function save(){fs.writeFileSync(process.env.QA_ACCOUNT_STATE_PATH,JSON.stringify(state),{mode:0o600})}
(async()=>{
const [a,b,p]=accounts;
if(process.argv[2]==='pending'){
 for(const account of [p]){const r=await call('/rest/v1/profiles?select=id,app_role,approval_status&id=eq.'+account.id,account);ok(r.ok&&r.data.length===1&&r.data[0].app_role==='student'&&r.data[0].approval_status===expectedStatus,'signup defaults '+account.role);}
 let r=await call('/rest/v1/rpc/student_assignment_scoreboard',p,'POST',{});ok(r.ok&&r.data.length===0,expectedStatus+' scoreboard denied');
 r=await call('/rest/v1/rpc/studio_is_member',p,'POST',{});ok(r.ok&&r.data===false,expectedStatus+' membership denied');
 r=await call('/rest/v1/work_submissions',p,'POST',{student_id:p.id,team_id:1,title:'QA '+state.tag,body:'Temporary security test fixture only.'});ok(!r.ok&&r.data.code==='42501',expectedStatus+' write denied');
 r=await call('/rest/v1/rpc/is_supervisor',null,'POST',{});ok(!r.ok,'anon privileged RPC denied');
}else{
 for(const account of [a,b]){let r=await call('/rest/v1/rpc/is_my_team',account,'POST',{p_team_id:account.teams[0]});ok(r.ok&&r.data===true,'approved own team '+account.role);r=await call('/rest/v1/rpc/is_my_team',account,'POST',{p_team_id:account===a?3:1});ok(r.ok&&r.data===false,'cross team membership '+account.role);}
 let r=await call('/rest/v1/rpc/approve_student',a,'POST',{p_user_id:p.id});ok(!r.ok,'student cannot approve accounts');
 r=await call('/rest/v1/profiles?id=eq.'+a.id,a,'PATCH',{app_role:'supervisor'},{Prefer:'return=representation'});ok(!r.ok||(Array.isArray(r.data)&&r.data.length===0),'student cannot escalate role');
 r=await call('/rest/v1/work_submissions',a,'POST',{student_id:a.id,team_id:1,title:'QA '+state.tag,body:'Temporary security test fixture only.'},{Prefer:'return=representation'});ok(r.ok&&r.data.length===1,'approved own-team write');state.workId=r.data[0].id;save();
 r=await call('/rest/v1/work_submissions?id=eq.'+state.workId,b);ok(r.ok&&r.data.length===0,'other team cannot read work');
 r=await call('/rest/v1/work_submissions?id=eq.'+state.workId,a,'PATCH',{team_id:3});ok(!r.ok&&r.data.code==='42501','cannot reassign work to another team');
 r=await call('/rest/v1/work_submissions',a,'POST',{student_id:a.id,team_id:3,title:'QA '+state.tag,body:'Temporary security test fixture only.'});ok(!r.ok&&r.data.code==='42501','cannot create work in another team');
 state.path='1/direct/'+a.id+'/qa-'+state.tag;save();const bytes=new Uint8Array(Buffer.from('1960 QA '+state.tag));
 r=await call('/storage/v1/object/studio-files/'+state.path,a,'POST',bytes);ok(r.ok,'own-team storage upload');
 r=await call('/storage/v1/object/authenticated/studio-files/'+state.path,b);ok(!r.ok,'cross-team storage download denied');
 r=await call('/storage/v1/object/authenticated/studio-files/'+state.path,a);ok(r.ok,'owner storage download');
 r=await call('/storage/v1/object/public/studio-files/'+state.path,null);ok(!r.ok,'public storage bypass denied');
 r=await call('/storage/v1/object/studio-files/3/direct/'+a.id+'/qa-'+state.tag,a,'POST',bytes);ok(!r.ok,'cross-team storage upload denied');
 r=await call('/storage/v1/object/sign/studio-files/'+state.path,a,'POST',{expiresIn:30});ok(r.ok&&r.data.signedURL,'signed URL creation');
 const signed=url+'/storage/v1'+r.data.signedURL;ok((await fetch(signed)).ok,'signed URL download');await new Promise(resolve=>setTimeout(resolve,35000));ok(!(await fetch(signed,{headers:{'Cache-Control':'no-cache'}})).ok,'signed URL expiry');
 r=await call('/storage/v1/object/studio-files',b,'DELETE',{prefixes:[state.path]});r=await call('/storage/v1/object/authenticated/studio-files/'+state.path,a);ok(r.ok,'other team cannot delete file');
 r=await call('/rest/v1/attachments',a,'POST',{contribution_id:null,team_id:1,uploaded_by:a.id,storage_path:state.path,file_name:'QA '+state.tag+'.txt',file_type:'text/plain'},{Prefer:'return=representation'});ok(r.ok&&r.data.length===1,'attachment record insert');state.attachmentId=r.data[0].id;save();
 r=await call('/rest/v1/attachments?id=eq.'+state.attachmentId,b);ok(r.ok&&r.data.length===0,'cross-team attachment read denied');
 await call('/storage/v1/object/studio-files',a,'DELETE',{prefixes:[state.path]});r=await call('/storage/v1/object/authenticated/studio-files/'+state.path,a);ok(r.ok,'saved submission protected from orphan cleanup');
 state.orphanPath='1/direct/'+a.id+'/qa-orphan-'+state.tag;save();r=await call('/storage/v1/object/studio-files/'+state.orphanPath,a,'POST',bytes);ok(r.ok,'orphan test upload');
 r=await call('/storage/v1/object/studio-files',a,'DELETE',{prefixes:[state.orphanPath]});ok(r.ok,'orphan cleanup request');r=await call('/storage/v1/object/authenticated/studio-files/'+state.orphanPath,a);ok(!r.ok,'orphan object removed');
}
console.log(JSON.stringify({passed,stage:process.argv[2]}));
})().catch(e=>{console.error('FAILED '+e.message);process.exit(1)});
