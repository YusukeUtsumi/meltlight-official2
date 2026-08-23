export default function Section({ id, children }) {
    return (
        <section id={id}>
            <div className="section-inner">
                {children}
            </div>
        </section>
    );
}