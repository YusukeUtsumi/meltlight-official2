export const STATION={id:'19432',name:'Kushiro, Hokkaido, Japan',lat:42.985,lon:144.3766667};
const BASE='https://www.jma.go.jp/bosai/amedas';
export const FRESH_MS=30*60*1000;
export function parseObservationTime(key){
  if(!/^\d{14}$/.test(key))return NaN;
  return Date.parse(`${key.slice(0,4)}-${key.slice(4,6)}-${key.slice(6,8)}T${key.slice(8,10)}:${key.slice(10,12)}:${key.slice(12,14)}+09:00`);
}
export function selectObservation(data,latest,now=Date.now()){
  for(const key of Object.keys(data).sort().reverse()){
    const temp=data[key]?.temp,at=parseObservationTime(key);
    if(!Array.isArray(temp)||temp.length!==2||!Number.isFinite(temp[0])||temp[1]!==0)continue;
    if(!Number.isFinite(at)||at>latest||at>now+5*60*1000||now-at>24*60*60*1000)continue;
    const wind=data[key]?.wind;
    const windSpeed=Array.isArray(wind)&&wind.length===2&&Number.isFinite(wind[0])&&wind[0]>=0&&wind[1]===0?wind[0]:null;
    return {temperature:temp[0],windSpeed,observedAt:at,fetchedAt:now,stationId:STATION.id,source:'jma',kind:'observed'};
  }
  return null;
}
function blockUrl(timestamp){
  const d=new Date(timestamp+9*60*60*1000);
  const date=`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
  const hour=String(Math.floor(d.getUTCHours()/3)*3).padStart(2,'0');
  return `${BASE}/data/point/${STATION.id}/${date}_${hour}.json`;
}
export async function fetchObservation({fetcher=fetch,now=Date.now(),signal}={}){
  const latestResponse=await fetcher(`${BASE}/data/latest_time.txt`,{signal});
  if(!latestResponse.ok)throw new Error('Observation clock unavailable');
  const latest=Date.parse((await latestResponse.text()).trim());
  if(!Number.isFinite(latest)||latest>now+5*60*1000)throw new Error('Invalid observation clock');
  for(const timestamp of [latest,latest-3*60*60*1000]){
    const response=await fetcher(blockUrl(timestamp),{signal});
    if(!response.ok)continue;
    const observation=selectObservation(await response.json(),latest,now);
    if(observation)return observation;
  }
  throw new Error('No valid temperature observation');
}
export function isFresh(observation,now=Date.now()){
  return Boolean(observation&&Number.isFinite(observation.temperature)&&observation.source==='jma'&&observation.kind==='observed'&&observation.stationId===STATION.id&&Number.isFinite(observation.observedAt)&&now-observation.observedAt<=FRESH_MS&&observation.observedAt<=now+5*60*1000);
}
export function observationLabel(observation,now=Date.now()){
  const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'}).format(observation.observedAt);
  const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',month:'short',day:'2-digit'}).format(observation.observedAt);
  return `${isFresh(observation,now)?'Observed':'Last observation'} ${date}, ${time} JST · JMA`;
}
