import {tempColor} from './palette.js';
import {fetchObservation,isFresh,observationLabel,STATION} from './weather.js';
const CACHE='meltlight:kushiro-observation:v1';
export function mountAtmos(){
  const root=document.querySelector('[data-atmos-world]');if(!root)return;
  const value=root.querySelector('[data-temperature]'),caption=root.querySelector('[data-observation]');
  const windRow=root.querySelector('.atmos-wind'),windValue=root.querySelector('[data-wind]');
  let disposed=false,seen=false,fetching=false,lastFetch=0,controller=null,observation=null;
  function showObservation(next){
    observation=next;
    const fresh=isFresh(next);
    root.dataset.weather=fresh?'observed':'stale';
    root.dataset.temperature=String(next.temperature);root.dataset.observedAt=new Date(next.observedAt).toISOString();
    value.textContent=next.temperature.toFixed(1);caption.textContent=observationLabel(next);
    const hasWind=Number.isFinite(next.windSpeed)&&next.windSpeed>=0;
    windRow.hidden=!hasWind;windValue.textContent=hasWind?next.windSpeed.toFixed(1):'—';
    if(hasWind)root.dataset.windSpeed=String(next.windSpeed);else delete root.dataset.windSpeed;
    const colors=tempColor(next.temperature);
    root.style.setProperty('--atmos-top',`rgb(${colors.top.map(n=>Math.round(n*.48)).join(' ')})`);
    root.style.setProperty('--atmos-bottom',`rgb(${colors.bot.map(n=>Math.round(n*.42)).join(' ')})`);
    window.dispatchEvent(new CustomEvent('meltlight:weather',{detail:{observation:next,colors}}));
  }
  try{
    const cache=JSON.parse(localStorage.getItem(CACHE)||'null');
    if(cache?.stationId===STATION.id&&cache.source==='jma'&&cache.kind==='observed'&&Number.isFinite(cache.temperature)&&Number.isFinite(cache.observedAt)&&Date.now()-cache.observedAt<24*60*60*1000&&cache.observedAt<=Date.now())showObservation(cache);
  }catch{}
  async function refresh(){
    if(fetching||disposed||document.hidden||!seen)return;
    fetching=true;lastFetch=Date.now();controller=new AbortController();
    const timeout=setTimeout(()=>controller?.abort(),10000);
    try{
      const next=await fetchObservation({signal:controller.signal});if(disposed)return;
      showObservation(next);try{localStorage.setItem(CACHE,JSON.stringify(next));}catch{}
    }catch{
      if(disposed)return;
      if(observation){root.dataset.weather='stale';caption.textContent=observationLabel(observation)+' · Update unavailable';}
      else{root.dataset.weather='unavailable';caption.textContent='Observation unavailable';}
    }finally{clearTimeout(timeout);fetching=false;controller=null;}
  }
  const onVisibility=()=>{if(!document.hidden&&Date.now()-lastFetch>10*60*1000)refresh();};
  const intersection=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){seen=true;if(Date.now()-lastFetch>10*60*1000)refresh();}},{rootMargin:'400px'});intersection.observe(root);
  const interval=setInterval(()=>{if(seen&&!document.hidden&&root.getBoundingClientRect().bottom>0&&root.getBoundingClientRect().top<innerHeight){
    if(observation){root.dataset.weather=isFresh(observation)?'observed':'stale';caption.textContent=observationLabel(observation);}refresh();
  }},10*60*1000);
  window.addEventListener('online',refresh);document.addEventListener('visibilitychange',onVisibility);
  function dispose(){
    disposed=true;clearInterval(interval);controller?.abort();intersection.disconnect();
    window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',onVisibility);document.removeEventListener('astro:before-swap',dispose);
  }
  document.addEventListener('astro:before-swap',dispose,{once:true});if(import.meta.hot)import.meta.hot.dispose(dispose);
}
