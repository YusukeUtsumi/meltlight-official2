import "../../styles/works.css";

const works = [
    {
        number: "I",
        transform: "DATA → SENSATION",
        name: "Atmos",
        href: "https://atmos.meltlight.art/",
        statement: "The air becomes a place.",
        body: "Temperature, humidity, wind, cloud and light are translated into color and moving form. Not a forecast to consult. A condition to enter.",
        className: "block-atmos",
    },
    {
        number: "II",
        transform: "IDEA → EVIDENCE",
        name: "Flowgen",
        href: "https://flowgen.meltlight.art/",
        statement: "A thought takes shape. Then it is tested.",
        body: "One sentence becomes architecture, code, attack, test and repair. The work moves forward only when the evidence does.",
        className: "block-flowgen",
    },
    {
        number: "III",
        transform: "MEANING → STRUCTURE",
        name: "Visto Format",
        href: "https://github.com/YusukeUtsumi/visto-format",
        statement: "The same meaning. Another way to read it.",
        body: "A factual claim is anchored to an entity, a source and a question—so AI can read precisely what a person already understands.",
        className: "block-visto",
    },
];

export default function Works() {
    return (
        <section id="works-art" className="depth-section">
            <header className="works-intro journey-frame">
                <div className="works-intro-inner">
                    <p className="works-kicker">THREE TRANSLATIONS</p>
                    <h2 className="works-heading">What changes<br />when form changes?</h2>
                    <p className="works-deck">Three works. Each begins with something that cannot yet be felt, trusted or read.</p>
                </div>
            </header>

            {works.map((work) => (
                <article className={`work-block journey-frame ${work.className}`} data-product={work.name} key={work.name}>
                    <div className="work-stage">
                        <div className="work-copy">
                            <p className="work-meta"><span>{work.number}</span>{work.transform}</p>
                            <h3 className="work-statement">{work.statement}</h3>
                            <p className="work-description">{work.body}</p>
                            <a className="amount" href={work.href} target="_blank" rel="noopener noreferrer">
                                <span>ENTER</span>{work.name}<span aria-hidden="true">↗</span>
                            </a>
                        </div>
                    </div>
                </article>
            ))}
        </section>
    );
}
