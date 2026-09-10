import "../../styles/about.css";

export default function About() {

    return (
        <section
            id="about"
            className="depth-section journey-frame"
        >
            <div className="section-inner">
                <div className="about-wrapper">

                    <p className="about-label">
                        THE PERSON IN BETWEEN
                    </p>

                    <p className="about-thesis">I work in that space between.</p>

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
