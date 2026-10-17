// A real browser-local composition editor. The same canvas is exported and
// reflected in the water; UI edits never request an external generation API.
export const FRAGMENTS=['Archway','Misty water','Wet stone','Quiet coast','Mountain layers','Pale water','Mineral','Distant gate'];
export const initialComposition=()=>({fragment:0,words:'Between forms',layout:'open',space:60,light:75});
export function fitFragment(image,index){
  const size=image.width/2;return {x:index%2*size,y:Math.floor(index/2)*image.height/4,width:size,height:image.height/4};
}
export function compositionLines(words){
  const clean=words.trim().replace(/\s+/g,' ').slice(0,48);if(!clean)return [];
  const pieces=clean.split(' ');if(pieces.length===1)return [clean];
  let split=1,best=Infinity;
  for(let i=1;i<pieces.length;i++){const delta=Math.abs(pieces.slice(0,i).join(' ').length-pieces.slice(i).join(' ').length);if(delta<best){split=i;best=delta;}}
  return [pieces.slice(0,split).join(' '),pieces.slice(split).join(' ')];
}
export function renderArtwork(canvas,image,state){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.fillStyle='#0a1019';ctx.fillRect(0,0,w,h);
  if(image){
    const source=fitFragment(image,state.fragment),crop=source.height*w/h;
    ctx.drawImage(image,source.x+(source.width-crop)/2,source.y,crop,source.height,0,0,w,h);
    if(state.layout==='layered'){
      ctx.save();ctx.globalAlpha=.32;ctx.drawImage(image,source.x,source.y,source.width,source.height,w*.50,h*.15,w*.39,h*.58);ctx.restore();
      ctx.strokeStyle='#e8e1d54d';ctx.lineWidth=1;ctx.strokeRect(w*.50,h*.15,w*.39,h*.58);
    }
  }
  ctx.fillStyle=`rgba(3,9,17,${.58-state.light/100*.48})`;ctx.fillRect(0,0,w,h);
  const shade=ctx.createLinearGradient(0,h*.46,0,h);shade.addColorStop(0,'#080c1400');shade.addColorStop(1,'#080c146e');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  const lines=compositionLines(state.words),quiet=state.layout==='quiet';
  const x=quiet?w*.50:w*.105,y=h*(.45+state.space/100*.35);
  const lineWidth=i=>quiet?w*.76:w*(i?.67:.79);
  let fontSize=w*(quiet?.10:.145);
  do{if(lines.every((line,i)=>{ctx.font=`${i?'italic ':''}400 ${fontSize}px Cormorant, Georgia, serif`;return ctx.measureText(line).width<lineWidth(i);}))break;fontSize-=2;}while(fontSize>24);
  ctx.fillStyle='#e8e1d5';ctx.textAlign=quiet?'center':'left';ctx.textBaseline='alphabetic';
  ctx.shadowColor='#080c14a0';ctx.shadowBlur=10;
  lines.forEach((line,i)=>{ctx.font=`${i?'italic ':''}400 ${fontSize}px Cormorant, Georgia, serif`;ctx.fillText(line,x+(i&&!quiet?w*.12:0),y+i*fontSize*.95,lineWidth(i));});
  ctx.shadowBlur=0;ctx.font=`400 ${w*.015}px Manrope, sans-serif`;ctx.textAlign='center';ctx.fillStyle='#e8e1d5c7';ctx.fillText('M E L T L I G H T  /  S T U D Y',w*.5,h*.963);
}
export function mountFragments(){
  const root=document.querySelector('[data-fragments]');if(!root)return null;
  const canvas=root.querySelector('.fragments-artwork'),mini=root.querySelector('.fragments-miniature'),form=root.querySelector('form'),status=root.querySelector('[data-fragments-status]');
  let state=initialComposition(),image=null,disposed=false,revision=0;
  function paint(){
    renderArtwork(canvas,image,state);mini.getContext('2d').drawImage(canvas,0,0);
    canvas.setAttribute('aria-label',`${state.words||'Untitled'} — ${FRAGMENTS[state.fragment]} composition`);
    root.querySelectorAll('[data-fragment]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.fragment)===state.fragment)));
    root.dataset.fragment=String(state.fragment);root.dataset.revision=String(++revision);
    window.dispatchEvent(new CustomEvent('meltlight:artwork'));
  }
  const onInput=()=>{state.words=form.elements.words.value;state.layout=form.elements.layout.value;state.space=Number(form.elements.space.value);state.light=Number(form.elements.light.value);paint();};
  const onClick=e=>{
    const tile=e.target.closest('button[data-fragment]');
    if(tile){state.fragment=Number(tile.dataset.fragment);paint();return;}
    if(e.target.closest('[data-reset]')){state=initialComposition();form.reset();status.textContent='Composition reset.';paint();return;}
    if(e.target.closest('[data-save]')){
      canvas.toBlob(blob=>{if(!blob||disposed){status.textContent='Unable to save. Please try again.';return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='meltlight-fragments.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Image saved.';},'image/png');
    }
  };
  form.addEventListener('input',onInput);root.addEventListener('click',onClick);
  const atlas=new Image();atlas.src='/images/fragments/atlas.webp';atlas.decode().then(()=>{if(!disposed){image=atlas;paint();}}).catch(()=>{status.textContent='Images unavailable. You can still edit and save the composition.';});
  document.fonts.ready.then(()=>{if(!disposed)paint();});paint();
  return {canvas,root,dispose(){disposed=true;form.removeEventListener('input',onInput);root.removeEventListener('click',onClick);}};
}
