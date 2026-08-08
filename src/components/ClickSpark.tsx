import { useEffect, useRef } from "react";

type Spark = { x: number; y: number; angle: number; startedAt: number };
type TrailSegment = { fromX: number; fromY: number; toX: number; toY: number; startedAt: number };

export function ClickSpark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const sparks: Spark[] = [];
    const trails: TrailSegment[] = [];
    const maxTrails = 18;
    const trailLifetime = 280;
    let lastTrailPoint: { x: number; y: number } | null = null;
    let frame = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (now: number) => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let index = trails.length - 1; index >= 0; index -= 1) {
        const trail = trails[index];
        const progress = (now - trail.startedAt) / trailLifetime;
        if (progress >= 1) { trails.splice(index, 1); continue; }
        const opacity = 1 - progress;
        const gradient = context.createLinearGradient(trail.fromX, trail.fromY, trail.toX, trail.toY);
        gradient.addColorStop(0, "rgba(131, 213, 166, 0)");
        gradient.addColorStop(0.42, `rgba(131, 213, 166, ${opacity * 0.42})`);
        gradient.addColorStop(1, `rgba(244, 240, 231, ${opacity * 0.82})`);
        context.beginPath();
        context.moveTo(trail.fromX, trail.fromY);
        context.lineTo(trail.toX, trail.toY);
        context.lineCap = "round";
        context.lineWidth = 2.15 - progress * 0.85;
        context.strokeStyle = gradient;
        context.stroke();
      }
      for (let index = sparks.length - 1; index >= 0; index -= 1) {
        const spark = sparks[index];
        const progress = (now - spark.startedAt) / 430;
        if (progress >= 1) { sparks.splice(index, 1); continue; }
        const eased = 1 - (1 - progress) * (1 - progress);
        const distance = eased * 24;
        const length = 12 * (1 - eased);
        const x = spark.x + Math.cos(spark.angle) * distance;
        const y = spark.y + Math.sin(spark.angle) * distance;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + Math.cos(spark.angle) * length, y + Math.sin(spark.angle) * length);
        context.lineWidth = 1.5;
        context.strokeStyle = `rgba(131, 213, 166, ${1 - progress})`;
        context.stroke();
      }
      frame = 0;
      if (sparks.length || trails.length) frame = window.requestAnimationFrame(draw);
    };
    const requestDraw = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };
    const click = (event: MouseEvent) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const startedAt = performance.now();
      for (let index = 0; index < 8; index += 1) sparks.push({ x: event.clientX, y: event.clientY, angle: (Math.PI * 2 * index) / 8, startedAt });
      requestDraw();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("button, input, textarea, select, [role=\"slider\"], [contenteditable=\"true\"]")) {
        lastTrailPoint = null;
        return;
      }

      const point = { x: event.clientX, y: event.clientY };
      if (lastTrailPoint) {
        trails.push({ fromX: lastTrailPoint.x, fromY: lastTrailPoint.y, toX: point.x, toY: point.y, startedAt: performance.now() });
        if (trails.length > maxTrails) trails.splice(0, trails.length - maxTrails);
        requestDraw();
      }
      lastTrailPoint = point;
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("click", click, { passive: true });
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", click);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return <canvas className="click-spark" ref={canvasRef} aria-hidden="true" />;
}
