const RFC3339=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/i;
export function isRfc3339(value){
 if(typeof value!=='string')return false;const m=RFC3339.exec(value);if(!m)return false;
 const [,ys,mos,ds,hs,mis,ss,,offset]=m;const y=+ys,mo=+mos,d=+ds,h=+hs,mi=+mis,s=+ss;const cal=new Date(Date.UTC(y,mo-1,d));
 if(cal.getUTCFullYear()!==y||cal.getUTCMonth()+1!==mo||cal.getUTCDate()!==d||h>23||mi>59||s>59)return false;
 if(offset.toUpperCase()!=='Z'){const [oh,om]=offset.slice(1).split(':').map(Number);if(oh>23||om>59)return false;}
 return Number.isFinite(Date.parse(value));
}
export function parseRfc3339(v){if(!isRfc3339(v))throw new TypeError('Invalid RFC3339 timestamp');return new Date(v);}
export function offsetMinutesFromTimestamp(v){const m=RFC3339.exec(v);if(!m)throw new TypeError('Invalid RFC3339 timestamp');if(m[8].toUpperCase()==='Z')return 0;const sign=m[8][0]==='-'?-1:1;const [h,mi]=m[8].slice(1).split(':').map(Number);return sign*(h*60+mi);}
export function offsetForTimeZone(value,zone){
 const ms=parseRfc3339(value).getTime();const p=new Intl.DateTimeFormat('en-US-u-ca-iso8601',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms));
 const n=Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
 return Math.round((Date.UTC(n.year,n.month-1,n.day,n.hour,n.minute,n.second)-Math.floor(ms/1000)*1000)/60000);
}
