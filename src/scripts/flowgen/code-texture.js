// Eight prepared source patterns are baked once into a repeating atlas. The
// shader advects one seamless world-space texture, never resetting a timer.
export const CODE_PATTERNS=[
 ['export function compose(fragment, words) {','  return renderArtwork(fragment, words);','}'],
 ['const fragment = selectFragment();','const composition = { ...state, fragment };','renderArtwork(canvas, atlas, composition);'],
 ['function compositionLines(words) {','  const pieces = words.trim().split(" ");','  return balanceLines(pieces);','}'],
 ['const image = await loadFragments();','const { width, height } = image;','drawFragment(image, state.fragment);'],
 ['form.addEventListener("input", () => {','  state.words = form.elements.words.value;','  renderArtwork(canvas, image, state);','});'],
 ['const layout = state.layout;','const space = state.space / 100;','const light = state.light / 100;'],
 ['canvas.toBlob(blob => {','  saveImage(blob, "fragments.png");','}, "image/png");'],
 ['test("composition retains your words", () => {','  expect(rendered.words).toBe(input.words);','});','export { renderArtwork, compositionLines };'],
];
export const CODE_PERIOD=48,CODE_SPEED=.92;
export const codeTravel=time=>(time*CODE_SPEED)%CODE_PERIOD;
export function createCodeTexture(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=2048;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,2048);ctx.font='400 24px ui-monospace, Menlo, monospace';ctx.textBaseline='top';
  CODE_PATTERNS.forEach((lines,i)=>{
    const x=28+(i%3)*38,y=i*256+24;
    lines.forEach((line,j)=>{ctx.fillStyle=j===0?'#e8c2a1':j%2?'#b9d9ef':'#e8e1d5';ctx.fillText(line,x,y+j*43);});
  });
  return canvas;
}
