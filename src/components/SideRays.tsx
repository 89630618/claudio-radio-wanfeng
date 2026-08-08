import { Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef, useState } from "react";

type SideRaysProps = {
  speed?: number;
  rayColor1?: string;
  rayColor2?: string;
  intensity?: number;
  spread?: number;
  saturation?: number;
  blend?: number;
  falloff?: number;
  opacity?: number;
};

function hexToRgb(hex: string) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return match
    ? [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255]
    : [1, 1, 1];
}

export function SideRays({
  speed = 0.22,
  rayColor1 = "#415967",
  rayColor2 = "#58a982",
  intensity = 0.5,
  spread = 1.1,
  saturation = 0.48,
  blend = 0.46,
  falloff = 1.35,
  opacity = 0.4
}: SideRaysProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVisible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), alpha: true });
    const gl = renderer.gl;
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    container.replaceChildren(gl.canvas);

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: [1, 1] },
      iSpeed: { value: speed },
      iRayColor1: { value: hexToRgb(rayColor1) },
      iRayColor2: { value: hexToRgb(rayColor2) },
      iIntensity: { value: intensity },
      iSpread: { value: spread },
      iSaturation: { value: saturation },
      iBlend: { value: blend },
      iFalloff: { value: falloff },
      iOpacity: { value: opacity }
    };

    const program = new Program(gl, {
      vertex: `attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }`,
      fragment: `precision highp float;
        uniform float iTime, iSpeed, iIntensity, iSpread, iSaturation, iBlend, iFalloff, iOpacity;
        uniform vec2 iResolution;
        uniform vec3 iRayColor1, iRayColor2;
        float strength(vec2 source, vec2 direction, vec2 coord, float a, float b, float speedValue) {
          vec2 sourceToCoord = coord - source;
          float cosine = dot(normalize(sourceToCoord), direction);
          return clamp((0.45 + 0.15 * sin(cosine * a + iTime * speedValue)) + (0.3 + 0.2 * cos(-cosine * b + iTime * speedValue)), 0.0, 1.0) * clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
        }
        float beam(vec2 source, vec2 direction, vec2 coord, float a, float b, float speedValue) {
          float distance = length(coord - source) / iResolution.y;
          return strength(source, direction, coord, a, b, speedValue) / pow(max(distance, 0.35), iFalloff);
        }
        void main() {
          vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);
          float halfSpread = iSpread * 0.275;
          float rightBeam = beam(vec2(iResolution.x * 1.3, iResolution.y * 0.32), normalize(vec2(cos(3.141593 + halfSpread), sin(3.141593 + halfSpread))), coord, 36.2214, 21.11349, iSpeed);
          float leftBeam = beam(vec2(-iResolution.x * 0.3, iResolution.y * 0.64), normalize(vec2(cos(halfSpread), sin(halfSpread))), coord, 22.3991, 18.0234, iSpeed * 0.82);
          float topBeam = beam(vec2(iResolution.x * 0.42, -iResolution.y * 0.34), normalize(vec2(cos(1.570796 + halfSpread), sin(1.570796 + halfSpread))), coord, 41.914, 15.713, iSpeed * 0.66);
          float bottomBeam = beam(vec2(iResolution.x * 0.62, iResolution.y * 1.34), normalize(vec2(cos(-1.570796 - halfSpread), sin(-1.570796 - halfSpread))), coord, 18.337, 33.619, iSpeed * 0.54);
          float energy = (rightBeam + leftBeam + topBeam + bottomBeam) * 0.25;
          vec4 color = vec4(mix(iRayColor1, iRayColor2, iBlend), 1.0) * energy;
          color.rgb *= iIntensity * 0.26;
          float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          color.rgb = mix(vec3(gray), color.rgb, iSaturation);
          color.a = max(color.r, max(color.g, color.b)) * iOpacity;
          gl_FragColor = color;
        }`,
      uniforms
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const updateSize = () => {
      const { clientWidth: width, clientHeight: height } = container;
      renderer.setSize(width, height);
      uniforms.iResolution.value = [width * renderer.dpr, height * renderer.dpr];
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    let animationFrame = 0;
    const render = (time: number) => {
      uniforms.iTime.value = time * 0.001;
      renderer.render({ scene: mesh });
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updateSize);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      container.replaceChildren();
    };
  }, [blend, falloff, intensity, isVisible, opacity, rayColor1, rayColor2, saturation, speed, spread]);

  return <div ref={containerRef} className="side-rays-reactbits" aria-hidden="true" />;
}
