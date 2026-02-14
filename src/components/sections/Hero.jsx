import Section from "../ui/Section";
import "../../styles/hero.css";

export default function Hero() {
    return (
        <Section id="hero">
            <div className="hero-veil">
                <div className="veil-layer layer1" />
                <div className="veil-layer layer2" />
            </div>

            <h1 className="hero-title">
                If it’s ordinary,
                <br />
                I don’t build it.
            </h1>
        </Section>
    );
}