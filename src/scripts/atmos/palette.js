// Shared temperature mapping, copied verbatim from Atmos index.html.
// Source: /Users/yusukeutsumi/Documents/atmos/index.html, temperature → base colour.
export const TEMP_STOPS = [
  { t:-20, top:[ 48, 22, 96], bot:[ 96,152,214] },   // 極寒だけ菫に振る
  { t: -8, top:[ 26, 46,128], bot:[142,192,224] },
  { t:  3, top:[ 20, 88,152], bot:[170,216,220] },
  { t: 13, top:[ 26,112,172], bot:[204,224,206] },
  { t: 21, top:[ 42,124,186], bot:[240,214,168] },
  { t: 28, top:[ 58,120,190], bot:[250,196,144] },   // 常温はまだ青。暖色は地平側だけ
  { t: 34, top:[118, 96,186], bot:[252,160,116] },   // ここから菫
  { t: 39, top:[172, 68,146], bot:[250,120, 92] },   // マゼンタは酷暑にだけ出る
  { t: 45, top:[152, 26, 88], bot:[248, 96, 78] },
];
export function tempColor(t){
  const s = TEMP_STOPS;
  if (t <= s[0].t) return { top:[...s[0].top], bot:[...s[0].bot] };
  if (t >= s[s.length-1].t) return { top:[...s[s.length-1].top], bot:[...s[s.length-1].bot] };
  for (let i=0; i<s.length-1; i++){
    if (t >= s[i].t && t <= s[i+1].t){
      const k = (t - s[i].t) / (s[i+1].t - s[i].t);
      const m = (a,b) => [0,1,2].map(j => a[j] + (b[j]-a[j])*k);
      return { top: m(s[i].top, s[i+1].top), bot: m(s[i].bot, s[i+1].bot) };
    }
  }
  return { top:[...s[0].top], bot:[...s[0].bot] };
}
