import { useEffect, useState } from "react";
import Section from "../ui/Section";
import "../../styles/philosophy.css";

export default function Philosophy() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                }
            },
            { threshold: 0.3 }
        );

        const el = document.getElementById("philosophy");
        if (el) observer.observe(el);

        return () => observer.disconnect();
    }, []);

    return (
        <Section id="philosophy">
            <div className="philosophy-text">
                <p className={visible ? "show delay1" : ""}>The space between things comes first.</p>
                <p className={visible ? "show delay2" : ""}>I turn structure into screens and sentences.</p>
                <p className={visible ? "show delay3" : ""}>Answers got fast.</p>

                <br />

                <p className={visible ? "show delay4" : ""}>
                    Questions are still made by hand.
                </p>
            </div>
        </Section>
    );
}