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
                <p className={visible ? "show delay1" : ""}>Create.</p>
                <p className={visible ? "show delay2" : ""}>Break.</p>
                <p className={visible ? "show delay3" : ""}>Rebuild.</p>

                <br />

                <p className={visible ? "show delay4" : ""}>
                    Efficiency fades.
                    <br />
                    Structure remains.
                </p>
            </div>
        </Section>
    );
}