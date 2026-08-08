import { useEffect, useRef } from "react";

type ParticleFieldProps = {
  variant?: "ambient" | "profile";
};

export function ParticleField({ variant = "ambient" }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const interactive = variant === "profile";
    const host = interactive ? (canvas.parentElement ?? document.body) : document.body;
    const spacing = interactive ? 15 : 20;
    const radius = interactive ? 126 : 0;
    const maxShift = interactive ? 5 : 0;
    let frame = 0;
    let width = 0;
    let height = 0;
    let pointerX = -1000;
    let pointerY = -1000;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const moving = interactive && !reducedMotion.matches && document.visibilityState === "visible";
      const lightTheme = document.documentElement.dataset.theme === "light";
      for (let y = spacing / 2; y < height; y += spacing) {
        for (let x = spacing / 2; x < width; x += spacing) {
          const dx = x - pointerX;
          const dy = y - pointerY;
          const distance = Math.hypot(dx, dy);
          const proximity = moving && distance < radius ? 1 - distance / radius : 0;
          const influence = proximity * maxShift;
          const angle = Math.atan2(dy, dx);
          const px = x + Math.cos(angle) * influence;
          const py = y + Math.sin(angle) * influence;
          context.beginPath();
          const baseSize = interactive ? 0.72 : 0.62;
          context.arc(px, py, baseSize + proximity * 1.55, 0, Math.PI * 2);
          context.fillStyle = interactive && proximity > 0
            ? `rgba(66, 223, 162, ${0.16 + proximity * 0.68})`
            : lightTheme
              ? interactive ? "rgba(38, 39, 35, 0.075)" : "rgba(38, 39, 35, 0.07)"
              : interactive ? "rgba(241, 240, 232, 0.055)" : "rgba(241, 240, 232, 0.045)";
          context.fill();
        }
      }
      if (!reducedMotion.matches && document.visibilityState === "visible") {
        frame = window.requestAnimationFrame(draw);
      }
    };

    const handlePointer = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      pointerX = event.clientX - bounds.left;
      pointerY = event.clientY - bounds.top;
    };
    const clearPointer = () => {
      pointerX = -1000;
      pointerY = -1000;
    };
    const handleVisibility = () => {
      window.cancelAnimationFrame(frame);
      if (document.visibilityState === "visible") draw();
    };
    const handleMotion = () => {
      window.cancelAnimationFrame(frame);
      draw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    if (interactive) {
      host.addEventListener("pointermove", handlePointer, { passive: true });
      host.addEventListener("pointerleave", clearPointer);
    }
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotion.addEventListener("change", handleMotion);
    draw();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      if (interactive) {
        host.removeEventListener("pointermove", handlePointer);
        host.removeEventListener("pointerleave", clearPointer);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", handleMotion);
    };
  }, [variant]);

  return <canvas className={`particle-field particle-field-${variant}`} ref={canvasRef} aria-hidden="true" />;
}
