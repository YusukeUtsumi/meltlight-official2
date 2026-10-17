// Project a DOM interface onto the same four photo-space points as its mirror.
export function surfaceTransform(width,height,points){
  const [a,b,c,d]=points,dx1=b[0]-c[0],dx2=d[0]-c[0],dx3=a[0]-b[0]+c[0]-d[0],dy1=b[1]-c[1],dy2=d[1]-c[1],dy3=a[1]-b[1]+c[1]-d[1];
  const det=dx1*dy2-dx2*dy1;
  const g=Math.abs(det)>1e-9?(dx3*dy2-dx2*dy3)/det:0,h=Math.abs(det)>1e-9?(dx1*dy3-dx3*dy1)/det:0;
  const m=[(b[0]-a[0]+g*b[0])/width,(b[1]-a[1]+g*b[1])/width,0,g/width,(d[0]-a[0]+h*d[0])/height,(d[1]-a[1]+h*d[1])/height,0,h/height,0,0,1,0,a[0],a[1],0,1];
  return `matrix3d(${m.map(v=>v.toFixed(9)).join(',')})`;
}
