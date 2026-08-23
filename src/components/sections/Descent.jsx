import { useEffect, useRef, useState } from "react";
import "../../styles/descent.css";

/* ------------------------------------------------------------------ */
/* 落下（Descent）                                                      */
/* 3拍：観測 → 行為 → 時代                                              */
/* 一人称（「私は」/ "I"）はサイト全体でこのBeat2のみに配給されている。      */
/* ------------------------------------------------------------------ */

const BEATS = [
    {
        key: "observe",
        ja: ["ものより先に、ものの あいだを見る。"],
        en: "The space between things comes first."
    },
    {
        key: "act",
        ja: ["私は、見えない構造を画面と言葉に置き換える。"],
        en: "I turn structure into screens and sentences."
    },
    {
        key: "era",
        // 意味の切れ目で2行
        ja: ["答えを出すのは速くなった。", "問いは、まだ手で作る。"],
        en: "Answers got fast. Questions are still made by hand."
    }
];

/* 進行率 0..1 上の各拍の中心。
   PLATEAU 内は完全に霧が晴れ、そこから FADE で霧に還る。
   ガード条件：進行率 40% 時点で Beat2 は |0.40 - 0.50| = 0.10 <= PLATEAU
   → reveal = 1 → 文字 opacity = 0.05 + 0.9 = 0.95 >= 0.72 を満たす。 */
const CENTERS = [0.18, 0.5, 0.82];
const PLATEAU = 0.12;
const FADE = 0.1;

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
const smoothstep = (n) => n * n * (3 - 2 * n);

function revealAt(progress, center) {
    const distance = Math.abs(progress - center);
    if (distance <= PLATEAU) return 1;
    return 1 - smoothstep(clamp01((distance - PLATEAU) / FADE));
}

export default function Descent() {
    const sectionRef = useRef(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return undefined;

        let frame = 0;

        const measure = () => {
            frame = 0;
            const rect = el.getBoundingClientRect();
            const scrollable = rect.height - window.innerHeight;
            setProgress(
                scrollable > 0 ? clamp01(-rect.top / scrollable) : 1
            );
        };

        const onScroll = () => {
            if (frame === 0) {
                frame = window.requestAnimationFrame(measure);
            }
        };

        measure();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);

        return () => {
            if (frame !== 0) window.cancelAnimationFrame(frame);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, []);

    const reveals = CENTERS.map((center) => revealAt(progress, center));
    const fog = 1 - Math.max(...reveals);

    return (
        <section
            id="descent"
            ref={sectionRef}
            style={{ "--progress": progress, "--fog": fog }}
        >
            <div className="descent-stage">
                <div className="descent-dark" aria-hidden="true" />

                <div className="descent-veil" aria-hidden="true">
                    <div className="descent-veil-layer veil-a" />
                    <div className="descent-veil-layer veil-b" />
                </div>

                <div className="descent-beats">
                    {BEATS.map((beat, i) => (
                        <div
                            key={beat.key}
                            className={`descent-beat beat-${i + 1}`}
                            style={{ "--reveal": reveals[i] }}
                        >
                            <p className="beat-ja" lang="ja">
                                {beat.ja.map((line) => (
                                    <span key={line} className="beat-line">
                                        {line}
                                    </span>
                                ))}
                            </p>
                            <p className="beat-en" lang="en">
                                {beat.en}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
