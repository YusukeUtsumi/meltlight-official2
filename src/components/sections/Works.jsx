import { useEffect, useState } from "react";
import "../../styles/works.css";

export default function Works() {

    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                }
            },
            { threshold: 0.4 }
        );

        const el = document.getElementById("works-art");
        if (el) observer.observe(el);

        return () => observer.disconnect();
    }, []);

    return (
        <section
            id="works-art"
            className={visible ? "visible" : ""}
        >

            <h2 className="works-heading">
                Form follows something unseen.
            </h2>

            <div className="work-block block-1">
                <div className="price">
                    <span className="from">EXHIBIT I</span>
                    <a
                        className="amount"
                        href="https://atmos.meltlight.art/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Atmos
                    </a>
                </div>
                <p className="work-title">
                    Temperature. Humidity. Wind speed.
                </p>
            </div>

            <div className="work-block block-2">
                <div className="price">
                    <span className="from">EXHIBIT II</span>
                    <a
                        className="amount"
                        href="https://flowgen.meltlight.art/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Flowgen
                    </a>
                </div>
                <p className="work-title">
                    One line, laid down.
                </p>
            </div>

            <div className="work-block block-3">
                <div className="price">
                    <span className="from">EXHIBIT III</span>
                    <a
                        className="amount"
                        href="https://github.com/YusukeUtsumi/visto-format"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Visto Format
                    </a>
                </div>
                <p className="work-title">
                    Show, or hide. Two doors, and no third.
                </p>
            </div>

        </section>
    );
}