import { useEffect, useRef, useState } from "react";
import "../../styles/about.css";

export default function About() {

    const [visible, setVisible] = useState(false);
    const aboutRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                }
            },
            { threshold: 0.3 }
        );

        if (aboutRef.current) {
            observer.observe(aboutRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section
            id="about"
            ref={aboutRef}
            className={visible ? "visible" : ""}
        >
            <div className="section-inner">
                <div className="about-wrapper">

                    <p className="about-label">
                        ABOUT
                    </p>

                    <div className="about-main">
                        <p className="about-name">
                            Yusuke Utsumi
                        </p>

                        <p className="about-role">
                            Conceptual Digital Artist
                        </p>

                        <p className="about-role">
                            TopDesignKing jury member
                        </p>
                    </div>

                    <div className="about-recognitions">
                        <p className="recognition-label">
                            SELECTED RECOGNITIONS
                        </p>

                        <ul>
                            <li>Web Guru Awards — Guru of the day</li>
                            <li>TopDesignKing — Nominee</li>
                            <li>BestCSS — Gallery Featured</li>
                            <li>CSSLight — Gallery Featured</li>
                        </ul>
                    </div>

                    <div className="about-button">
                        <a href="https://meltlight.art/" target="_blank" rel="noopener noreferrer" className="mono-button">
                            PORTFOLIO
                        </a>
                    </div>

                </div>
            </div>
        </section>
    );
}