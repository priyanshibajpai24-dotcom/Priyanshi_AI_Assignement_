let TemporalApi = null;
try { ({ Temporal: TemporalApi } = await import('@js-temporal/polyfill')); }
catch (error) { if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/i;
export function isRfc3339(value) {
 if (typeof value !== 'string') return false;
 const m=RFC3339.exec(value);if(!m)return false;
 const [,ys,mos,ds,hs,mis,ss,,offset]=m;
 const y=Number(ys),mo=Number(mos),d=Number(ds),h=Number(hs),mi=Number(mis),s=Number(ss);
 const calendar=new Date(Date.UTC(y,mo-1,d));
 if(calendar.getUTCFullYear()!==y||calendar.getUTCMonth()+1!==mo||calendar.getUTCDate()!==d||h>23||mi>59||s>59)return false;
 if(offset.toUpperCase()!=='Z'){const [oh,om]=offset.slice(1).split(':').map(Number);if(oh>23||om>59)return false;}
 return Number.isFinite(Date.parse(value));
}
export function parseRfc3339(value){if(!isRfc3339(value))throw new TypeError('Expected RFC 3339 timestamp with explicit offset.');return new Date(value);}
export function isValidTimeZone(zone){if(typeof zone!=='string'||!zone)return false;try{new Intl.DateTimeFormat('en-US',{timeZone:zone}).format(0);return true;}catch{return false;}}
function partsAt(epochMs,zone){
 const p=new Intl.DateTimeFormat('en-US-u-ca-iso8601',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(epochMs));
 return Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
}
export function offsetForTimeZone(timestamp,zone){
 const instant=parseRfc3339(timestamp).getTime(),p=partsAt(instant,zone);
 return Math.round((Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-Math.floor(instant/1000)*1000)/60000);
}
function localStamp(value){
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
 if(!m)throw new TypeError('Expected local date and time as YYYY-MM-DDTHH:mm[:ss].');
 const [,y,mo,d,h,mi,ss='0']=m,n={year:+y,month:+mo,day:+d,hour:+h,minute:+mi,second:+ss};
 const dt=new Date(Date.UTC(n.year,n.month-1,n.day));
 if(dt.getUTCFullYear()!==n.year||dt.getUTCMonth()+1!==n.month||dt.getUTCDate()!==n.day||n.hour>23||n.minute>59||n.second>59)throw new TypeError('Invalid local date/time.');
 return n;
}
export function classifyLocalDateTime(localDateTime,zone){
 if(!isValidTimeZone(zone))throw new TypeError('Invalid IANA time zone.');
 const local=localStamp(localDateTime);
 if(TemporalApi?.ZonedDateTime){
  try{const zoned=TemporalApi.ZonedDateTime.from({timeZone:zone,...local},{disambiguation:'reject'});return{kind:'unique',instants:[zoned.toInstant().toString()]};}catch(error){if(!(error instanceof RangeError))throw error;}
 }
 const wanted=Date.UTC(local.year,local.month-1,local.day,local.hour,local.minute,local.second),offsets=new Set();
 for(let delta=-48;delta<=48;delta+=3)offsets.add(offsetForTimeZone(new Date(wanted+delta*3600000).toISOString().replace('Z','+00:00'),zone));
 const instants=[];
 for(const offset of offsets){const candidate=wanted-offset*60000,p=partsAt(candidate,zone);if(p.year===local.year&&p.month===local.month&&p.day===local.day&&p.hour===local.hour&&p.minute===local.minute&&p.second===local.second)instants.push(new Date(candidate).toISOString());}
 const unique=[...new Set(instants)].sort();return{kind:unique.length===0?'gap':unique.length===1?'unique':'overlap',instants:unique};
}
export function offsetMinutesFromTimestamp(value){
 const m=RFC3339.exec(value);if(!m)throw new TypeError('Invalid RFC 3339 timestamp.');
 if(m[8].toUpperCase()==='Z')return 0;const sign=m[8][0]==='-'?-1:1;const[h,min]=m[8].slice(1).split(':').map(Number);return sign*(h*60+min);
}
