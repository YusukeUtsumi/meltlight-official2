import "../../styles/header.css";
export default function Header() {
    return <header className="header"><div className="header-inner">
        <a href="#top" className="logo">MELTLIGHT</a>
        <nav className="nav" aria-label="Main navigation">
            <a href="mailto:yusuke@meltlight.art">Contact</a>
        </nav>
    </div></header>;
}
