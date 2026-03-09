import { useEffect, useRef } from 'react';

const CustomCursor = () => {
    const dotRef = useRef<HTMLDivElement>(null);
    const outlineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const posX = e.clientX;
            const posY = e.clientY;

            if (dotRef.current) {
                dotRef.current.style.left = `${posX}px`;
                dotRef.current.style.top = `${posY}px`;
            }

            if (outlineRef.current) {
                outlineRef.current.animate({
                    left: `${posX}px`,
                    top: `${posY}px`
                }, { duration: 500, fill: "forwards" });
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <div className="hidden md:block">
            <div ref={dotRef} className="cursor-dot" />
            <div ref={outlineRef} className="cursor-outline" />
        </div>
    );
};

export default CustomCursor;
