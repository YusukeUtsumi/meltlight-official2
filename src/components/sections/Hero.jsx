import Section from "../ui/Section";
import "../../styles/hero.css";
export default function Hero() {
    return <Section id="hero" className="journey-frame journey-hero">
        <p className="hero-kicker">MELTLIGHT / THE SPACE BETWEEN</p>
        <h1 className="hero-title">What happens<br />between what exists<br />and what we perceive?</h1>
        <p className="hero-invitation">Enter the space between.</p>
    </Section>;
}
