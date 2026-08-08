import { gsap } from "gsap";
import { useEffect, useMemo, useRef } from "react";

type DotGridProps = {
  className?: string;
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
};

type Dot = { x: number; y: number };

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

export function DotGrid({
  className = "",
  dotSize = 1,
  gap = 14,
  baseColor = "#314057",
  activeColor = "#42dfa2",
  proximity = 104
}: DotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const base = useMemo(() => hexToRgb(baseColor), [baseColor]);
  const active = useMemo(() => hexToRgb(activeColor), [activeColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const pointer = { x: -1000, y: -1000 };
    const shock = { x: -1000, y: -1000, strength: 0 };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;

    const rebuild = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = gap / 2; y < height; y += gap) {
        for (let x = gap / 2; x < width; x += gap) dots.push({ x, y });
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const dot of dots) {
        const pointerDistance = Math.hypot(dot.x - pointer.x, dot.y - pointer.y);
        const pointerMix = Math.max(0, 1 - pointerDistance / proximity);
        const shockDistance = Math.hypot(dot.x - shock.x, dot.y - shock.y);
        const shockMix = Math.max(0, 1 - shockDistance / (proximity * 1.65)) * shock.strength;
        const mix = Math.max(pointerMix, shockMix);
        const radius = dotSize / 2 + mix * 0.85;
        const red = Math.round(base.r + (active.r - base.r) * mix);
        const green = Math.round(base.g + (active.g - base.g) * mix);
        const blue = Math.round(base.b + (active.b - base.b) * mix);
        context.beginPath();
        context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${0.34 + mix * 0.58})`;
        context.fill();
      }
      if (!reducedMotion.matches && document.visibilityState === "visible") frame = requestAnimationFrame(draw);
    };

    const move = (event: PointerEvent) => {
      gsap.to(pointer, { x: event.clientX, y: event.clientY, duration: 0.18, ease: "power2.out", overwrite: true });
    };
    const leave = () => gsap.to(pointer, { x: -1000, y: -1000, duration: 0.28, ease: "power2.out", overwrite: true });
    const click = (event: PointerEvent) => {
      if (reducedMotion.matches) return;
      shock.x = event.clientX;
      shock.y = event.clientY;
      gsap.fromTo(shock, { strength: 1 }, { strength: 0, duration: 0.8, ease: "power2.out", overwrite: true });
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      draw();
    };

    rebuild();
    draw();
    window.addEventListener("resize", rebuild);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", click, { passive: true });
    document.addEventListener("visibilitychange", resume);
    reducedMotion.addEventListener("change", resume);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", rebuild);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", click);
      document.removeEventListener("visibilitychange", resume);
      reducedMotion.removeEventListener("change", resume);
      gsap.killTweensOf([pointer, shock]);
    };
  }, [active, base, dotSize, gap, proximity]);

  return <canvas className={`dot-grid ${className}`} ref={canvasRef} aria-hidden="true" />;
}
