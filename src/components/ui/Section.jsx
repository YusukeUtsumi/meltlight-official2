export default function Section({
    id,
    children,
    style,
    className,
    innerClassName,
    ...rest
}) {
    return (
        <section id={id} className={className} style={style} {...rest}>
            <div
                className={
                    innerClassName
                        ? `section-inner ${innerClassName}`
                        : "section-inner"
                }
            >
                {children}
            </div>
        </section>
    );
}
