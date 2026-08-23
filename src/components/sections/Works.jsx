import { useEffect, useRef, useState } from "react";
import "../../styles/works.css";

/* ------------------------------------------------------------------ */
/* 展示室 I / II / III                                                  */
/* 各展示物は 詩層 → 事実層 → 証拠層 の3層。                             */
/* 洞窟原則：同時に2つ以上の展示物を完全表示しない。                       */
/* 詩層は確定コピー（変更禁止）。一人称は使用しない。                      */
/* ------------------------------------------------------------------ */

const EXHIBITS = [
    {
        id: "atmos",
        room: "EXHIBIT I",
        name: "Atmos",
        poemJa: [
            "気温、湿度、風速。",
            "数字は、窓の外を映さない。",
            "色と面が、先に動く。"
        ],
        poemEn: [
            "Temperature. Humidity. Wind speed.",
            "The numbers stop at the glass.",
            "Color moves first, then the surface."
        ],
        /* 事実層：仮テキスト — 最終稿は別途差し替え */
        factJa:
            "気象データの数値を、色面と階調に変換して提示するビジュアル天気インターフェース。",
        factEn:
            "A weather interface that renders forecast values as color fields and gradients.",
        link: {
            href: "https://atmos.meltlight.art",
            label: "OPEN ATMOS"
        }
    },
    {
        id: "flowgen",
        room: "EXHIBIT II",
        name: "Flowgen",
        poemJa: [
            "一行だけ、置く。",
            "コードが積まれ、穴が塞がり、試験が走る。",
            "手を離したままで。"
        ],
        poemEn: [
            "One line, laid down.",
            "Code stacks up. Holes close. Tests run.",
            "The hands stay off."
        ],
        /* 事実層：仮テキスト — 最終稿は別途差し替え */
        factJa:
            "一行の指示から設計・実装・検査までを連続実行する、エージェント型の開発パイプライン。",
        factEn:
            "An agent pipeline that carries one instruction through design, build and inspection.",
        link: {
            href: "https://flowgen.meltlight.art/",
            label: "OPEN FLOWGEN"
        }
    },
    {
        id: "visto",
        room: "EXHIBIT III",
        name: "Visto Format",
        poemJa: [
            "見せるか、隠すか。扉は二枚きり。",
            "どの一行を、誰に、どこまで。",
            "その目盛りを、刻む。"
        ],
        poemEn: [
            "Show, or hide. Two doors, and no third.",
            "Which line, to whom, how far.",
            "Notches cut between them."
        ],
        /* 事実層：仮テキスト — 最終稿は別途差し替え */
        factJa:
            "公開範囲を主張の単位で刻む、オープンな記述規格。仕様は CC BY 4.0 で公開されている。",
        factEn:
            "An open specification that marks disclosure scope claim by claim. Released under CC BY 4.0.",
        /* 証拠層：規格としての OSS 版のみ。商品版 / SaaS 版の URL は使わない */
        link: {
            href: "https://github.com/vistoformat/spec",
            label: "READ THE SPECIFICATION"
        }
    }
];

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
const smoothstep = (n) => n * n * (3 - 2 * n);

/* 展示物の中心がビューポート中心からどれだけ離れているかで焦点を決める。
   展示室は 110vh 以上あるため、1つが中心にある時、隣は必ず焦点0になる。 */
const FOCUS_PLATEAU = 0.1;
const FOCUS_FADE = 0.4;

export default function Works() {
    const itemRefs = useRef([]);
    const [focus, setFocus] = useState(() => EXHIBITS.map(() => 0));

    useEffect(() => {
        let frame = 0;

        const measure = () => {
            frame = 0;
            const viewport = window.innerHeight;
            if (viewport === 0) return;

            setFocus(
                EXHIBITS.map((_, i) => {
                    const el = itemRefs.current[i];
                    if (!el) return 0;

                    const rect = el.getBoundingClientRect();
                    const center = rect.top + rect.height / 2;
                    const distance =
                        Math.abs(center - viewport / 2) / viewport;

                    return (
                        1 -
                        smoothstep(
                            clamp01(
                                (distance - FOCUS_PLATEAU) / FOCUS_FADE
                            )
                        )
                    );
                })
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

    return (
        <section id="works-art">
            {EXHIBITS.map((exhibit, i) => (
                <article
                    key={exhibit.id}
                    ref={(el) => {
                        itemRefs.current[i] = el;
                    }}
                    className={`exhibit exhibit-${exhibit.id}${
                        focus[i] > 0.5 ? " is-open" : ""
                    }`}
                    style={{ "--focus": focus[i] }}
                    aria-labelledby={`${exhibit.id}-name`}
                >
                    <div className="exhibit-fog" aria-hidden="true">
                        <div className="exhibit-fog-layer" />
                    </div>

                    <div className="exhibit-inner">
                        <p className="exhibit-room">{exhibit.room}</p>

                        <h2 className="exhibit-name" id={`${exhibit.id}-name`}>
                            {exhibit.name}
                        </h2>

                        <div className="exhibit-poem" lang="ja">
                            {exhibit.poemJa.map((line) => (
                                <p key={line} className="poem-line">
                                    {line}
                                </p>
                            ))}
                        </div>

                        <div className="exhibit-poem-en" lang="en">
                            {exhibit.poemEn.map((line) => (
                                <p key={line} className="poem-line-en">
                                    {line}
                                </p>
                            ))}
                        </div>

                        <div className="exhibit-fact">
                            <p lang="ja">{exhibit.factJa}</p>
                            <p className="fact-en" lang="en">
                                {exhibit.factEn}
                            </p>
                        </div>

                        <a
                            className="exhibit-link"
                            href={exhibit.link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {exhibit.link.label}
                        </a>
                    </div>
                </article>
            ))}
        </section>
    );
}
