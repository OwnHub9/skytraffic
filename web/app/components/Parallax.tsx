"use client";
import { useEffect, useState, type ReactNode } from "react";

export default function Parallax({ children, speed = 0.25 }: { children: ReactNode; speed?: number }) {
  const [y, setY] = useState(0);

  useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ transform: `translateY(${y * speed}px)`, opacity: Math.max(0, 1 - y / 700), willChange: "transform, opacity" }}>
      {children}
    </div>
  );
}