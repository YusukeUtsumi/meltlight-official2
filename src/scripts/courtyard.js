import {mountFragments} from './flowgen/fragments.js';
import {surfaceTransform} from './flowgen/projection.js';
// Continuous physical travel through a shared stone causeway and portal.
import {createWalkRenderer,GATE_EXIT_PROGRESS,walkCamera,projectFragments} from "./courtyard-walk.js";
import {ambientTime} from './ambient-clock.js';
// Scroll remains native; only water and a local typographic ripple use time.
export const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
export const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
// Halve the scroll distance from the physical exit to each statement's reveal.
const statementStarts=[.765,.805,.845,.885].map(start=>GATE_EXIT_PROGRESS+(start-GATE_EXIT_PROGRESS)*.5);

export function journeyState(progress) {
  const first = smooth(.11, .49, progress);
  const second = smooth(.53, .75, progress);
  return {
    segment: progress < .51 ? 0 : 1,
    blend: progress < .51 ? smooth(.41, .49, progress) : smooth(.54, statementStarts[0], progress),
    alignment: smooth(.11, .34, progress),
    first, second,
    atmosReveal: smooth(1.16,1.25,progress)*(1-smooth(1.37,1.47,progress)),
    flowgenReveal:smooth(1.43,1.55,progress)*(1-smooth(2.18,2.42,progress)),
    appReveal:smooth(1.43,1.55,progress)*(1-smooth(2.23,2.44,progress)),
    flowgenCopy:smooth(1.43,1.55,progress)*(1-smooth(1.78,1.94,progress)),
    appFocus:smooth(1.76,2.08,progress),
    experienceReveal:smooth(2.46,2.62,progress)*(1-smooth(3.34,3.52,progress)),
    aboutReveal:smooth(3.55,3.79,progress)*(1-smooth(4.08,4.23,progress)),
    aboutIdentity:smooth(3.62,3.82,progress)*(1-smooth(4.08,4.23,progress)),
    contactDarkness:smooth(4.16,4.46,progress),
    contactReveal:smooth(4.51,4.68,progress),
    contactDetails:smooth(4.58,4.75,progress),
    experienceDetails:smooth(2.90,3.02,progress),
    experienceBody:1-smooth(2.78,2.88,progress),
    scopeFirst:1-smooth(3.10,3.17,progress),
    scopeSecond:smooth(3.17,3.24,progress),
    heroOpacity: 1 - smooth(.16, .34, progress),
    heroMist: smooth(.105, .34, progress),
    lines: statementStarts.map(start => smooth(start, start + .04, progress)),
  };
}

export function mountCourtyard() {
  const root=document.documentElement, threshold=document.querySelector('.threshold'), stage=document.querySelector('.threshold-stage');
  if (!threshold || !stage) return;
  const canvas=document.querySelector('.courtyard-canvas'), fallback=document.querySelector('.courtyard-fallback');
  const type=document.querySelector('.hero-type'), headline=document.querySelector('#hero-question'), philosophy=document.querySelector('.courtyard-philosophy');
  const lines=[...document.querySelectorAll('.translation-lines p'),document.querySelector('.philosophy-conclusion')];
  const lineReveals=lines.map(()=>0);
  const works=document.querySelector('.courtyard-works'),atmos=document.querySelector('.courtyard-atmos'),plaque=document.querySelector('.atmos-plaque');
  const fragments=mountFragments(),flowgen=document.querySelector('.courtyard-flowgen');
  const experiences=document.querySelector('.courtyard-experiences'),experienceBody=experiences.querySelector('.commission-body');
  const experienceScope=experiences.querySelector('.commission-scope');
  const experienceItems=[...experienceScope.children];
  const about=document.querySelector('.courtyard-about'),aboutIdentity=about.querySelector('.about-identity');
  const contact=document.querySelector('.courtyard-contact'),contactBottom=contact.querySelector('.contact-bottom');
  let artworkDirty=true;
  const temperature={top:[0,0,0],bottom:[0,0,0],known:0,windSpeed:0};let weatherTarget=null;
  const invitation=document.querySelector('.threshold-invitation'), motion=document.querySelector('.motion-toggle');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'), fine=matchMedia('(hover: hover) and (pointer: fine)');
  const clone=headline.cloneNode(true); clone.removeAttribute('id'); clone.setAttribute('aria-hidden','true'); clone.classList.add('hero-ripple'); type.append(clone);
  const noiseOffset=document.querySelector('#copy-water feOffset');
  const mistOffset=document.querySelector('#copy-mist feOffset'), mistMask=document.querySelector('#copy-mist feColorMatrix');
  const mistScatter=document.querySelector('#copy-mist feDisplacementMap'), mistBlur=document.querySelector('#copy-mist feGaussianBlur');
  let previousMist=-1;
  let disposed=false, renderer=null, images=null, lost=false, frame=0, layoutDirty=true;
  let width=0,height=0,top=0,travel=1,typeBounds=null,hovered=false;
  let time=0,auroraTime=0,lastTime=0,lastPaint=0,px=0,py=0,sx=0,sy=0;
  let paused=reduced.matches;
  root.classList.add('journey-enhanced');
  function setMotion() {
    root.classList.toggle('reduced-motion',reduced.matches);
    for(const [id,node] of [['works',works],['atmos',atmos],['flowgen',flowgen],['fragments',fragments.root],['commissions',experiences],['about',about],['contact',contact]]){
      node.id=reduced.matches?id:id+'-scene';document.querySelector(`[data-journey-anchor="${id}"]`).id=reduced.matches?'':id;
    }
    root.dataset.motion=paused?'paused':'running';
    motion.hidden=reduced.matches;
    motion.setAttribute('aria-pressed',String(paused));
    motion.setAttribute('aria-label',paused?'Resume ambient animation':'Pause ambient animation');
    motion.querySelector('.motion-label').textContent=paused?'Resume animation':'Pause animation';
    motion.querySelector('.motion-icon').textContent=paused?'▷':'Ⅱ';
    window.dispatchEvent(new CustomEvent('meltlight:motion',{detail:{paused}}));
  }
  setMotion();
  const schedule=()=>{if(!frame&&!disposed&&!document.hidden)frame=requestAnimationFrame(render);};
  function layout() {
    const rect=stage.getBoundingClientRect(); width=rect.width;height=rect.height;
    const bounds=threshold.getBoundingClientRect();top=bounds.top+window.scrollY;travel=Math.max(1,height*(width<=600?5.1:5.6));
    const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt((width<600?550000:1200000)/(Math.max(1,width*height))));
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    typeBounds=type.getBoundingClientRect();layoutDirty=false;
  }
  function updateCopy(state,progress,dt) {
    threshold.style.setProperty('--travel',clamp(progress/(threshold.offsetHeight/height-1)*(width<=600?5.1:5.6)).toFixed(4));
    const philoOpacity=1-smooth(.94,1.02,progress),worksOpacity=smooth(.98,1.07,progress)*(1-smooth(1.12,1.20,progress)),atmosOpacity=state.atmosReveal;
    threshold.style.setProperty('--philosophy-opacity',philoOpacity.toFixed(4));
    threshold.style.setProperty('--works-opacity',worksOpacity.toFixed(4));threshold.style.setProperty('--works-blur',((1-worksOpacity)*10).toFixed(2)+'px');
    threshold.style.setProperty('--atmos-opacity',atmosOpacity.toFixed(4));threshold.style.setProperty('--atmos-blur',((1-atmosOpacity)*10).toFixed(2)+'px');
    works.inert=!reduced.matches&&worksOpacity<.95;atmos.inert=!reduced.matches&&atmosOpacity<.95;philosophy.inert=!reduced.matches&&(philoOpacity<.05||state.lines[0]===0);
    atmos.classList.toggle('is-readable',atmosOpacity>.95||reduced.matches);
    threshold.style.setProperty('--flowgen-opacity',state.flowgenCopy.toFixed(4));threshold.style.setProperty('--flowgen-blur',((1-state.flowgenCopy)*8).toFixed(2)+'px');
    flowgen.inert=!reduced.matches&&state.flowgenCopy<.9;flowgen.classList.toggle('is-readable',state.flowgenCopy>.9||reduced.matches);
    fragments.root.inert=!reduced.matches&&state.appReveal<.9;
    fragments.root.classList.toggle('is-visible',state.appReveal>.9||reduced.matches);
    fragments.root.classList.toggle('is-editing',state.appFocus>.92||reduced.matches);
    threshold.style.setProperty('--fragments-opacity',state.appReveal.toFixed(4));
    experiences.inert=!reduced.matches&&state.experienceReveal<.9;
    experiences.classList.toggle('is-readable',state.experienceReveal>.9||reduced.matches);
    experienceBody.inert=!reduced.matches&&state.experienceBody<.05;
    experienceScope.inert=!reduced.matches&&state.experienceDetails<.05;
    experienceItems.forEach((item,i)=>{item.inert=!reduced.matches&&width<=600&&(i<2?state.scopeFirst:state.scopeSecond)<.05;});
    threshold.style.setProperty('--experience-opacity',state.experienceReveal.toFixed(4));
    threshold.style.setProperty('--experience-blur',((1-state.experienceReveal)*12).toFixed(2)+'px');
    threshold.style.setProperty('--experience-body',state.experienceBody.toFixed(4));
    threshold.style.setProperty('--experience-body-blur',((1-state.experienceBody)*8).toFixed(2)+'px');
    threshold.style.setProperty('--experience-details',state.experienceDetails.toFixed(4));
    threshold.style.setProperty('--experience-details-blur',((1-state.experienceDetails)*8).toFixed(2)+'px');
    threshold.style.setProperty('--scope-first',state.scopeFirst.toFixed(4));
    threshold.style.setProperty('--scope-second',state.scopeSecond.toFixed(4));
    about.inert=!reduced.matches&&state.aboutReveal<.9;
    aboutIdentity.inert=!reduced.matches&&state.aboutIdentity<.9;
    threshold.style.setProperty('--about-opacity',state.aboutReveal.toFixed(4));
    threshold.style.setProperty('--about-blur',((1-state.aboutReveal)*12).toFixed(2)+'px');
    threshold.style.setProperty('--about-identity',state.aboutIdentity.toFixed(4));
    threshold.style.setProperty('--about-identity-blur',((1-state.aboutIdentity)*8).toFixed(2)+'px');
    contact.inert=!reduced.matches&&state.contactReveal<.9;
    contactBottom.inert=!reduced.matches&&state.contactDetails<.9;
    contact.classList.toggle('is-readable',state.contactReveal>.9||reduced.matches);
    contact.classList.toggle('is-emerging',state.contactReveal>.005||reduced.matches);
    threshold.style.setProperty('--contact-darkness',state.contactDarkness.toFixed(4));
    threshold.style.setProperty('--contact-opacity',state.contactReveal.toFixed(4));
    threshold.style.setProperty('--contact-details',state.contactDetails.toFixed(4));
    root.classList.toggle('in-contact',state.contactDarkness===1);
    plaque.inert=!reduced.matches&&atmosOpacity<.05;
    threshold.style.setProperty('--plaque-blur',((1-atmosOpacity)*7).toFixed(2)+'px');
    threshold.style.setProperty('--hero-opacity',state.heroOpacity.toFixed(4));
    const mist=reduced.matches?0:state.heroMist;
    // Deterministic scroll erosion: reversing the scroll restores the same glyphs.
    // Keep SVG filter updates off the ambient-water animation's hot path.
    if(Math.abs(mist-previousMist)>.0005 || mist===0&&previousMist!==0 || mist===1&&previousMist!==1) {
      type.classList.toggle('is-dissolving',mist>0&&mist<1);
      threshold.style.setProperty('--hero-mist-y',(-mist*16).toFixed(2)+'px');
      mistOffset.setAttribute('dx',(mist*34).toFixed(2));mistOffset.setAttribute('dy',(-mist*18).toFixed(2));
      mistMask.setAttribute('values',`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  4 0 0 0 ${(1-mist*5).toFixed(4)}`);
      mistScatter.setAttribute('scale',(Math.pow(mist,1.35)*46).toFixed(2));
      mistBlur.setAttribute('stdDeviation',(Math.pow(mist,1.5)*(width<600?7:11)).toFixed(2));
      previousMist=mist;
    }
    threshold.style.setProperty('--fallback-zoom',(1).toFixed(4));
    threshold.style.setProperty('--gate-opacity',(state.segment===0?state.blend:1).toFixed(4));
    threshold.style.setProperty('--layers-opacity',(state.segment===1?state.blend:0).toFixed(4));
    threshold.style.setProperty('--scroll-opacity',(1-smooth(.93,1,progress)).toFixed(4));
    lines.forEach((line,i)=>{
      const target=state.lines[i],previous=lineReveals[i];
      // Let type quietly condense in place over ~4 seconds; reverse scrolling
      // clears it promptly rather than leaving text floating in the doorway.
      const p=paused||reduced.matches?target:previous+(target-previous)*(1-Math.exp(-dt/(target>previous?1.25:.15)));
      lineReveals[i]=p;
      line.style.setProperty('--line-opacity',p.toFixed(4));
      line.style.setProperty('--line-blur',(Math.pow(1-p,1.8)*10).toFixed(2)+'px');
      line.style.setProperty('--line-bloom',((1-p)*16).toFixed(2)+'px');
    });
    philosophy.classList.toggle('is-readable',progress>statementStarts[0]||reduced.matches);
    root.classList.toggle('past-courtyard',window.scrollY>top+threshold.offsetHeight-height*.3);
    threshold.dataset.scene=progress<.31?'courtyard':progress<GATE_EXIT_PROGRESS?'gate':progress<1.16?'layers':progress<1.43?'atmos':progress<2.44?'flowgen':progress<3.55?'experiences':progress<4.16?'about':progress<4.51?'darkness':'contact';
    threshold.dataset.progress=progress.toFixed(4);
  }
  function render(now) {
    frame=0;if(disposed||document.hidden)return;
    if(layoutDirty)layout();
    const progress=reduced.matches?0:Math.max(0,(window.scrollY-top)/travel), state=journeyState(progress);
    const dt=lastTime?Math.min((now-lastTime)/1000,.07):0;lastTime=now;
    updateCopy(state,progress,dt);
    if(weatherTarget){
      const k=paused||reduced.matches?1:1-Math.exp(-dt/1.2);
      temperature.known+=(1-temperature.known)*k;
      temperature.windSpeed+=(weatherTarget.windSpeed-temperature.windSpeed)*k;
      for(const name of ['top','bottom'])temperature[name]=temperature[name].map((n,i)=>n+(weatherTarget[name][i]-n)*k);
    }
    const visible=stage.getBoundingClientRect().bottom>0&&threshold.getBoundingClientRect().top<innerHeight;
    time=ambientTime(now,!paused&&visible&&!reduced.matches&&state.contactDarkness<1);
    // Integrate phase rather than multiplying time by changing wind readings,
    // so a new observation cannot snap the luminous folds to another position.
    if(!paused&&visible&&!reduced.matches)auroraTime+=dt*(.20+Math.min(temperature.windSpeed,15)*.025);
    sx+=(px-sx)*(1-Math.exp(-dt*7));sy+=(py-sy)*(1-Math.exp(-dt*7));
    const ripple=hovered&&!paused&&!reduced.matches&&fine.matches&&state.heroOpacity>.8;
    type.classList.toggle('is-rippling',ripple);
    if(ripple) {
      typeBounds=type.getBoundingClientRect();
      type.style.setProperty('--ripple-x',(sx-typeBounds.left).toFixed(1)+'px');type.style.setProperty('--ripple-y',(sy-typeBounds.top).toFixed(1)+'px');
      noiseOffset.setAttribute('dx',(Math.sin(time*.33)*15).toFixed(2));noiseOffset.setAttribute('dy',(time*.7%50).toFixed(2));
    }
    if(renderer&&!lost&&visible&&!reduced.matches&&state.contactDarkness<1&&(paused||now-lastPaint>=(width<600?33:25))) {
      if(artworkDirty){renderer.updateArtwork();artworkDirty=false;}
      const projected=renderer.draw({progress,time,auroraTime,width,height,flowgen:state.flowgenReveal,experience:state.experienceReveal,temperature:{...temperature,known:temperature.known*state.atmosReveal},x:fine.matches&&!paused?(sx/width-.5)*2:0,y:fine.matches&&!paused?(sy/height-.5)*2:0});
      const inscription=projected.inscription;
      placeFragments(projected.app);
      plaque.style.left=inscription.left.toFixed(2)+'px';plaque.style.top=inscription.top.toFixed(2)+'px';plaque.style.width=Math.max(1,inscription.width).toFixed(2)+'px';plaque.style.height=Math.max(1,inscription.height).toFixed(2)+'px';
      const onScreen=inscription.left+inscription.width>0&&inscription.left<width&&inscription.width>55;
      threshold.style.setProperty('--plaque-opacity',(onScreen?state.atmosReveal:0).toFixed(4));lastPaint=now;
    }
    if(!renderer&&!reduced.matches){const camera=walkCamera(progress,width/height);placeFragments(projectFragments(camera,width,height));}
    if(!paused&&visible&&!reduced.matches&&state.contactDarkness<1)schedule();
  }
  function placeFragments(points){
    const appWidth=width<=600?340:640,appHeight=width<=600?306:374;
    fragments.root.style.transform=surfaceTransform(appWidth,appHeight,points);
  }
  async function loadImages() {
    try {
      await fallback.decode();
      const small=innerWidth<=600;
      images=await Promise.all(['courtyard','gate','layers','stone'].map(async name=>{const im=new Image();im.src=`/images/walk/${name}${small&&name!=='stone'?'-small':''}.webp`;await im.decode();return im;}));
      if(disposed)return;
      renderer=createWalkRenderer(canvas,images,{artwork:fragments.canvas});
      if(renderer)root.classList.add('courtyard-live');
      else staticFallback();
      layoutDirty=true;schedule();
    } catch(error) { if(!disposed){console.warn('MeltLight scene images unavailable:',error);staticFallback();} }
  }
  function staticFallback() {
    // Keep the sticky section's height and scroll position if WebGL is absent.
    root.classList.remove('courtyard-live');
    layoutDirty=true;schedule();
  }
  const onArtwork=()=>{artworkDirty=true;schedule();};
  const onDemo=e=>{const link=e.target.closest('a[href="#fragments"]');if(!link||reduced.matches)return;e.preventDefault();document.querySelector('[data-journey-anchor="fragments"]').scrollIntoView({behavior:'smooth'});history.replaceState(null,'','#fragments');};
  const onWeather=e=>{weatherTarget={top:e.detail.colors.top.map(n=>n/255),bottom:e.detail.colors.bot.map(n=>n/255),windSpeed:Number.isFinite(e.detail.observation.windSpeed)?Math.max(0,e.detail.observation.windSpeed):0};schedule();};
  const onScroll=()=>schedule();
  const onResize=()=>{layoutDirty=true;schedule();};
  const onPointer=e=>{
    if(e.pointerType==='touch')return;
    px=e.clientX;py=e.clientY;hovered=Boolean(e.target.closest('.hero-type'));schedule();
  };
  const onLeave=()=>{hovered=false;type.classList.remove('is-rippling');};
  const onMotion=()=>{paused=!paused;lastTime=0;setMotion();schedule();};
  const onPreference=()=>{paused=reduced.matches;hovered=false;lastTime=0;setMotion();layoutDirty=true;schedule();};
  const onVisibility=()=>{lastTime=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();};
  const onInvitation=e=>{if(!reduced.matches&&root.classList.contains('journey-enhanced')){e.preventDefault();window.scrollTo({top:top+travel*.80,behavior:'smooth'});}};
  const onLost=e=>{e.preventDefault();lost=true;root.classList.remove('courtyard-live');};
  const onRestored=()=>{renderer?.release();renderer=createWalkRenderer(canvas,images,{artwork:fragments.canvas});lost=false;if(renderer)root.classList.add('courtyard-live');else staticFallback();schedule();};
  window.addEventListener('meltlight:artwork',onArtwork);document.addEventListener('click',onDemo);
  window.addEventListener('meltlight:weather',onWeather);
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onResize,{passive:true});
  window.addEventListener('pointermove',onPointer,{passive:true});root.addEventListener('pointerleave',onLeave);
  reduced.addEventListener('change',onPreference);motion.addEventListener('click',onMotion);invitation.addEventListener('click',onInvitation);
  document.addEventListener('visibilitychange',onVisibility);canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
  const observer=new ResizeObserver(onResize);observer.observe(stage);document.fonts.ready.then(()=>{if(!disposed){onResize();}});
  const onReady=()=>{document.fonts.ready.then(()=>{if(disposed)return;requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!disposed&&['#works','#atmos','#flowgen','#fragments','#commissions','#about','#contact'].includes(location.hash))document.querySelector(location.hash)?.scrollIntoView({behavior:'instant'});
  }));});};
  if(document.readyState==='complete')onReady();else window.addEventListener('load',onReady,{once:true});
  function dispose() {
    disposed=true;fragments.dispose();window.removeEventListener('meltlight:artwork',onArtwork);document.removeEventListener('click',onDemo);window.removeEventListener('load',onReady);cancelAnimationFrame(frame);observer.disconnect();renderer?.release();clone.remove();
    root.classList.remove('courtyard-live','journey-enhanced','past-courtyard','in-contact');
    window.removeEventListener('meltlight:weather',onWeather);
    window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onResize);window.removeEventListener('pointermove',onPointer);root.removeEventListener('pointerleave',onLeave);
    reduced.removeEventListener('change',onPreference);motion.removeEventListener('click',onMotion);invitation.removeEventListener('click',onInvitation);document.removeEventListener('visibilitychange',onVisibility);
    canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);document.removeEventListener('astro:before-swap',dispose);
  }
  document.addEventListener('astro:before-swap',dispose,{once:true});if(import.meta.hot)import.meta.hot.dispose(dispose);
  schedule();loadImages();
}
