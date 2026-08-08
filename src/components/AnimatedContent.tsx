import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";

type AnimatedContentProps = {
  children: ReactNode;
  className?: string;
  distance?: number;
  duration?: number;
  delay?: number;
  initialOpacity?: number;
  scale?: number;
};

export function AnimatedContent({
  children,
  className,
  distance = 32,
  duration = 0.56,
  delay = 0,
  initialOpacity = 0.35,
  scale = 0.97,
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animation = gsap.fromTo(
      element,
      { y: distance, opacity: initialOpacity, scale },
      { y: 0, opacity: 1, scale: 1, duration, delay, ease: "power3.out", overwrite: "auto" },
    );

    return () => {
      animation.kill();
    };
  }, [delay, distance, duration, initialOpacity, scale]);

  return <div ref={ref} className={className}>{children}</div>;
}
