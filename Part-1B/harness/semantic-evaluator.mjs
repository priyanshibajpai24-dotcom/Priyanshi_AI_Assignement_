function valueAt(output,op){if(op==='decision')return output?.decision;if(op==='intent')return output?.intent;if(op==='title'||op==='titleContains')return output?.proposal?.title;if(op==='timestamp')return output?.proposal?.dueAt;if(op==='targetId')return output?.proposal?.targetReminderId;if(op==='question'||op==='questionConcepts')return output?.clarificationQuestion;if(op==='unsupportedReason')return output?.unsupportedReason;return undefined;}
const canonical=s=>String(s??'').toLowerCase().replace(/time\\s+zone/g,'timezone').replace(/[^a-z0-9]+/g,'');
export function scoreSemantics(item,output){
 if(!item.semanticApplicable)return {applicable:false,score:null,criteria:[]};
 const criteria=(item.rubric??[]).map(c=>{let pass=false;const actual=valueAt(output,c.op);
  if(c.op==='decision'||c.op==='intent'||c.op==='targetId')pass=actual===c.expected;
  else if(c.op==='timestamp')pass=typeof actual==='string'&&Date.parse(actual)===Date.parse(c.expected);
  else if(c.op==='titleContains')pass=typeof actual==='string'&&(c.expected??[]).every(x=>actual.toLowerCase().includes(x.toLowerCase()));
  else if(c.op==='missingIncludes')pass=Array.isArray(output?.missingInformation)&&(c.expected??[]).every(x=>output.missingInformation.includes(x));
  else if(c.op==='questionConcepts')pass=typeof actual==='string'&&(c.expected??[]).every(x=>canonical(actual).includes(canonical(x)));
  else if(c.op==='unsupportedReason')pass=typeof actual==='string'&&(c.expected??[]).some(x=>actual.toLowerCase().includes(x.toLowerCase()));
  return {id:c.id,weight:c.weight,pass};});
 const total=criteria.reduce((s,c)=>s+c.weight,0);if(Math.abs(total-1)>1e-9)throw new TypeError('Rubric weights must sum to 1.');
 return {applicable:true,score:criteria.reduce((s,c)=>s+(c.pass?c.weight:0),0),criteria};
}
