// Native scroll distances in viewport heights. Scene progress still drives the
// existing camera: only its pace changes between readable passages.
const intervals=[
  [.88,1.25], // statement: hold
  [.96,.85], // statement fades out
  [1.02,1.10], // scene only
  [1.07,.85], // works fades in
  [1.12,1.25], // works: hold
  [1.20,.85], // works fades out
  [1.24,1.20], // scene only
  [1.32,.85], // Atmos fades in
  [1.37,1.50], // Atmos: hold
  [1.45,.85], // Atmos fades out
  [1.51,1.20], // scene only
  [1.60,.85], // Flowgen fades in
  [1.78,1.50], // Flowgen: hold
  [2.08,1.30], // approach Fragments
  [2.18,.90], // Fragments: hold
  [2.44,1.30], // return to the path; Fragments fades out
  [2.54,1.30], // scene only
  [2.70,.90], // web experiences fades in
  [2.78,1.25], // web experiences: introduction
  [3.02,.90], // introduction -> scope
  [3.10,.90], // first scope pair
  [3.24,.85], // scope pair transition
  [3.34,.90], // second scope pair
];
export const JOURNEY_ANCHORS={works:1.095,atmos:1.345,flowgen:1.69,fragments:2.13,commissions:2.74,about:3.90,contact:4.86};
const base=mobile=>mobile?5.1:5.6;
function createPace(mobile){
  const rate=base(mobile),points=[[.74*rate,.74]];
  for(const [progress,distance] of intervals)points.push([points.at(-1)[0]+distance,progress]);
  const slopes=points.slice(1).map((p,i)=>(p[1]-points[i][1])/(p[0]-points[i][0]));
  const tangents=points.map((p,i)=>i===0||i===points.length-1?1/rate:2/(1/slopes[i-1]+1/slopes[i]));
  return {points,tangents};
}
const paces=[createPace(false),createPace(true)];
export function journeyProgress(pages,mobile=false){
  const {points,tangents}=paces[Number(mobile)],first=points[0],last=points.at(-1),rate=base(mobile);
  if(pages<=first[0])return Math.max(0,pages/rate);
  if(pages>=last[0])return last[1]+(pages-last[0])/rate;
  const i=points.findIndex(p=>p[0]>pages)-1,a=points[i],b=points[i+1],length=b[0]-a[0],t=(pages-a[0])/length;
  // Monotone Hermite interpolation keeps the walking speed continuous at
  // every reading hold, without timers, wheel interception or scroll snapping.
  return (2*t**3-3*t**2+1)*a[1]+(t**3-2*t**2+t)*length*tangents[i]
    +(-2*t**3+3*t**2)*b[1]+(t**3-t**2)*length*tangents[i+1];
}
export function journeyPages(progress,mobile=false){
  const {points}=paces[Number(mobile)],first=points[0],last=points.at(-1),rate=base(mobile);
  if(progress<=first[1])return Math.max(0,progress*rate);
  if(progress>=last[1])return last[0]+(progress-last[1])*rate;
  let low=first[0],high=last[0];
  for(let i=0;i<36;i++){const mid=(low+high)/2;if(journeyProgress(mid,mobile)<progress)low=mid;else high=mid;}
  return (low+high)/2;
}
