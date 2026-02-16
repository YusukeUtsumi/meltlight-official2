import { useEffect, useState } from "react";
import "../../styles/header.css";

export default function Header() {

    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > window.innerHeight * 0.6) {
                setVisible(true);
            } else {
                setVisible(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header className={`header ${visible ? "visible" : ""}`}>
            <div className="header-inner">

                <a href="#top" className="logo">
                    MELTLIGHT
                </a>

                <nav className="nav">
                    <a href="#works-art">Portfolio</a>
                    <a href="#contact">Contact</a>
                </nav>

            </div>
        </header>
    );
}