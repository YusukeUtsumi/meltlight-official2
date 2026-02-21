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
                <p className="work-title">
                    Brand Landing Experience
                </p>
                <div className="price">
                    <span className="from">from</span>
                    <span className="currency">$</span>
                    <span className="amount">4,500</span>
                </div>
            </div>

            <div className="work-block block-2">
                <p className="work-title">
                    Concept Architecture
                </p>
                <div className="price">
                    <span className="from">from</span>
                    <span className="currency">$</span>
                    <span className="amount">2,000</span>
                </div>
            </div>

            <div className="work-block block-3">
                <p className="work-title">
                    Naming & Language System
                </p>
                <div className="price">
                    <span className="from">from</span>
                    <span className="currency">$</span>
                    <span className="amount">1,500</span>
                </div>
            </div>

        </section>
    );
}