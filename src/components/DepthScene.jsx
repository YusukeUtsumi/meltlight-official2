import { useEffect, useRef } from "react";

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mix = (a, b, amount) => Math.round(a + (b - a) * amount);

const chamberColors = [
    [[58, 232, 255], [121, 75, 255], [255, 179, 71]],
    [[255, 63, 172], [47, 221, 255], [255, 125, 50]],
    [[112, 255, 205], [129, 90, 255], [255, 202, 76]],
];

export default function DepthScene() {
    const sceneRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const scene = sceneRef.current;
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!scene || !canvas || !context) return undefined;

        const documentRoot = document.documentElement;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const mobileViewport = window.matchMedia("(max-width: 700px)");
        let width = 1;
        let height = 1;
        let ratio = 1;
        let descent = 0;
        let travel = 0;
        let activeChamber = -1;
        let chamberFocus = 0;
        let frame = 0;
        let ticking = false;
        let lastPaint = -Infinity;
        let lastScrollY = window.scrollY;
        let scrollDirection = 0;
        let gestureDistance = 0;
        let settledIndex = 0;
        let settleTimer = 0;
        let snapTarget = null;
        let snapFrame = 0;

        const journeyFrames = () => Array.from(document.querySelectorAll(".journey-frame, #footer"));
        // offsetTop is relative to the offset parent (Works for product panels).
        // All navigation targets must share document coordinates.
        const framePosition = (panel) => Math.min(
            panel.getBoundingClientRect().top + window.scrollY,
            Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
        );

        const nearestFrameIndex = (position = window.scrollY) => {
            const frames = journeyFrames();
            if (!frames.length) return 0;
            let nearest = 0;
            let distance = Infinity;
            frames.forEach((panel, index) => {
                const nextDistance = Math.abs(framePosition(panel) - position);
                if (nextDistance < distance) {
                    distance = nextDistance;
                    nearest = index;
                }
            });
            return nearest;
        };

        const drawFog = (time, darkness) => {
            const fogCount = mobileViewport.matches ? 7 : 11;
            for (let index = 0; index < fogCount; index += 1) {
                const seed = index * 1.713;
                const drift = reducedMotion.matches ? 0 : time * (0.000018 + index * 0.0000015);
                const x = width * (0.08 + ((index * 0.193) % 0.94)) + Math.sin(drift * 17 + seed) * width * 0.11;
                const y = height * (((index * 0.277) % 1.1) - 0.04) + Math.cos(drift * 13 + seed) * height * 0.09;
                const radius = Math.max(width, height) * (0.28 + (index % 4) * 0.08);
                const opacity = (0.12 + (index % 3) * 0.035) * (1 - darkness * 0.62);
                drawLightField(x, y, radius, [224, 232, 233], opacity);
            }
        };

        const drawEchoes = (time, amount) => {
            if (amount < 0.08) return;
            const centerX = width * (mobileViewport.matches ? 0.55 : 0.54);
            const centerY = height * 0.49;
            const rings = mobileViewport.matches ? 5 : 7;
            context.save();
            context.globalCompositeOperation = "screen";
            for (let ring = 0; ring < rings; ring += 1) {
                const radiusX = width * (0.09 + ring * 0.075 + amount * 0.04);
                const radiusY = height * (0.14 + ring * 0.095 + amount * 0.03);
                context.beginPath();
                for (let point = 0; point <= 72; point += 1) {
                    const angle = (point / 72) * Math.PI * 2;
                    const motion = reducedMotion.matches ? 0 : time * 0.00015;
                    const distortion = 1 + Math.sin(angle * 3 + ring * 0.83 + motion) * 0.045 + Math.sin(angle * 7 - motion * 1.4 + ring) * 0.018;
                    const x = centerX + Math.cos(angle) * radiusX * distortion + Math.sin(angle * 2 + ring) * width * 0.008;
                    const y = centerY + Math.sin(angle) * radiusY * distortion;
                    if (point === 0) context.moveTo(x, y);
                    else context.lineTo(x, y);
                }
                context.closePath();
                context.strokeStyle = "rgba(190,205,216," + (0.035 + amount * 0.055 - ring * 0.003) + ")";
                context.lineWidth = ring === 0 ? 1.1 : 0.65;
                context.stroke();
            }
            context.restore();
        };

        const drawAmbientCurrent = (time, darkness) => {
            const motion = reducedMotion.matches ? 0 : time * .000055;
            const opacity = .025 + darkness * .035;
            context.save();
            context.globalCompositeOperation = "screen";
            context.translate(width * .5, height * .5);
            context.rotate(Math.sin(motion) * .14);
            for (let current = 0; current < 4; current += 1) {
                const y = (current - 1.5) * height * .23 + Math.sin(motion * (1.2 + current * .08) + current) * height * .08;
                const gradient = context.createLinearGradient(-width * .65, y, width * .65, y);
                gradient.addColorStop(0, "rgba(160,196,210,0)");
                gradient.addColorStop(.35, "rgba(190,220,228," + opacity + ")");
                gradient.addColorStop(.7, "rgba(126,159,181," + opacity * .58 + ")");
                gradient.addColorStop(1, "rgba(126,159,181,0)");
                context.beginPath();
                context.moveTo(-width * .7, y);
                context.bezierCurveTo(-width * .2, y - height * .08, width * .2, y + height * .08, width * .7, y);
                context.strokeStyle = gradient;
                context.lineWidth = 1 + current * .55;
                context.shadowBlur = 18;
                context.shadowColor = "rgba(168,210,225,.18)";
                context.stroke();
            }
            context.restore();
        };

        const rgba = (color, alpha) => "rgba(" + color.join(",") + "," + alpha + ")";

        // Rasterize soft light once; reuse textures instead of blurring each mark.
        const lightTextures = new Map();
        const drawLightField = (x, y, radius, color, opacity) => {
            const key = color.join(",");
            if (!lightTextures.has(key)) {
                const texture = document.createElement("canvas");
                texture.width = texture.height = 128;
                const paint = texture.getContext("2d");
                const gradient = paint.createRadialGradient(64, 64, 0, 64, 64, 64);
                gradient.addColorStop(0, rgba(color, 1));
                gradient.addColorStop(.18, rgba(color, .55));
                gradient.addColorStop(1, rgba(color, 0));
                paint.fillStyle = gradient;
                paint.fillRect(0, 0, 128, 128);
                lightTextures.set(key, texture);
            }
            context.save();
            context.globalAlpha = opacity;
            context.drawImage(lightTextures.get(key), x - radius, y - radius, radius * 2, radius * 2);
            context.restore();
        };

        const drawAtmosLight = (time, focus) => {
            const palette = chamberColors[0];
            const motion = reducedMotion.matches ? 0 : time * .00022;
            drawLightField(width * (.72 + Math.sin(motion) * .12), height * (.34 + Math.cos(motion * .8) * .1), Math.max(width, height) * .54, palette[0], .25 * focus);
            drawLightField(width * (.62 - Math.sin(motion * .8) * .15), height * .7, Math.max(width, height) * .5, palette[1], .21 * focus);
            context.save();
            context.globalCompositeOperation = "screen";
            for (let line = 0; line < (mobileViewport.matches ? 8 : 14); line += 1) {
                const offset = line / ((mobileViewport.matches ? 8 : 14) - 1);
                const color = palette[line % palette.length];
                const y = height * (.1 + offset * .78);
                const wave = Math.sin(motion + line * .63) * height * .09;
                context.beginPath();
                context.moveTo(-width * .08, y + wave);
                context.bezierCurveTo(width * (.28 + Math.sin(motion * .7) * .12), y - height * .26 + wave, width * .62, y + height * .26 - wave, width * 1.08, y - wave * .55);
                context.strokeStyle = rgba(color, (.07 + (line % 4) * .02) * focus);
                context.lineWidth = 1.8 + (line % 5) * .8;
                context.stroke();
                context.globalAlpha = .16;
                context.lineWidth *= 5;
                context.stroke();
                context.globalAlpha = 1;
            }
            context.restore();
        };

        const drawFlowgenLight = (time, focus) => {
            const palette = chamberColors[1];
            const targetX = width * (mobileViewport.matches ? .68 : .34);
            const targetY = height * .49;
            const origins = [[.04, .18], [.3, -.08], [1.02, .16], [1.08, .77], [.32, 1.06], [-.04, .82]];
            const motion = reducedMotion.matches ? 1 : time * .0012;
            context.save();
            context.globalCompositeOperation = "screen";
            origins.forEach((origin, index) => {
                const color = palette[index % palette.length];
                const pulse = reducedMotion.matches ? .82 : .45 + Math.sin(motion - index * .72) * .35;
                const x = origin[0] * width;
                const y = origin[1] * height;
                context.beginPath();
                context.moveTo(x, y);
                const controlX = (x + targetX) * .5 + Math.sin(index * 2.7 + motion * .25) * width * .13;
                const controlY = (y + targetY) * .5 + Math.cos(index * 1.9 + motion * .3) * height * .13;
                context.quadraticCurveTo(controlX, controlY, targetX, targetY);
                context.strokeStyle = rgba(color, (.12 + Math.max(0, pulse) * .3) * focus);
                context.lineWidth = 1.8 + Math.max(0, pulse) * 3.8;
                context.stroke();
                context.globalAlpha = .12;
                context.lineWidth *= 4;
                context.stroke();
                context.globalAlpha = 1;
                // Soft packets travel along the same bending light path.
                for (let trail = 0; trail < 5; trail += 1) {
                    const progress = ((motion * .2 + index / origins.length - trail * .025) % 1 + 1) % 1;
                    const inverse = 1 - progress;
                    const px = inverse * inverse * x + 2 * inverse * progress * controlX + progress * progress * targetX;
                    const py = inverse * inverse * y + 2 * inverse * progress * controlY + progress * progress * targetY;
                    drawLightField(px, py, 12 - trail, color, Math.sin(progress * Math.PI) * (.7 - trail * .12) * focus);
                }
            });
            drawLightField(targetX, targetY, Math.min(width, height) * .28, [232, 248, 255], .33 * focus);
            for (let ring = 0; ring < 4; ring += 1) {
                const radius = Math.min(width, height) * (.025 + ring * .045 + (reducedMotion.matches ? 0 : Math.sin(motion) * .004));
                context.beginPath();
                context.arc(targetX, targetY, radius, 0, Math.PI * 2);
                context.strokeStyle = "rgba(225,246,255," + ((.34 - ring * .055) * focus) + ")";
                context.lineWidth = .8;
                context.stroke();
            }
            context.restore();
        };

        const drawVistoLight = (time, focus) => {
            const palette = chamberColors[2];
            const columns = mobileViewport.matches ? 5 : 8;
            const rows = mobileViewport.matches ? 8 : 11;
            const motion = reducedMotion.matches ? 0 : time * .0006;
            const alignment = reducedMotion.matches ? 1 : (1 + Math.sin(motion)) * .5;
            const align = .22 + .78 * alignment * alignment * (3 - 2 * alignment);
            const left = width * (mobileViewport.matches ? .12 : .23);
            const top = height * .18;
            const fieldWidth = width * (mobileViewport.matches ? .76 : .58);
            const fieldHeight = height * .64;
            context.save();
            context.globalCompositeOperation = "screen";
            context.lineWidth = .55;
            for (let row = 0; row < rows; row += 1) {
                context.beginPath();
                for (let column = 0; column < columns; column += 1) {
                    const index = row * columns + column;
                    const gridX = left + (column / Math.max(columns - 1, 1)) * fieldWidth;
                    const gridY = top + (row / Math.max(rows - 1, 1)) * fieldHeight;
                    const scatterX = ((index * 73) % 101) / 100 * width;
                    const scatterY = ((index * 47) % 97) / 96 * height;
                    const x = scatterX + (gridX - scatterX) * align + Math.sin(motion * 1.4 + row * .5) * width * .025 * (1 - align);
                    const y = scatterY + (gridY - scatterY) * align + Math.cos(motion + column * .6) * height * .04 * (1 - align);
                    if (column === 0) context.moveTo(x, y);
                    else context.lineTo(x, y);
                }
                context.strokeStyle = "rgba(173,211,222," + (.12 * focus) + ")";
                context.stroke();
            }
            for (let column = 0; column < columns; column += 1) {
                for (let row = 0; row < rows; row += 1) {
                    const index = row * columns + column;
                    const gridX = left + (column / Math.max(columns - 1, 1)) * fieldWidth;
                    const gridY = top + (row / Math.max(rows - 1, 1)) * fieldHeight;
                    const scatterX = ((index * 73) % 101) / 100 * width;
                    const scatterY = ((index * 47) % 97) / 96 * height;
                    const x = scatterX + (gridX - scatterX) * align + Math.sin(motion * 1.4 + row * .5) * width * .025 * (1 - align);
                    const y = scatterY + (gridY - scatterY) * align + Math.cos(motion + column * .6) * height * .04 * (1 - align);
                    const color = palette[(column + row) % palette.length];
                    const size = 1 + ((index * 7) % 4) * .42;
                    context.fillStyle = rgba(color, (.38 + ((index * 13) % 5) * .07) * focus);
                    drawLightField(x, y, size * 6, color, .48 * focus);
                    context.beginPath();
                    context.arc(x, y, size, 0, Math.PI * 2);
                    context.fill();
                }
            }
            context.restore();
        };

        const drawColorChamber = (time) => {
            if (activeChamber < 0 || chamberFocus <= 0) return;
            if (activeChamber === 0) drawAtmosLight(time, chamberFocus);
            if (activeChamber === 1) drawFlowgenLight(time, chamberFocus);
            if (activeChamber === 2) drawVistoLight(time, chamberFocus);
        };

        const drawDepthMotes = (time, amount) => {
            if (amount < 0.12) return;
            const centerX = width * (mobileViewport.matches ? 0.55 : 0.54);
            const centerY = height * 0.49;
            const count = mobileViewport.matches ? 24 : 46;
            context.save();
            context.globalCompositeOperation = "screen";
            for (let index = 0; index < count; index += 1) {
                const seed = (index * 0.61803398875) % 1;
                const motion = reducedMotion.matches ? 0 : time * 0.000018;
                const z = (seed + travel * 0.00022 + motion) % 1;
                const spread = z * z;
                const angle = index * 2.39996 + Math.sin(index * 4.71) * .25;
                const radiusX = width * .74 * spread;
                const radiusY = height * .72 * spread;
                const x = centerX + Math.cos(angle) * radiusX;
                const y = centerY + Math.sin(angle) * radiusY;
                const size = .35 + spread * (mobileViewport.matches ? 1.5 : 2.2);
                context.fillStyle = "rgba(210,225,233," + (amount * (.04 + spread * .22)) + ")";
                context.beginPath();
                context.arc(x, y, size, 0, Math.PI * 2);
                context.fill();
            }
            context.restore();
        };

        const draw = (time) => {
            if (document.hidden) return;
            if (!reducedMotion.matches) {
                frame = window.requestAnimationFrame(draw);
                // Background cadence is independent of the full-rate scroll controller.
                const interval = 1000 / (mobileViewport.matches ? 30 : 60);
                if (time - lastPaint < interval - 1) return;
                lastPaint = time;
            }
            const darkness = descent * descent * (3 - 2 * descent);
            const surface = [234, 235, 235];
            const bottom = [5, 7, 13];
            context.clearRect(0, 0, width, height);
            context.fillStyle = "rgb(" + mix(surface[0], bottom[0], darkness) + "," + mix(surface[1], bottom[1], darkness) + "," + mix(surface[2], bottom[2], darkness) + ")";
            context.fillRect(0, 0, width, height);
            drawFog(time, darkness);
            drawAmbientCurrent(time, darkness);

            const centerX = width * (mobileViewport.matches ? 0.55 : 0.54);
            const centerY = height * 0.49;
            const voidRadius = Math.max(width, height) * (0.25 + darkness * 0.34);
            const voidGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, voidRadius);
            voidGradient.addColorStop(0, "rgba(0,1,7," + (0.2 + darkness * 0.78) + ")");
            voidGradient.addColorStop(0.32, "rgba(3,5,12," + (0.12 + darkness * 0.7) + ")");
            voidGradient.addColorStop(0.72, "rgba(8,11,18," + darkness * 0.32 + ")");
            voidGradient.addColorStop(1, "rgba(8,11,18,0)");
            context.fillStyle = voidGradient;
            context.fillRect(0, 0, width, height);

            drawEchoes(time, darkness);
            drawDepthMotes(time, darkness);
            drawColorChamber(time);

            const edge = context.createRadialGradient(centerX, centerY, Math.min(width, height) * 0.16, centerX, centerY, Math.max(width, height) * 0.74);
            edge.addColorStop(0, "rgba(0,0,0,0)");
            edge.addColorStop(0.55, "rgba(0,1,5," + darkness * 0.09 + ")");
            edge.addColorStop(1, "rgba(0,1,4," + darkness * 0.74 + ")");
            context.fillStyle = edge;
            context.fillRect(0, 0, width, height);

        };

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            ratio = Math.min(window.devicePixelRatio || 1, mobileViewport.matches ? 1 : 1.5);
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            canvas.style.width = width + "px";
            canvas.style.height = height + "px";
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            if (reducedMotion.matches) draw(0);
        };

        const updateProgress = () => {
            const hero = document.querySelector("#hero");
            const works = document.querySelector("#works-art");
            const start = hero ? hero.offsetTop + hero.offsetHeight * 0.18 : 0;
            const end = works ? works.offsetTop + window.innerHeight * 0.45 : document.body.scrollHeight * 0.5;
            descent = clamp((window.scrollY - start) / Math.max(end - start, 1));
            travel = window.scrollY;
            documentRoot.style.setProperty("--descent", descent.toFixed(4));
            documentRoot.classList.toggle("in-depth", descent > 0.48);

            activeChamber = -1;
            chamberFocus = 0;
            document.querySelectorAll(".work-block").forEach((block, index) => {
                const bounds = block.getBoundingClientRect();
                const focus = clamp(1 - Math.abs(bounds.top) / height);
                if (focus > chamberFocus && bounds.bottom > 0 && bounds.top < height) {
                    activeChamber = index;
                    chamberFocus = focus;
                }
            });
            document.querySelectorAll(".work-block").forEach((block, index) => {
                block.classList.toggle("is-active", index === activeChamber);
            });
            document.querySelectorAll(".journey-frame").forEach((section) => {
                const bounds = section.getBoundingClientRect();
                const entering = bounds.top >= 0;
                const distance = clamp(Math.abs(bounds.top) / height);
                const scale = entering ? .68 + (1 - distance) * .32 : 1 + distance * .72;
                const opacity = entering ? clamp(1 - distance * 1.08) : clamp(1 - distance * 1.3);
                section.style.setProperty("--journey-scale", scale.toFixed(4));
                section.style.setProperty("--journey-opacity", opacity.toFixed(4));
                section.style.setProperty("--journey-blur", ((1 - opacity) * 7).toFixed(2) + "px");
            });
            scene.dataset.chamber = activeChamber < 0 ? "none" : String(activeChamber);
            if (reducedMotion.matches) draw(0);
            ticking = false;
        };

        const settleAtFrame = () => {
            if (snapTarget !== null) return;
            const frames = journeyFrames();
            if (!frames.length) return;
            const currentY = window.scrollY;
            const nearest = nearestFrameIndex(currentY);
            const threshold = Math.min(42, height * .055);
            let targetIndex = nearest;

            if (gestureDistance >= threshold && nearest === settledIndex && scrollDirection !== 0) {
                targetIndex = clamp(settledIndex + scrollDirection, 0, frames.length - 1);
            }

            // Finish in the input direction; never pull a forward gesture backward.
            if (scrollDirection > 0 && framePosition(frames[targetIndex]) < currentY - 2) {
                targetIndex = Math.min(targetIndex + 1, frames.length - 1);
            } else if (scrollDirection < 0 && framePosition(frames[targetIndex]) > currentY + 2) {
                targetIndex = Math.max(targetIndex - 1, 0);
            }
            const targetY = framePosition(frames[targetIndex]);
            settledIndex = targetIndex;
            scrollDirection = 0;
            gestureDistance = 0;

            if (Math.abs(currentY - targetY) > 2) {
                snapTarget = targetY;
                const started = performance.now();
                const duration = reducedMotion.matches ? 0 : 480 + Math.min(1, Math.abs(targetY - currentY) / height) * 240;
                // Symmetric easing gives forward and reverse arrivals the same soft finish.
                const animateSnap = (now) => {
                    const progress = duration ? clamp((now - started) / duration) : 1;
                    const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
                    window.scrollTo({ top: currentY + (targetY - currentY) * eased, behavior: "instant" });
                    if (progress < 1) snapFrame = window.requestAnimationFrame(animateSnap);
                    else {
                        snapFrame = 0;
                        snapTarget = null;
                        lastScrollY = targetY;
                        scrollDirection = 0;
                        gestureDistance = 0;
                        window.clearTimeout(settleTimer);
                    }
                };
                snapFrame = window.requestAnimationFrame(animateSnap);
            } else {
                snapTarget = null;
            }
        };

        const onScroll = () => {
            const currentY = window.scrollY;
            const delta = currentY - lastScrollY;
            if (Math.abs(delta) > 1 && snapTarget === null) {
                const direction = delta > 0 ? 1 : -1;
                if (direction !== scrollDirection) gestureDistance = 0;
                scrollDirection = direction;
                gestureDistance += Math.abs(delta);
            }
            lastScrollY = currentY;

            window.clearTimeout(settleTimer);
            if (snapTarget === null) settleTimer = window.setTimeout(settleAtFrame, 100);
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(updateProgress);
        };

        const restart = () => {
            window.cancelAnimationFrame(frame);
            lastPaint = -Infinity;
            resize();
            updateProgress();
            if (!reducedMotion.matches) frame = window.requestAnimationFrame(draw);
        };

        const onVisibilityChange = () => {
            window.cancelAnimationFrame(frame);
            lastPaint = -Infinity;
            if (!document.hidden) {
                if (reducedMotion.matches) draw(0);
                else frame = window.requestAnimationFrame(draw);
            }
        };

        const interruptSnap = () => {
            window.clearTimeout(settleTimer);
            if (snapTarget !== null) {
                window.cancelAnimationFrame(snapFrame);
                snapFrame = 0;
                snapTarget = null;
                settledIndex = nearestFrameIndex();
                lastScrollY = window.scrollY;
                gestureDistance = 0;
                scrollDirection = 0;
            }
        };
        const onKeyDown = (event) => {
            if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) interruptSnap();
        };

        scene.dataset.ready = "true";
        documentRoot.classList.add("depth-ready");
        settledIndex = nearestFrameIndex();
        lastScrollY = window.scrollY;
        window.addEventListener("resize", restart, { passive: true });
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("wheel", interruptSnap, { passive: true });
        window.addEventListener("touchstart", interruptSnap, { passive: true });
        window.addEventListener("keydown", onKeyDown);
        document.addEventListener("visibilitychange", onVisibilityChange);
        reducedMotion.addEventListener("change", restart);
        restart();

        return () => {
            window.cancelAnimationFrame(frame);
            window.cancelAnimationFrame(snapFrame);
            window.clearTimeout(settleTimer);
            window.removeEventListener("resize", restart);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("wheel", interruptSnap);
            window.removeEventListener("touchstart", interruptSnap);
            window.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            lightTextures.clear();
            reducedMotion.removeEventListener("change", restart);
            documentRoot.classList.remove("depth-ready", "in-depth");
            documentRoot.style.removeProperty("--descent");
        };
    }, []);

    return (
        <div className="depth-scene" ref={sceneRef} aria-hidden="true">
            <canvas className="depth-canvas" ref={canvasRef} />
            <div className="fog-veil fog-veil-one" />
            <div className="fog-veil fog-veil-two" />
            <div className="void-vignette" />
        </div>
    );
}
