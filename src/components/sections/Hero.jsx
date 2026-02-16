import { useEffect, useState } from "react";
import Section from "../ui/Section";
import "../../styles/hero.css";

export default function Hero() {
    const [scrollY, setScrollY] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        const handleScroll = () => {
            setScrollY(window.scrollY);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const depth = Math.min(scrollY / 600, 1);

    return (
        <Section
            id="hero"
            style={{
                "--darkness": depth
            }}
        >
            <div
                className="hero-veil"
                style={{
                    transform: `scale(${1 - depth * 0.2})`,
                    opacity: 1 - depth
                }}
            >
                <div className="veil-layer layer1" />
                <div className="veil-layer layer2" />
            </div>

            <h1
                className={`hero-title ${mounted ? "mounted" : ""}`}
                style={{
                    opacity: mounted ? 1 - depth : 0,
                    transform: mounted
                        ? `translateY(${depth * 40}px)`
                        : "translateY(6px)"
                }}
            >
                What you see
                <br />
                is never where it begins.
            </h1>
        </Section>
    );
}