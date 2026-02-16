import { useEffect, useRef, useState } from "react";
import "../../styles/contact.css";

export default function Contact() {

    const [visible, setVisible] = useState(false);
    const contactRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                }
            },
            { threshold: 0.3 }
        );

        if (contactRef.current) {
            observer.observe(contactRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section
            id="contact"
            ref={contactRef}
            className={visible ? "visible" : ""}
        >
            <div className="contact-inner">

                <h2 className="contact-heading">
                    When you are ready
                </h2>

                <a href="https://tally.so/r/mRXxjj" className="contact-button" target="_blank" rel="noopener noreferrer">
                    INQUIRE
                </a>

            </div>
        </section>
    );
}