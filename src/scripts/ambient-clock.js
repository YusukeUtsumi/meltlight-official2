let elapsed=0,last=0;
// Multiple visible water scenes may paint in the same animation frame. Count
// that frame once, and preserve its phase when the visitor crosses sections.
export function ambientTime(now,active){
  if(active){if(last&&now!==last)elapsed+=Math.max(0,Math.min((now-last)/1000,.07));last=now;}
  return elapsed;
}
