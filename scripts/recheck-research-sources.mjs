import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { listManifests, readJson, root } from './workflow-utils.mjs';

const args=process.argv.slice(2);
const value=flag=>{const index=args.indexOf(flag); return index>=0?args[index+1]:undefined;};
const batchId=value('--batch'); const apply=args.includes('--apply');
if (!batchId) throw new Error('Usage: npm run data:recheck:sources -- --batch <batchId> [--apply]');
const shared=readJson('data/research/shared-events-2026.json');
const manifests=listManifests().filter(item=>item.batchId===batchId);
if (!manifests.length) throw new Error(`Unknown batch ${batchId}`);
const memberIds=new Set(manifests.flatMap(item=>item.memberIds));
const eventIds=new Set(shared.participations.filter(item=>memberIds.has(item.memberId)).map(item=>item.eventId));
const sourceIds=new Set(shared.events.filter(item=>eventIds.has(item.id)).flatMap(item=>item.sourceIds));
for(const link of shared.participations.filter(item=>memberIds.has(item.memberId))) for(const id of link.sourceIds??[]) sourceIds.add(id);
const sources=shared.sources.filter(item=>sourceIds.has(item.id)); const checkedAt=new Date().toISOString();

const classify=status=>status>=200&&status<400?'verified':[404,410].includes(status)?'stale':'indeterminate';
async function nodeCheck(url){
  for(const method of ['HEAD','GET']) try {
    const response=await fetch(url,{method,redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'user-agent':'LegisMap source verifier/1.0',...(method==='GET'?{range:'bytes=0-0'}:{})}});
    if(response.body) await response.body.cancel();
    if(response.status!==405&&response.status!==501) return {method:`node_${method.toLowerCase()}`,status:response.status};
  } catch(error) { if(method==='GET') return {method:'node_fetch',status:null,error:error.message}; }
  return {method:'node_fetch',status:null,error:'No usable HTTP response'};
}
function curlCheck(url){
  let lastError=null;
  for(const [method,extra] of [['head',['-I']],['range_get',['-r','0-0']]]) try {
    const output=execFileSync('curl.exe',['-L',...extra,'--max-time','20','-A','LegisMap source verifier/1.0','-sS','-o','NUL','-w','%{http_code}',url],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    const status=Number(output.slice(-3));
    if(Number.isFinite(status)&&status>0&&![403,405,501].includes(status)) return {method:`curl_${method}`,status};
    if(Number.isFinite(status)&&status>0) lastError=`HTTP ${status}`;
  } catch(error) { lastError=error.stderr?.toString().trim()||error.message; }
  return {method:'curl',status:null,error:lastError??'No usable HTTP response'};
}
const results=[];
for(const source of sources){
  let check=await nodeCheck(source.url); let outcome=check.status===null?'indeterminate':classify(check.status);
  if(outcome==='indeterminate') { const fallback=curlCheck(source.url); if(fallback.status!==null){check=fallback; outcome=classify(fallback.status);} else check={...check,fallbackError:fallback.error}; }
  results.push({sourceId:source.id,url:source.url,outcome,status:check.status,method:check.method,checkedAt,error:check.error??null,fallbackError:check.fallbackError??null});
}
const verified=results.filter(item=>item.outcome==='verified'), stale=results.filter(item=>item.outcome==='stale'), indeterminate=results.filter(item=>item.outcome==='indeterminate');
const report={schemaVersion:'1.1.0',generatedAt:checkedAt,batchId,sourceCount:results.length,verifiedCount:verified.length,staleCount:stale.length,indeterminateCount:indeterminate.length,results};
mkdirSync(`${root}/source-rechecks`,{recursive:true});
writeFileSync(`${root}/source-rechecks/${batchId}.json`,`${JSON.stringify(report,null,2)}\n`);
if(apply&&stale.length===0&&indeterminate.length===0){ const date=checkedAt.slice(0,10); for(const source of shared.sources) if(sourceIds.has(source.id)) source.lastVerifiedAt=date; writeFileSync('data/research/shared-events-2026.json',`${JSON.stringify(shared,null,2)}\n`); }
console.log(`Source recheck — ${verified.length}/${results.length} verified, ${stale.length} stale, ${indeterminate.length} indeterminate${apply&&stale.length===0&&indeterminate.length===0?', verification dates updated':''}.`);
if(stale.length){ console.error(`${stale.length} confirmed stale source(s); batch must return to needs_followup.`); process.exitCode=1; }
else if(indeterminate.length){ console.error(`${indeterminate.length} source(s) could not be positively verified; no dates were updated.`); process.exitCode=2; }
