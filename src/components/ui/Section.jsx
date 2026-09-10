export default function Section({ id, children, className = "" }) {
    return (
        <section id={id} className={className}>
            <div className="section-inner">
                {children}
            </div>
        </section>
    );
}
