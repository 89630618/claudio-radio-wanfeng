import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type CompanionModelProps = {
  isPlaying: boolean;
  onReady: () => void;
};

export function CompanionModel({ isPlaying, onReady }: CompanionModelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(isPlaying);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(25, 1, 0.1, 30);
    camera.position.set(0, 0.2, 3.8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 520 ? 1.2 : 1.55));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    host.appendChild(renderer.domElement);

    const coat = new THREE.MeshStandardMaterial({ color: 0x242a27, roughness: 0.98, flatShading: true });
    const warmCoat = new THREE.MeshStandardMaterial({ color: 0x4a5148, roughness: 0.96, flatShading: true });
    const headCoat = new THREE.MeshStandardMaterial({ color: 0x242a27, roughness: 0.98 });
    const muzzleCoat = new THREE.MeshStandardMaterial({ color: 0x4a5148, roughness: 0.96 });
    const bodyCoat = new THREE.MeshStandardMaterial({ color: 0x222925, roughness: 0.96 });
    const chestCoat = new THREE.MeshStandardMaterial({ color: 0x3d4941, roughness: 0.97 });
    const pawCoat = new THREE.MeshStandardMaterial({ color: 0x3b4740, roughness: 0.96 });
    const earInner = new THREE.MeshStandardMaterial({ color: 0x6f746a, roughness: 1 });
    const eye = new THREE.MeshStandardMaterial({ color: 0x080b09, roughness: 0.18, metalness: 0.12 });
    const eyeGlint = new THREE.MeshBasicMaterial({ color: 0xdce9df });
    const nose = new THREE.MeshStandardMaterial({ color: 0x342f2d, roughness: 0.62, flatShading: true });
    const mint = new THREE.MeshStandardMaterial({
      color: 0x69c98a,
      emissive: 0x24583b,
      emissiveIntensity: 0.3,
      roughness: 0.36,
      metalness: 0.08,
      flatShading: true
    });

    const rig = new THREE.Group();
    const headRig = new THREE.Group();
    const ears = new THREE.Group();
    scene.add(rig);
    rig.add(headRig);

    const addShape = (
      parent: THREE.Object3D,
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      position: THREE.Vector3Tuple,
      scale: THREE.Vector3Tuple,
      rotation: THREE.EulerTuple = [0, 0, 0]
    ) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      mesh.rotation.set(...rotation);
      parent.add(mesh);
      return mesh;
    };

    const body = addShape(rig, new THREE.SphereGeometry(0.72, 20, 16), bodyCoat, [0.02, -0.99, -0.1], [0.94, 1.08, 0.82]);
    addShape(rig, new THREE.SphereGeometry(0.44, 18, 14), chestCoat, [0.01, -0.94, 0.48], [0.88, 1.08, 0.42]);
    const tag = addShape(rig, new THREE.IcosahedronGeometry(0.12, 1), mint, [0.03, -0.47, 0.69], [0.5, 0.65, 0.22], [0, 0, -0.16]);

    addShape(headRig, new THREE.SphereGeometry(0.65, 24, 18), headCoat, [0, 0.1, 0.03], [1.07, 0.92, 0.86]);
    addShape(headRig, new THREE.SphereGeometry(0.34, 16, 12), muzzleCoat, [0.02, -0.07, 0.54], [0.8, 0.52, 0.23]);
    addShape(headRig, new THREE.IcosahedronGeometry(0.18, 1), warmCoat, [-0.05, 0.34, 0.42], [0.72, 0.82, 0.25], [0.12, 0.1, 0.08]);

    const leftEar = addShape(ears, new THREE.SphereGeometry(0.31, 14, 10), headCoat, [-0.43, 0.46, -0.03], [1.08, 0.7, 0.5], [0.12, -0.08, -0.3]);
    const rightEar = addShape(ears, new THREE.SphereGeometry(0.31, 14, 10), headCoat, [0.43, 0.45, -0.03], [1.08, 0.7, 0.5], [0.12, 0.08, 0.3]);
    addShape(ears, new THREE.SphereGeometry(0.21, 12, 9), earInner, [-0.43, 0.46, 0.17], [0.88, 0.45, 0.16], [0.12, -0.08, -0.3]);
    addShape(ears, new THREE.SphereGeometry(0.21, 12, 9), earInner, [0.43, 0.45, 0.17], [0.88, 0.45, 0.16], [0.12, 0.08, 0.3]);
    headRig.add(ears);

    const leftEye = addShape(headRig, new THREE.SphereGeometry(0.078, 10, 8), eye, [-0.25, 0.11, 0.56], [1, 1, 0.48]);
    const rightEye = addShape(headRig, new THREE.SphereGeometry(0.078, 10, 8), eye, [0.25, 0.11, 0.56], [1, 1, 0.48]);
    const leftGlint = addShape(headRig, new THREE.SphereGeometry(0.018, 6, 5), eyeGlint, [-0.272, 0.142, 0.603], [1, 1, 0.32]);
    const rightGlint = addShape(headRig, new THREE.SphereGeometry(0.018, 6, 5), eyeGlint, [0.228, 0.142, 0.603], [1, 1, 0.32]);
    addShape(headRig, new THREE.IcosahedronGeometry(0.055, 1), nose, [0, -0.07, 0.7], [1.1, 0.66, 0.35], [0.04, 0, 0]);
    addShape(headRig, new THREE.CapsuleGeometry(0.009, 0.05, 4, 6), nose, [0, -0.145, 0.67], [1, 0.9, 0.35]);

    const paws = new THREE.Group();
    rig.add(paws);
    addShape(paws, new THREE.SphereGeometry(0.13, 12, 9), pawCoat, [-0.16, -0.51, 0.87], [0.98, 0.62, 0.4], [0, 0, 0.12]);
    addShape(paws, new THREE.SphereGeometry(0.13, 12, 9), pawCoat, [0.17, -0.49, 0.87], [0.98, 0.62, 0.4], [0, 0, -0.1]);

    scene.add(new THREE.HemisphereLight(0xf3efe4, 0x111512, 2.05));
    const key = new THREE.DirectionalLight(0xf6f1e9, 2.4);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x5fe69a, 1.15);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    rig.position.set(0.02, 0.08, 0);
    rig.rotation.y = -0.16;

    let frame = 0;
    let hasRendered = false;
    let resetTimer = 0;
    let targetRigX = 0;
    let targetRigY = -0.16;
    let targetHeadX = 0;
    let targetHeadY = 0;
    let targetHeadOffsetX = 0;
    let targetEyeX = 0;
    let targetEyeY = 0;
    let eyeOffsetX = 0;
    let eyeOffsetY = 0;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      renderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false);
      camera.aspect = Math.max(1, bounds.width) / Math.max(1, bounds.height);
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const dialog = host.closest(".host-profile-dialog") ?? host;
    const move = (event: PointerEvent) => {
      if (reducedMotion) return;
      window.clearTimeout(resetTimer);
      const bounds = dialog.getBoundingClientRect();
      const px = THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width - 0.5, -1, 1);
      const py = THREE.MathUtils.clamp((event.clientY - bounds.top) / bounds.height - 0.5, -1, 1);
      targetRigY = -0.16 + px * THREE.MathUtils.degToRad(3);
      targetRigX = py * THREE.MathUtils.degToRad(2);
      targetHeadY = px * THREE.MathUtils.degToRad(16);
      targetHeadX = py * THREE.MathUtils.degToRad(5);
      targetHeadOffsetX = px * 0.055;
      targetEyeX = px * 0.12;
      targetEyeY = -py * 0.055;
    };
    const leave = () => {
      resetTimer = window.setTimeout(() => {
        targetRigX = 0;
        targetRigY = -0.16;
        targetHeadX = 0;
        targetHeadY = 0;
        targetHeadOffsetX = 0;
        targetEyeX = 0;
        targetEyeY = 0;
      }, 500);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("blur", leave);

    const clock = new THREE.Clock();
    const draw = () => {
      const elapsed = clock.getElapsedTime();
      const playing = isPlayingRef.current && !reducedMotion;
      rig.rotation.x += (targetRigX - rig.rotation.x) * 0.05;
      rig.rotation.y += (targetRigY - rig.rotation.y) * 0.05;
      headRig.rotation.x += (targetHeadX - headRig.rotation.x) * 0.075;
      headRig.rotation.y += (targetHeadY - headRig.rotation.y) * 0.075;
      headRig.position.x += (targetHeadOffsetX - headRig.position.x) * 0.075;
      eyeOffsetX += (targetEyeX - eyeOffsetX) * 0.14;
      eyeOffsetY += (targetEyeY - eyeOffsetY) * 0.14;
      leftEye.position.set(-0.25 + eyeOffsetX, 0.11 + eyeOffsetY, 0.56);
      rightEye.position.set(0.25 + eyeOffsetX, 0.11 + eyeOffsetY, 0.56);
      leftGlint.position.set(-0.272 + eyeOffsetX, 0.142 + eyeOffsetY, 0.603);
      rightGlint.position.set(0.228 + eyeOffsetX, 0.142 + eyeOffsetY, 0.603);
      body.scale.y = 1.08 + (reducedMotion ? 0 : Math.sin(elapsed * 1.1) * 0.018);
      const blink = reducedMotion || Math.sin(elapsed * 0.91 + Math.sin(elapsed * 0.17) * 2) < 0.986 ? 1 : 0.14;
      leftEye.scale.y = blink;
      rightEye.scale.y = blink;
      ears.rotation.z = playing ? Math.sin(elapsed * 2.25) * 0.025 : Math.sin(elapsed * 0.62) * 0.006;
      tag.scale.y = 1.1 + (playing ? Math.sin(elapsed * 2.25) * 0.06 : Math.sin(elapsed * 1.1) * 0.02);
      mint.emissiveIntensity = playing ? 0.48 + Math.sin(elapsed * 2.25) * 0.08 : 0.3;
      renderer.render(scene, camera);
      if (!hasRendered) {
        hasRendered = true;
        setIsReady(true);
        onReady();
      }
      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(resetTimer);
      observer.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", leave);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      [coat, warmCoat, headCoat, muzzleCoat, bodyCoat, chestCoat, pawCoat, earInner, eye, eyeGlint, nose, mint].forEach((material) => material.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return <div className={`companion-model companion-model--night-creature${isReady ? " is-ready" : ""}`} ref={hostRef} aria-label="Claudio 的原创夜行陪伴宠物" />;
}
