// Homography from a unit rectangle to four corners on a photographed plane.
export function surfaceMatrix(points){
  const [a,b,c,d]=points,dx1=b[0]-c[0],dx2=d[0]-c[0],dx3=a[0]-b[0]+c[0]-d[0],dy1=b[1]-c[1],dy2=d[1]-c[1],dy3=a[1]-b[1]+c[1]-d[1];
  const det=dx1*dy2-dx2*dy1;
  const g=Math.abs(det)>1e-9?(dx3*dy2-dx2*dy3)/det:0,h=Math.abs(det)>1e-9?(dx1*dy3-dx3*dy1)/det:0;
  return [b[0]-a[0]+g*b[0],b[1]-a[1]+g*b[1],g,d[0]-a[0]+h*d[0],d[1]-a[1]+h*d[1],h,a[0],a[1],1];
}
export function surfacePoint(matrix,x,y){
  const w=matrix[2]*x+matrix[5]*y+matrix[8];
  return [(matrix[0]*x+matrix[3]*y+matrix[6])/w,(matrix[1]*x+matrix[4]*y+matrix[7])/w];
}
export function inverseSurfaceMatrix(points){
  const m=surfaceMatrix(points),a=m.slice(0,3),b=m.slice(3,6),c=m.slice(6,9);
  const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const rows=[cross(b,c),cross(c,a),cross(a,b)],det=a.reduce((sum,n,i)=>sum+n*rows[0][i],0);
  return [0,1,2].flatMap(i=>rows.map(row=>row[i]/det));
}
export function surfaceTransform(width,height,points){
  const h=surfaceMatrix(points);
  const matrix=[h[0]/width,h[1]/width,0,h[2]/width,h[3]/height,h[4]/height,0,h[5]/height,0,0,1,0,h[6],h[7],0,h[8]];
  return `matrix3d(${matrix.map(v=>v.toFixed(9)).join(',')})`;
}
