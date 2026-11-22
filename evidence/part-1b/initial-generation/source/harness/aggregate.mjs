export const THRESHOLDS=Object.freeze({schemaRate:1,invariantRate:1,guardrailViolations:0,caseSemanticMin:.75,meanSemanticMin:.85});
export function aggregateResults(results,{expectedModelCases=null}={}){
 if(results.some(r=>r.validationValid===false))return {status:'FAIL',thresholds:THRESHOLDS,failures:['one or more deterministic input-validation cases were accepted']};
 const modeled=results.filter(r=>r.modelEvaluated!==false);
 const infra=results.some(r=>r.providerError);
 const skipped=expectedModelCases!==null&&modeled.length<expectedModelCases;
 if(infra||skipped||modeled.length===0)return {status:'INCONCLUSIVE',thresholds:THRESHOLDS,counts:{modelCases:modeled.length,providerErrors:results.filter(r=>r.providerError).length,skipped:Math.max(0,(expectedModelCases??modeled.length)-modeled.length)}};
 const schemaRate=modeled.filter(r=>r.schemaValid).length/modeled.length;
 const invariantRate=modeled.filter(r=>r.invariantsValid).length/modeled.length;
 const guards=modeled.reduce((s,r)=>s+(r.guardrailViolations??0),0);
 const scores=modeled.filter(r=>r.semanticApplicable).map(r=>r.semanticScore);
 const mean=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:0;
 const min=scores.length?Math.min(...scores):0;
 const pass=schemaRate===1&&invariantRate===1&&guards===0&&scores.length>0&&min>=THRESHOLDS.caseSemanticMin&&mean>=THRESHOLDS.meanSemanticMin;
 return {status:pass?'PASS':'FAIL',thresholds:THRESHOLDS,metrics:{schemaRate,invariantRate,guardrailViolations:guards,minSemanticScore:min,meanSemanticScore:mean,scoredCases:scores.length}};
}
