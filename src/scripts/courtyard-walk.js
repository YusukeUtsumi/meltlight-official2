import {createCodeTexture,codeTravel} from './flowgen/code-texture.js';
import {surfaceMatrix,surfacePoint,inverseSurfaceMatrix} from './flowgen/projection.js';
// A shared, metre-based corridor. Photographic projections retain the approved
// materials; the route, portal thickness and nearby piers have real geometry.
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=n=>Math.min(1,Math.max(0,n));
const ease=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
const FOV=44*Math.PI/180, IMAGE_ASPECT=16/9;
export const ROUTE={gateZ:20,gateX:6,width:3.6,eye:1.6,endZ:32};
// The camera reaches the back of the two-metre portal (z=22) here.
export const GATE_EXIT_PROGRESS=.5164197229262744;
export function pathX(z){return 6*ease(0,20,z);}
export function walkCamera(progress,aspect=IMAGE_ASPECT){
  // One continuous trajectory, at a constant eye height above solid stone.
  const z=32*ease(.055,.79,progress)+14*ease(.98,1.32,progress)+14*ease(1.40,2.05,progress)+8*ease(2.35,2.95,progress)+6*ease(3.34,4.04,progress)+3*ease(4.08,4.42,progress);
  const x=pathX(z), ahead=z+5;
  const heading=Math.atan2(pathX(ahead)-x,ahead-z);
  const initial=aspect<.9?.20:0;
  // Release the lens and gaze along the same causeway, then continue forward.
  // No reverse travel, eye-height change, or replacement of the mirror image.
  const returnToPath=ease(2.18,2.42,progress),focus=ease(1.76,2.08,progress)*(1-returnToPath),mobile=aspect<.9;
  const earlyYaw=mobile?.34*ease(.98,1.23,progress)*(1-returnToPath):0;
  return {x,y:ROUTE.eye,z,yaw:mix(mix(initial,heading,ease(0,7,z))+earlyYaw,mobile?.395:.405,focus),pitch:mix(.05,.215,focus),zoom:mix(1,mobile?1.65:2.8,focus)};
}
function matrix(camera,aspect){
  const {x,y,z,yaw,pitch}=camera, cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const right=[cy,0,-sy],up=[-sy*sp,cp,-cy*sp],back=[-sy*cp,-sp,-cy*cp];
  const dot=v=>v[0]*x+v[1]*y+v[2]*z;
  const view=new Float32Array([right[0],up[0],back[0],0,right[1],up[1],back[1],0,right[2],up[2],back[2],0,-dot(right),-dot(up),-dot(back),1]);
  const f=(camera.zoom||1)*Math.max(1,aspect/IMAGE_ASPECT)/Math.tan(FOV/2), near=.09,far=150;
  const projection=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
  const result=new Float32Array(16);
  for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)result[col*4+row]+=projection[k*4+row]*view[col*4+k];
  return result;
}
export {matrix as cameraMatrix};
export function photoProjector(camera,width,height){
  const view=matrix(camera,width/height),f=1/Math.tan(FOV/2),cp=Math.cos(.05),sp=Math.sin(.05);
  function point(u,v){
    const ry=(1-2*(v-.05))/f,rx=(2*u-1)*IMAGE_ASPECT/f;
    const ray=[rx,sp+ry*cp,cp-ry*sp],t=63/ray[2];
    const scale=Math.min(1,63/Math.max(95-camera.z,1));
    const p=[camera.x+ray[0]*t/scale,camera.y+ray[1]*t/scale,camera.z+63/scale,1];
    const clip=[0,0,0,0];for(let row=0;row<4;row++)for(let col=0;col<4;col++)clip[row]+=view[col*4+row]*p[col];
    return [(clip[0]/clip[3]*.5+.5)*width,(.5-clip[1]/clip[3]*.5)*height];
  }
  return point;
}
export function projectInscription(camera,width,height){
  const point=photoProjector(camera,width,height);
  const a=point(.750,.245),b=point(.867,.402);
  return {left:a[0],top:a[1],width:b[0]-a[0],height:b[1]-a[1]};
}
// Use coordinates within the gate's actual sloping face, not an axis-aligned
// rectangle in the source image. Its horizontal lines share the gate's vanishing point.
const fragmentsGate=surfaceMatrix([[.700,.228],[.879,.070],[.889,.652],[.701,.656]]);
export const FRAGMENTS_SURFACE=[[.07,.10],[.94,.10],[.94,.49],[.07,.49]].map(([x,y])=>surfacePoint(fragmentsGate,x,y));
const fragmentsInverse=new Float32Array(inverseSurfaceMatrix(FRAGMENTS_SURFACE));
export function projectFragments(camera,width,height){
  const point=photoProjector(camera,width,height);
  return FRAGMENTS_SURFACE.map(([u,v])=>point(u,v));
}
const anchors=[walkCamera(0),walkCamera(.42),walkCamera(.79)];
const vertex=`
attribute vec3 aPosition,aNormal;
uniform mat4 uView;
varying vec3 vWorld,vNormal;
void main(){vWorld=aPosition;vNormal=aNormal;gl_Position=uView*vec4(aPosition,1.);}
`;
const fragment=`
precision highp float;
uniform sampler2D uCourtyard,uGate,uLayers,uStone,uCode,uArtwork;
uniform mat4 uPhoto0,uPhoto1,uPhoto2;
uniform mat3 uPanelInverse;
uniform float uMaterial,uTime,uStudy;
uniform vec3 uCamera,uTempTop,uTempBottom;
uniform float uTempKnown,uAuroraTime,uWindSpeed,uFlowgen,uCodePhase,uExperience;
uniform vec2 uCursor;
varying vec3 vWorld,vNormal;
vec2 projected(mat4 camera,vec3 point){vec4 p=camera*vec4(point,1.);return vec2(p.x/p.w*.5+.5,.5-p.y/p.w*.5);}
vec2 exteriorUv(vec3 point){
  // Compensate both axes equally. Correcting x alone made the photographed
  // exterior grow vertically while its width stayed fixed during travel.
  float scale=min(1.,63./max(95.-uCamera.z,1.));
  // Work in camera-relative 3D before perspective division, so the slight
  // camera pitch cannot introduce a different vertical scale either.
  vec3 anchored=vec3(6.,1.6,32.)+(point-uCamera)*scale;
  return projected(uPhoto2,anchored);
}
// Masks follow the four original mirror faces in the photograph. No new
// structures, moved silhouettes, or color changes to their door openings.
float edge(vec2 a,vec2 b,vec2 p){vec2 e=b-a,d=p-a;return (e.x*d.y-e.y*d.x)/length(e);}
float face(vec2 p,vec2 a,vec2 b,vec2 c,vec2 d){
  float inside=min(min(edge(a,b,p),edge(b,c,p)),min(edge(c,d,p),edge(d,a,p)));
  return smoothstep(-.0007,.0012,inside);
}
float auroraNoise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453);
  float b=fract(sin(dot(i+vec2(1.,0.),vec2(127.1,311.7)))*43758.5453);
  float c=fract(sin(dot(i+vec2(0.,1.),vec2(127.1,311.7)))*43758.5453);
  float d=fract(sin(dot(i+vec2(1.,1.),vec2(127.1,311.7)))*43758.5453);
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
vec3 thermalSurface(vec2 uv,vec3 original){
  // Before Atmos these are the original mirrors, even when data is loaded.
  if(uTempKnown<.0001)return original;
  float left=face(uv,vec2(.034,-.15),vec2(.245,.039),vec2(.239,.654),vec2(.019,.657));
  left*=1.-face(uv,vec2(.130,.315),vec2(.195,.360),vec2(.191,.659),vec2(.126,.659));
  float right=face(uv,vec2(.700,.228),vec2(.879,.070),vec2(.889,.652),vec2(.701,.656));
  right*=1.-face(uv,vec2(.788,.437),vec2(.837,.449),vec2(.840,.657),vec2(.790,.657));
  float middleLeft=face(uv,vec2(.344,.457),vec2(.425,.413),vec2(.426,.647),vec2(.344,.651));
  middleLeft*=1.-face(uv,vec2(.370,.533),vec2(.399,.537),vec2(.399,.652),vec2(.370,.652));
  float middleRight=face(uv,vec2(.587,.485),vec2(.653,.521),vec2(.655,.648),vec2(.587,.647));
  middleRight*=1.-face(uv,vec2(.614,.568),vec2(.635,.563),vec2(.635,.649),vec2(.614,.649));
  float mask=max(max(left,right),max(middleLeft,middleRight))*uTempKnown;
  if(mask<.0001)return original;
  // Each original gate carries a full sheet of light, rather than sampling
  // a narrow strip from one global field. Its sloping upper edge stays fixed.
  vec2 fabric;float seed;
  if(right>0.){
    float x=(uv.x-.700)/.189,top=mix(.228,.070,clamp(x,0.,1.));
    fabric=vec2(x,(uv.y-top)/(.654-top));seed=1.8;
  }else if(left>0.){fabric=vec2((uv.x-.019)/.226,uv.y/.655);seed=4.3;}
  else if(middleLeft>0.){
    float x=(uv.x-.344)/.082,top=mix(.457,.413,clamp(x,0.,1.));
    fabric=vec2(x,(uv.y-top)/(.649-top));seed=2.7;
  }else{
    float x=(uv.x-.587)/.068,top=mix(.485,.521,clamp(x,0.,1.));
    fabric=vec2(x,(uv.y-top)/(.649-top));seed=5.1;
  }
  float wind=clamp(uWindSpeed/12.,0.,1.),t=uAuroraTime;
  float h=fabric.y,x=fabric.x;
  float breath=auroraNoise(vec2(h*1.7+seed,t*.14));
  float billow=auroraNoise(vec2(x*2.+seed,h*1.5-t*.11))-.5;
  float sway=.13+wind*.24;
  // Three translucent, bowed sheets. The width changes down their length;
  // folds pass through each other instead of repeating parallel sine bars.
  float centreA=.27+sway*sin(h*6.0-t*.48+seed)+.13*sin(h*8.3+t*.23)+billow*.25;
  float centreB=.72+sway*.85*sin(h*4.6+t*.37+seed*1.7)+.12*sin(h*7.5-t*.21);
  float hemC=.65+.17*sin(x*5.2-t*.31+seed)+.07*sin(x*9.7+t*.20);
  float widthA=.21+.09*sin(h*2.8+t*.19+seed)+breath*.08;
  float widthB=.23+.09*cos(h*3.9-t*.16)+breath*.07;
  float sheetA=exp(-pow((x-centreA)/widthA,2.)*1.5);
  float sheetB=exp(-pow((x-centreB)/widthB,2.)*1.4);
  float sheetC=(1.-smoothstep(hemC-.13,hemC+.18,h))*(.55+.45*breath);
  float foldA=.68+.32*sin((x-centreA)/widthA*4.2+sin(h*2.1+t*.18)*.7);
  float foldB=.70+.30*sin((x-centreB)/widthB*4.7+sin(h*3.-t*.13)*.6);
  float hem=.65+.35*smoothstep(.05,.45,h)*(1.-smoothstep(.75,1.35,h));
  sheetA*=foldA*hem;sheetB*=foldB*(.65+.35*breath);sheetC*=.60;
  vec3 cool=mix(uTempTop,uTempBottom,.12+.23*breath);
  vec3 pearl=mix(uTempTop,uTempBottom,.62+.20*sin(h*1.5+t*.16));
  float light=dot(original,vec3(.2126,.7152,.0722));
  vec3 glow=cool*(sheetA*.95+sheetC*.18)+pearl*(sheetB*.78+sheetC*.16);
  // Emissive light is clearly visible, while the original reflected cloud
  // texture and edges remain. Water calls this same material before dimming.
  vec3 luminous=original*.56+glow*(.80+light*.65);
  return mix(original,luminous,mask);

}
vec3 spatialSurface(vec2 uv,vec3 original){
  if(uExperience<.0001)return original;
  // These are the same photo-space face masks as Atmos. Silhouettes, door
  // openings, stone, and sky stay untouched; only the mirror coating changes.
  float left=face(uv,vec2(.034,-.15),vec2(.245,.039),vec2(.239,.654),vec2(.019,.657));
  left*=1.-face(uv,vec2(.130,.315),vec2(.195,.360),vec2(.191,.659),vec2(.126,.659));
  float right=face(uv,vec2(.700,.228),vec2(.879,.070),vec2(.889,.652),vec2(.701,.656));
  right*=1.-face(uv,vec2(.788,.437),vec2(.837,.449),vec2(.840,.657),vec2(.790,.657));
  float ml=face(uv,vec2(.344,.457),vec2(.425,.413),vec2(.426,.647),vec2(.344,.651));
  ml*=1.-face(uv,vec2(.370,.533),vec2(.399,.537),vec2(.399,.652),vec2(.370,.652));
  float mr=face(uv,vec2(.587,.485),vec2(.653,.521),vec2(.655,.648),vec2(.587,.647));
  mr*=1.-face(uv,vec2(.614,.568),vec2(.635,.563),vec2(.635,.649),vec2(.614,.649));
  float mask=max(max(left,right),max(ml,mr));
  if(mask<.0001)return original;
  vec2 p;float seed;
  if(right>0.){float x=(uv.x-.700)/.189,top=mix(.228,.070,clamp(x,0.,1.));p=vec2(x,(uv.y-top)/(.654-top));seed=1.4;}
  else if(left>0.){p=vec2((uv.x-.019)/.226,uv.y/.655);seed=3.7;}
  else if(ml>0.){p=vec2((uv.x-.344)/.082,(uv.y-.413)/.238);seed=2.2;}
  else{p=vec2((uv.x-.587)/.068,(uv.y-.485)/.164);seed=4.5;}
  float drift=sin(uTime*.12+seed)*.09+uCursor.x*.045;
  float plane=p.x-p.y*.38-drift;
  float pearl=exp(-pow((plane-.34)/.20,2.));
  float rose=exp(-pow((plane-.76)/.29,2.));
  float inset=min(min(p.x,1.-p.x),min(p.y,1.-p.y));
  float depth=1.-smoothstep(.05,.21,inset);
  vec3 glow=vec3(.21,.25,.31)*pearl+vec3(.20,.12,.10)*rose;
  vec3 coating=original*.78+glow*(.65+.35*depth);
  return mix(original,coating,mask*uExperience*.72);
}
vec3 reflectedArtwork(vec2 uv,vec3 original){
  vec3 panelPoint=uPanelInverse*vec3(uv,1.);
  vec2 panel=panelPoint.xy/panelPoint.z;
  if(uFlowgen<.001||panel.x<.04||panel.x>.53||panel.y<.14||panel.y>.84)return original;
  vec2 art=vec2((panel.x-.04)/.49,(panel.y-.14)/.70);
  vec3 image=texture2D(uArtwork,art).rgb;
  return mix(original,image*.7,uFlowgen*.65);
}
vec3 codeCurrent(vec3 world,float wave,float crossWave){
  if(uFlowgen<.0001)return vec3(0.);
  float z=world.z,x=world.x-6.;
  float warp=sin(z*.16)*1.0+sin(z*.31+x*.13)*.28;
  vec2 uv=vec2((x+warp)/9.,(-z+uCodePhase)/48.);
  uv+=vec2(crossWave,wave)*.0018;
  vec4 ink=texture2D(uCode,fract(uv));
  vec4 softA=texture2D(uCode,fract(uv+vec2(.0015,.0008)));
  vec4 softB=texture2D(uCode,fract(uv-vec2(.0015,.0008)));
  vec3 lettering=ink.rgb*ink.a*1.6+(softA.rgb*softA.a+softB.rgb*softB.a)*.30;
  float thread=pow(.5+.5*sin((x+warp)*2.2),38.);
  float dash=pow(.5+.5*sin((z-uCodePhase)*6.2831853),5.);
  vec3 glints=mix(vec3(.30,.47,.65),vec3(.80,.50,.27),.5+.5*sin(x*.7))*thread*(.12+dash*.6);
  float bank=smoothstep(1.75,2.3,abs(x))*(1.-smoothstep(26.,45.,abs(x)));
  float depth=1.-smoothstep(40.,75.,z-uCamera.z);
  return (lettering+glints)*bank*depth*uFlowgen;
}
vec3 stoneSurface(vec3 world){
  vec3 col;
    // Continuous stone, including beneath every shallow mortar seam.
    vec2 uv=vec2(world.x,world.z)*.24;
    vec3 grain=texture2D(uStone,uv).rgb;
    float height=dot(grain,vec3(.333));
    float dx=dot(texture2D(uStone,uv+vec2(.0015,0.)).rgb,vec3(.333))-height;
    float dz=dot(texture2D(uStone,uv+vec2(0.,.0015)).rgb,vec3(.333))-height;
    vec3 normal=normalize(vec3(-dx*11.,1.,-dz*11.));
    vec3 eye=normalize(uCamera-world);
    float joint=1.-.19*(1.-smoothstep(.012,.025,min(fract(world.z/2.15),1.-fract(world.z/2.15))));
    float sheen=pow(max(dot(reflect(normalize(vec3(-.3,-.8,-.4)),normal),eye),0.),26.);
    // Sample only close stone detail, never a projected sky/water/horizon.
    // Mirrored world-space tiles retain the wet photographic grain without
    // changing their position or introducing a dark band as the camera moves.
    float centre=6.*smoothstep(0.,20.,world.z);
    vec2 tile=1.-abs(mod(vec2(world.x-centre,world.z)*vec2(.32,.26),2.)-1.);
    vec3 wetStone=texture2D(uLayers,vec2(.40,.84)+tile*vec2(.20,.14)).rgb;
    col=mix(grain*vec3(.40,.47,.61),wetStone*vec3(.76,.81,.94),.62)*joint;
    col+=vec3(.10,.12,.17)*sheen;
    float rose=pow(max(dot(reflect(normalize(vec3(0.,-.16,-1.)),normal),eye),0.),8.);
    col+=vec3(.095,.053,.037)*rose;
    float lamp=exp(-abs(world.z-20.)*.23)*exp(-abs(abs(world.x-6.)-1.65)*1.8);
    col+=vec3(.13,.075,.042)*lamp;

  return col;
}
vec3 waterTone(vec3 reflection,float z){
  // Use the same navy water body and reflected-light exposure on both the
  // physical plane and its photographed continuation.
  return mix(reflection*.30,vec3(.065,.085,.12),smoothstep(30.,80.,z)*.62);
}
vec3 photograph(float id,vec3 p){
  if(id<.5)return texture2D(uCourtyard,clamp(projected(uPhoto0,p),.002,.998)).rgb;
  if(id<1.5)return texture2D(uGate,clamp(projected(uPhoto1,p),.002,.998)).rgb;
  vec2 uv=clamp(exteriorUv(p)+vec2(0.,.05),.002,.998);
  // The photo has its own wider stone path. Reproject that ground onto the
  // physical route: outside the real banks, continue the adjacent photographed water.
  // Merely stretching the photograph here also drags gate reflections sideways.
  if(uv.y>.642&&p.y<uCamera.y-.001){
    float groundT=uCamera.y/(uCamera.y-p.y);
    vec3 ground=mix(uCamera,p,groundT);
    float across=(ground.x-4.2)/3.6;
    float left=.476-(uv.y-.645)*1.30;
    float right=.522+(uv.y-.645)*1.155;
    float footprint=(1.-smoothstep(0.,.004,max(left-uv.x,uv.x-right)))*smoothstep(.642,.647,uv.y);
    if(across<0.||across>1.){
      vec3 original=spatialSurface(uv,thermalSurface(uv,texture2D(uLayers,uv).rgb));
      // Start below all gate feet. Preserve the mist at the waterline while
      // removing the brighter blue band farther down the photographed water.
      float grade=smoothstep(.657,.687,uv.y);
      original=mix(original,waterTone(original,ground.z),grade);
      // Fill the removed photographed stone with adjacent photographed water,
      // retaining its horizon light instead of introducing a dark wedge.
      vec3 leftWater=texture2D(uLayers,clamp(vec2(left-.002,uv.y),.002,.998)).rgb;
      vec3 rightWater=texture2D(uLayers,clamp(vec2(right+.002,uv.y),.002,.998)).rgb;
      // An isolated bright gate reflection must not become a horizontal stripe
      // when a bank sample fills this narrow strip of distant water.
      vec3 water=min(leftWater,rightWater);
      float crest=sin((min(ground.z,250.)-uTime*.22)*4.2);
      water+=vec3(.004,.005,.007)*crest;
      water=mix(water,waterTone(water,ground.z),grade);
      return mix(original,water,footprint);
    }
    // Both sides of the geometry/backdrop join use one stone material and
    // one lighting model. The baked sunset-colored path must not take over.
    // Retain only a soft wash of the original light at the distant mist line.
    vec3 original=texture2D(uLayers,uv).rgb;
    return mix(original,stoneSurface(ground),footprint*smoothstep(.642,.661,uv.y));
  }
  return spatialSurface(uv,thermalSurface(uv,texture2D(uLayers,uv).rgb));
}
vec3 courtyardWater(vec3 world){
  vec2 uv=clamp(projected(uPhoto0,world),.002,.998);
  vec3 original=texture2D(uCourtyard,uv).rgb;
  // The photograph's causeway is wider than the physical walking route.
  // Replace its left-bank footprint with open-water detail, never with a
  // stretched bank sample that would turn a lamp reflection into a diagonal.
  float centre=6.*smoothstep(0.,20.,world.z);
  if(world.x<centre&&uv.y>.63){
    float bank=.685-1.40*(uv.y-.63)-.025;
    float footprint=smoothstep(bank-.018,bank+.004,uv.x)*smoothstep(.63,.66,uv.y);
    vec2 tile=1.-abs(mod(world.xz*vec2(.12,.09),2.)-1.);
    vec3 water=texture2D(uCourtyard,vec2(.32,.675)+tile*vec2(.18,.060)).rgb;
    original=mix(original,water,footprint);
  }
  return original;
}
void main(){
  vec3 col;
  if(uMaterial<.5) {col=photograph(0.,vWorld);if(abs(vNormal.x)>.5)col=texture2D(uStone,vWorld.zy*.24).rgb*vec3(.25,.29,.38);}
  else if(uMaterial<1.5) col=photograph(2.,vWorld);
  else if(uMaterial<2.5){
    col=stoneSurface(vWorld);
    if(vNormal.y<.5)col*=.45;
  } else if(uMaterial<3.5){
    // Water stays below and beside the route. Its texture and reflected light
    // flow slowly inward in world coordinates, independently of camera travel.
    // z grows into the temple. Every crest shares the same +z advection,
    // including its reflection distortion and glints, in every scene.
    float currentZ=vWorld.z-uTime*.22;
    float phase=currentZ*4.2+sin(vWorld.x*.85)*.32;
    float wave=sin(phase)*.72+sin(currentZ*9.1+vWorld.x*.4)*.28;
    float crossWave=sin(currentZ*3.1+vWorld.x*.6);
    vec3 ray=normalize(vWorld-uCamera);ray.y=-ray.y;
    vec3 reflected=vWorld+ray*max(0.,(95.-vWorld.z)/max(ray.z,.01));
    vec2 uv=exteriorUv(reflected);uv.y=min(uv.y+.05,.65);
    uv+=vec2(crossWave*.5,wave)*.0022;
    uv=clamp(uv,.002,.998);col=reflectedArtwork(uv,spatialSurface(uv,thermalSurface(uv,texture2D(uLayers,uv).rgb)));
    float ripple=sin(currentZ*30.+sin(vWorld.x*9.)*.5);
    col*=.97+.03*ripple;
    col=waterTone(col,vWorld.z);
    col=mix(courtyardWater(vWorld+vec3(crossWave*.018,0.,wave*.085)),col,smoothstep(3.,13.,uCamera.z));
    // Travelling light makes the inward current visible even in dark water.
    float glint=pow(.5+.5*sin(phase),7.);
    col+=vec3(.026,.032,.043)*(glint-.23)*(.7+dot(col,vec3(.333)));
    float lights=exp(-abs(vWorld.x-4.1)*4.)+exp(-abs(vWorld.x-7.9)*4.);
    col+=vec3(.20,.10,.055)*lights*(.65+.35*wave)*exp(-abs(vWorld.z-20.)*.1);
    col+=codeCurrent(vWorld,wave,crossWave);
  } else {
    // The same gate is seen from its front, its soffit and then behind it.
    vec2 stoneUv=abs(vNormal.y)>.5?vWorld.xz*.24:abs(vNormal.x)>.5?vWorld.zy*.24:vWorld.xy*.24;
    vec3 stone=texture2D(uStone,stoneUv).rgb;
    float lamp=exp(-vWorld.y*.6);
    col=stone*vec3(.24,.29,.39)+stone*vec3(.62,.30,.15)*lamp;
    if(vNormal.z<-.5)col=mix(col,photograph(0.,vWorld),.90);

  }
  // Join the physical route/water to their photographed continuation at the
  // backdrop. A hard end becomes visible after walking farther into the scene.
  if(uMaterial>1.5&&uMaterial<3.5)col=mix(col,photograph(2.,vWorld),smoothstep(86.,95.,vWorld.z));
  if(uStudy>.5){
    col=uMaterial<.5?vec3(.17,.20,.25):uMaterial<1.5?vec3(.25,.29,.36):uMaterial<2.5?vec3(.42,.45,.49):uMaterial<3.5?vec3(.07,.11,.16):vec3(.31,.34,.38);
    float light=.65+.35*max(dot(normalize(vNormal),normalize(vec3(-.3,.8,-.4))),0.);
    col*=light;
    if(uMaterial>1.5&&uMaterial<2.5)col*=.85+.15*smoothstep(.01,.03,min(fract(vWorld.z/2.15),1.-fract(vWorld.z/2.15)));
  }
  float distance=length(vWorld-uCamera);
  col=mix(col,vec3(.10,.14,.20),smoothstep(26.,100.,distance)*.16);
  gl_FragColor=vec4(col,1.);
}
`;
function geometry(){
  const groups=Array.from({length:5},()=>[]);
  function triangle(id,a,b,c,normal){for(const p of [a,b,c])groups[id].push(...p,...normal);}
  function quad(id,a,b,c,d,normal){triangle(id,a,b,c,normal);triangle(id,a,c,d,normal);}
  function box(id,x0,y0,z0,x1,y1,z1){
    quad(id,[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[0,0,-1]);
    quad(id,[x0,y0,z1],[x0,y1,z1],[x1,y1,z1],[x1,y0,z1],[0,0,1]);
    quad(id,[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1],[-1,0,0]);
    quad(id,[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0],[1,0,0]);
    quad(id,[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],[0,1,0]);
  }
  // A solid causeway. Broad slabs keep their rhythm but have no water gaps.
  for(let z=-5;z<95;z+=.5){const a=pathX(z),b=pathX(z+.5),w=ROUTE.width/2;
    quad(2,[a-w,0,z],[b-w,0,z+.5],[b+w,0,z+.5],[a+w,0,z],[0,1,0]);
    quad(2,[a-w,-.28,z],[b-w,-.28,z+.5],[b-w,0,z+.5],[a-w,0,z],[-1,0,0]);
    quad(2,[a+w,0,z],[b+w,0,z+.5],[b+w,-.28,z+.5],[a+w,-.28,z],[1,0,0]);
  }
  quad(3,[-80,-.18,-8],[-80,-.18,95],[80,-.18,95],[80,-.18,-8],[0,1,0]);
  // Courtyard facade with a genuine arched opening at x=6, z=20.
  const centre=6,radius=1.9,spring=3.,outer=2.55,back=22.;
  quad(0,[-22,0,20],[centre-outer,0,20],[centre-outer,27,20],[-22,27,20],[0,0,-1]);
  quad(0,[centre+outer,0,20],[28,0,20],[28,27,20],[centre+outer,27,20],[0,0,-1]);
  box(4,centre-outer,0,20,centre-radius,spring,back);
  box(4,centre+radius,0,20,centre+outer,spring,back);
  for(let i=0;i<48;i++){
    const a=i*Math.PI/48,b=(i+1)*Math.PI/48;
    const inside=t=>[centre+Math.cos(t)*radius,spring+Math.sin(t)*radius,20];
    const outside=t=>[centre+Math.cos(t)*outer,spring+Math.sin(t)*outer,20];
    const p=inside(a),q=inside(b),o=outside(a),n=outside(b);
    quad(4,p,o,n,q,[0,0,-1]);
    quad(4,p,q,[q[0],q[1],back],[p[0],p[1],back],[-Math.cos((a+b)/2),-Math.sin((a+b)/2),0]);
    quad(4,[o[0],o[1],back],[n[0],n[1],back],[q[0],q[1],back],[p[0],p[1],back],[0,0,1]);
    quad(0,o,[o[0],27,20],[n[0],27,20],n,[0,0,-1]);
  }
  // Near piers contribute real parallax. Their photo projection keeps detail.
  box(0,-7.6,0,8,-6.7,22,9.3);box(0,-3.3,0,9,-2.45,20,10.4);
  box(0,9.5,0,16,10.45,22,17.4);
  // The distant photographed exterior remains behind the physical portal.
  // Its plane is sized from the final camera's field of view.
  const z=95,halfY=90,halfX=halfY*IMAGE_ASPECT;
  quad(1,[6-halfX,1.6+(z-32)*.05-halfY,z],[6+halfX,1.6+(z-32)*.05-halfY,z],[6+halfX,1.6+(z-32)*.05+halfY,z],[6-halfX,1.6+(z-32)*.05+halfY,z],[0,0,-1]);
  return groups.map(data=>new Float32Array(data));
}
export function createWalkRenderer(canvas,images,{study=false,artwork=null}={}){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:true,powerPreference:'low-power'});
  if(!gl)return null;
  const shaders=[],textures=[],buffers=[];let program;
  function release(){shaders.forEach(x=>gl.deleteShader(x));textures.forEach(x=>gl.deleteTexture(x));buffers.forEach(x=>gl.deleteBuffer(x));gl.deleteProgram(program);}
  try{
    program=gl.createProgram();
    [vertex,fragment].forEach((source,i)=>{const shader=gl.createShader(i?gl.FRAGMENT_SHADER:gl.VERTEX_SHADER);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);});
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const blank=document.createElement('canvas');blank.width=2;blank.height=2;
    [...images,createCodeTexture(),artwork||blank].forEach((image,i)=>{const texture=gl.createTexture();textures.push(texture);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);const wrap=(i===3||i===4)&&!(image.width&(image.width-1))&&!(image.height&(image.height-1))?gl.REPEAT:gl.CLAMP_TO_EDGE;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,wrap);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,wrap);if(wrap===gl.REPEAT){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);}});
    const locations=Object.fromEntries(['View','Photo0','Photo1','Photo2','PanelInverse','Courtyard','Gate','Layers','Stone','Material','Time','Camera','Study','TempTop','TempBottom','TempKnown','AuroraTime','WindSpeed','Code','Artwork','Flowgen','CodePhase','Experience','Cursor'].map(name=>[name,gl.getUniformLocation(program,'u'+name)]));
    ['Courtyard','Gate','Layers','Stone','Code','Artwork'].forEach((name,i)=>gl.uniform1i(locations[name],i));
    anchors.forEach((camera,i)=>gl.uniformMatrix4fv(locations['Photo'+i],false,matrix(camera,IMAGE_ASPECT)));
    gl.uniformMatrix3fv(locations.PanelInverse,false,fragmentsInverse);
    gl.uniform1f(locations.Study,study?1:0);
    const position=gl.getAttribLocation(program,'aPosition'),normal=gl.getAttribLocation(program,'aNormal');
    const meshes=geometry().map(data=>{const buffer=gl.createBuffer();buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return {buffer,count:data.length/6};});
    gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(.035,.05,.08,1);
    return {release,updateArtwork(){if(!artwork)return;gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,textures[5]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,artwork);},draw({progress,time,auroraTime=0,width,height,x=0,y=0,temperature=null,flowgen=0,experience=0}){
      const camera=walkCamera(progress,width/height);camera.yaw+=x*.003;camera.pitch+=y*.0015;
      gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
      gl.uniformMatrix4fv(locations.View,false,matrix(camera,width/height));gl.uniform3f(locations.Camera,camera.x,camera.y,camera.z);gl.uniform1f(locations.Time,time);gl.uniform1f(locations.Flowgen,flowgen);gl.uniform1f(locations.CodePhase,codeTravel(time));
      gl.uniform1f(locations.Experience,experience);gl.uniform2f(locations.Cursor,x,y);
      gl.uniform3fv(locations.TempTop,temperature?.top||[0,0,0]);gl.uniform3fv(locations.TempBottom,temperature?.bottom||[0,0,0]);gl.uniform1f(locations.TempKnown,temperature?.known||0);gl.uniform1f(locations.AuroraTime,auroraTime);gl.uniform1f(locations.WindSpeed,temperature?.windSpeed||0);
      meshes.forEach(({buffer,count},i)=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.enableVertexAttribArray(normal);gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,24,12);gl.uniform1f(locations.Material,i);gl.drawArrays(gl.TRIANGLES,0,count);});
      canvas.dataset.codePhase=codeTravel(time).toFixed(4);canvas.dataset.flowgen=flowgen.toFixed(4);
      canvas.dataset.experience=experience.toFixed(4);canvas.dataset.waterTime=time.toFixed(4);
      canvas.dataset.thermal=String(temperature?.known||0);canvas.dataset.auroraPhase=auroraTime.toFixed(4);canvas.dataset.windSpeed=(temperature?.windSpeed||0).toFixed(3);
      const inscription=projectInscription(camera,width,height);
      canvas.dataset.camera=`${camera.x.toFixed(3)},${camera.y.toFixed(3)},${camera.z.toFixed(3)}`;
      return {inscription,app:projectFragments(camera,width,height)};
    }};
  }catch(error){release();console.warn('MeltLight walking scene fallback:',error);return null;}
}
