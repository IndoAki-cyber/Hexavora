import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import gsap from "gsap";
import HexaLogo, { Wordmark } from "./boot/HexaLogo";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

/**
 * PHASE 2 — HexaVora 3D Core.
 *
 * One engineered artifact: chrome H (extruded, bevelled) inside a gunmetal
 * hex frame, wrapped by metallic rings, neon energy arcs (cyan/violet),
 * an icosahedral network globe with glowing nodes, and sparse atmospheric
 * particles. The graph is layered so Phase 4 can drive `root` with
 * ScrollTrigger while `coreSpin` keeps rotating independently.
 *
 * Vanilla three.js (no R3F): full disposal control, zero React-context
 * machinery in the render path, deterministic pause/fallback behavior.
 */

const COL = {
  cyan: 0x3ee7ff,
  violet: 0x9a6bff,
  teal: 0x2dd6a9,
  chrome: 0xe9eff8,
  gunmetal: 0x3a4763,
  steel: 0xa7b8cd,
  fog: 0x04070d,
};

const CAM_BASE_Z = 10.4;

/* ------------------------------------------------------------------ */
/* builders                                                            */
/* ------------------------------------------------------------------ */

function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** Solid H profile, extruded with machined bevels — real depth, not a flat SVG. */
function createHGeometry(): THREE.ExtrudeGeometry {
  const W = 1.1; // half width
  const Hh = 1.5; // half height
  const B = 0.33; // half bar width
  const C = 0.31; // half crossbar height
  const s = new THREE.Shape();
  s.moveTo(-W, Hh);
  s.lineTo(-B, Hh);
  s.lineTo(-B, C);
  s.lineTo(B, C);
  s.lineTo(B, Hh);
  s.lineTo(W, Hh);
  s.lineTo(W, -Hh);
  s.lineTo(B, -Hh);
  s.lineTo(B, -C);
  s.lineTo(-B, -C);
  s.lineTo(-B, -Hh);
  s.lineTo(-W, -Hh);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.11,
    bevelSize: 0.08,
    bevelSegments: 4,
    steps: 1,
  });
  geo.translate(0, 0, -0.25);
  return geo;
}

function hexPath(r: number, target: THREE.Shape | THREE.Path): void {
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 3;
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    if (i === 0) target.moveTo(x, y);
    else target.lineTo(x, y);
  }
  target.closePath();
}

/** Hex frame ring surrounding the H — ties the core to the ring system. */
function createHexFrameGeometry(): THREE.ExtrudeGeometry {
  const outer = new THREE.Shape();
  hexPath(2.4, outer);
  const hole = new THREE.Path();
  hexPath(2.16, hole);
  outer.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
    steps: 1,
  });
  geo.translate(0, 0, -0.08);
  return geo;
}

interface SceneHandles {
  renderOnce: () => void;
  cleanup: () => void;
}

function buildScene(
  mount: HTMLDivElement,
  opts: { reduced: boolean; isMobile: boolean; finePointer: boolean; onFirstFrame: () => void }
): SceneHandles {
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  /* ---------- renderer / scene / camera ---------- */

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.isMobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = "hero-canvas";
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COL.fog, 0.02);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  camera.position.set(0, 0.35, CAM_BASE_Z);
  camera.lookAt(0, 0, 0);

  /* ---------- reflections: procedural studio env (no HDR download) ---------- */

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  scene.environment = envRT.texture;
  room.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
      else m.dispose();
    }
  });

  /* ---------- materials ---------- */

  const glowTex = track(makeGlowTexture());

  const chrome = track(
    new THREE.MeshPhysicalMaterial({
      color: COL.chrome,
      metalness: 1.0,
      roughness: 0.16,
      envMapIntensity: 1.3,
      clearcoat: 0.55,
      clearcoatRoughness: 0.22,
    })
  );
  const gunmetal = track(
    new THREE.MeshStandardMaterial({
      color: COL.gunmetal,
      metalness: 0.92,
      roughness: 0.34,
      envMapIntensity: 0.95,
    })
  );
  const steel = track(
    new THREE.MeshStandardMaterial({
      color: COL.steel,
      metalness: 1.0,
      roughness: 0.26,
      envMapIntensity: 1.05,
    })
  );
  const edgeGlow = track(
    new THREE.LineBasicMaterial({
      color: COL.cyan,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const neonCyan = track(
    new THREE.MeshBasicMaterial({
      color: COL.cyan,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  const neonCyanHalo = track(
    new THREE.MeshBasicMaterial({
      color: COL.cyan,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  const neonViolet = track(
    new THREE.MeshBasicMaterial({
      color: COL.violet,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  const neonVioletHalo = track(
    new THREE.MeshBasicMaterial({
      color: COL.violet,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );

  /* ---------- artifact graph ---------- */

  const root = new THREE.Group(); // Phase 4 ScrollTrigger target
  const rig = new THREE.Group(); // pointer parallax
  root.add(rig);
  scene.add(root);

  // — core: H + hex frame + vertex studs —
  const coreWrap = new THREE.Group(); // gsap intro pose
  const coreSpin = new THREE.Group(); // continuous rotation
  coreWrap.add(coreSpin);
  rig.add(coreWrap);

  const hGeo = track(createHGeometry());
  const hMesh = new THREE.Mesh(hGeo, chrome);
  coreSpin.add(hMesh);

  const hEdges = track(new THREE.EdgesGeometry(hGeo, 24));
  coreSpin.add(new THREE.LineSegments(hEdges, edgeGlow));

  const hexGroup = new THREE.Group();
  coreSpin.add(hexGroup);
  const hexGeo = track(createHexFrameGeometry());
  hexGroup.add(new THREE.Mesh(hexGeo, gunmetal));

  const studGeo = track(new THREE.CylinderGeometry(0.055, 0.055, 0.36, 10));
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 3;
    const stud = new THREE.Mesh(studGeo, steel);
    stud.position.set(Math.cos(a) * 2.28, Math.sin(a) * 2.28, 0);
    stud.rotation.x = Math.PI / 2;
    hexGroup.add(stud);
  }

  // — metallic rings + dashed orbit —
  const ringsGroup = new THREE.Group();
  rig.add(ringsGroup);

  const ringAGeo = track(new THREE.TorusGeometry(3.2, 0.022, 8, 140));
  const ringA = new THREE.Mesh(ringAGeo, gunmetal);
  ringA.rotation.set(1.25, 0.2, 0);
  ringsGroup.add(ringA);

  const ringBGeo = track(new THREE.TorusGeometry(4.15, 0.014, 8, 180));
  const ringB = new THREE.Mesh(ringBGeo, steel);
  ringB.rotation.set(-1.05, 0, 0.4);
  ringsGroup.add(ringB);

  const orbitPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    orbitPts.push(new THREE.Vector3(Math.cos(a) * 4.6, Math.sin(a) * 4.6, 0));
  }
  const orbitGeo = track(new THREE.BufferGeometry().setFromPoints(orbitPts));
  const orbitMat = track(
    new THREE.LineDashedMaterial({
      color: COL.cyan,
      transparent: true,
      opacity: 0.38,
      dashSize: 0.22,
      gapSize: 0.16,
      fog: false,
    })
  );
  const orbit = new THREE.LineLoop(orbitGeo, orbitMat);
  orbit.computeLineDistances();
  orbit.rotation.x = 1.45;
  ringsGroup.add(orbit);

  // — curved neon energy bands (with soft halo + riding endpoint nodes) —
  const spriteMat = (color: number, opacity: number) =>
    track(
      new THREE.SpriteMaterial({
        map: glowTex,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );

  const makeArc = (
    radius: number,
    arc: number,
    core: THREE.MeshBasicMaterial,
    halo: THREE.MeshBasicMaterial,
    nodeColor: number,
    tilt: THREE.Euler
  ): THREE.Group => {
    const grp = new THREE.Group();
    grp.rotation.copy(tilt);
    const spin = new THREE.Group();
    grp.add(spin);

    const coreGeo = track(new THREE.TorusGeometry(radius, 0.035, 10, 120, arc));
    spin.add(new THREE.Mesh(coreGeo, core));
    const haloGeo = track(new THREE.TorusGeometry(radius, 0.1, 10, 120, arc));
    spin.add(new THREE.Mesh(haloGeo, halo));

    for (const a of [0, arc]) {
      const sp = new THREE.Sprite(spriteMat(nodeColor, 0.75));
      sp.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      sp.scale.setScalar(0.34);
      spin.add(sp);
    }
    ringsGroup.add(grp);
    return spin;
  };

  const arcCyan = makeArc(3.55, 2.3, neonCyan, neonCyanHalo, COL.cyan, new THREE.Euler(1.2, 0, 0.35));
  const arcViolet = makeArc(3.8, 1.7, neonViolet, neonVioletHalo, COL.violet, new THREE.Euler(-1.0, 0.4, -0.5));

  // — network globe: icosahedral lattice + vertex points + glowing nodes —
  const globe = new THREE.Group();
  rig.add(globe);

  const icoGeo = track(new THREE.IcosahedronGeometry(3.9, 1));
  const latticeMat = track(
    new THREE.LineBasicMaterial({ color: 0x8fd4e8, transparent: true, opacity: 0.07, fog: false })
  );
  globe.add(new THREE.LineSegments(track(new THREE.EdgesGeometry(icoGeo, 1)), latticeMat));

  const vertexMat = track(
    new THREE.PointsMaterial({
      color: COL.cyan,
      size: 0.045,
      map: glowTex,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  globe.add(new THREE.Points(icoGeo, vertexMat));

  for (let i = 0; i < 10; i++) {
    const y = 1 - (i / 9) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * 2.399963;
    const node = new THREE.Sprite(spriteMat(i % 3 === 0 ? COL.violet : COL.cyan, 0.5));
    node.position.set(Math.cos(th) * r * 3.95, y * 3.95, Math.sin(th) * r * 3.95);
    node.scale.setScalar(0.2 + (i % 3) * 0.07);
    globe.add(node);
  }

  // — atmospheric particles (sparse shell) —
  const pCount = opts.isMobile ? 110 : 220;
  const pPos = new Float32Array(pCount * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pCount; i++) {
    v.randomDirection().multiplyScalar(5.5 + Math.random() * 4.2);
    pPos[i * 3] = v.x;
    pPos[i * 3 + 1] = v.y;
    pPos[i * 3 + 2] = v.z;
  }
  const pGeo = track(new THREE.BufferGeometry());
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const pMat = track(
    new THREE.PointsMaterial({
      color: 0xbfe9ff,
      size: 0.05,
      map: glowTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  const particles = new THREE.Points(pGeo, pMat);
  rig.add(particles);

  /* ---------- lights ---------- */

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(5, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(COL.violet, 2.3);
  rim.position.set(-7, 4, -6);
  scene.add(rim);
  const energy = new THREE.PointLight(COL.cyan, 42, 40, 2);
  energy.position.set(3.5, -2.5, 4.5);
  scene.add(energy);
  scene.add(new THREE.HemisphereLight(0x223448, 0x05070c, 0.5));

  /* ---------- sizing ---------- */

  const applyFit = () => {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.position.z =
      camera.aspect >= 1 ? CAM_BASE_Z : Math.min(14.2, CAM_BASE_Z / (camera.aspect * 0.94));
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  applyFit();

  const renderOnce = () => renderer.render(scene, camera);

  /* ---------- reduced motion: composed still frame, no loop ---------- */

  if (opts.reduced) {
    coreWrap.rotation.y = -0.38;
    ringA.rotation.z = 0.5;
    ringB.rotation.z = -0.7;
    globe.rotation.y = 0.4;
    renderOnce();
    opts.onFirstFrame();

    const ro = new ResizeObserver(() => {
      applyFit();
      renderOnce();
    });
    ro.observe(mount);

    return {
      renderOnce,
      cleanup: () => {
        ro.disconnect();
        disposables.forEach((d) => d.dispose());
        envRT.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      },
    };
  }

  /* ---------- intro choreography (gsap) ---------- */

  let spinLive = false;
  const intro = gsap.timeline({
    defaults: { ease: "power3.out" },
    onComplete: () => {
      spinLive = true;
    },
  });
  intro.fromTo(camera.position, { z: camera.position.z + 1.5 }, { z: camera.position.z, duration: 2.0, ease: "power2.out" }, 0);
  intro.fromTo(root.scale, { x: 0.8, y: 0.8, z: 0.8 }, { x: 1, y: 1, z: 1, duration: 1.5 }, 0);
  intro.fromTo(coreWrap.rotation, { y: -1.15 }, { y: 0, duration: 1.9, ease: "power3.inOut" }, 0);
  intro.fromTo(ringsGroup.scale, { x: 0.72, y: 0.72, z: 0.72 }, { x: 1, y: 1, z: 1, duration: 1.6 }, 0.1);
  intro.fromTo(globe.scale, { x: 0.78, y: 0.78, z: 0.78 }, { x: 1, y: 1, z: 1, duration: 1.6 }, 0.15);

  /* ---------- pointer parallax ---------- */

  const pointer = { tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (opts.finePointer) window.addEventListener("pointermove", onPointer, { passive: true });

  /* ---------- render loop ---------- */

  const clock = new THREE.Clock();
  let t = 0;
  let raf = 0;
  let inView = true;
  let firstFrame = false;

  const io = new IntersectionObserver(
    (entries) => {
      inView = entries[0]?.isIntersecting ?? true;
    },
    { threshold: 0.02 }
  );
  io.observe(mount);

  const ro = new ResizeObserver(applyFit);
  ro.observe(mount);

  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (document.hidden || !inView) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;

    if (spinLive) {
      coreSpin.rotation.y += dt * 0.22;
      coreSpin.rotation.x = Math.sin(t * 0.45) * 0.045;
      hexGroup.rotation.z -= dt * 0.05;
      ringA.rotation.z += dt * 0.06;
      ringB.rotation.z -= dt * 0.045;
      orbit.rotation.z += dt * 0.02;
      arcCyan.rotation.z += dt * 0.055;
      arcViolet.rotation.z -= dt * 0.04;
      globe.rotation.y -= dt * 0.05;
      particles.rotation.y += dt * 0.008;
      neonCyan.opacity = 0.72 + 0.18 * Math.sin(t * 1.25);
      neonViolet.opacity = 0.72 + 0.18 * Math.sin(t * 1.25 + 2.1);
    }

    rig.rotation.y += (pointer.tx * 0.055 - rig.rotation.y) * 0.06;
    rig.rotation.x += (-pointer.ty * 0.04 - rig.rotation.x) * 0.06;

    renderer.render(scene, camera);

    if (!firstFrame) {
      firstFrame = true;
      opts.onFirstFrame();
    }
  };
  raf = requestAnimationFrame(loop);

  return {
    renderOnce,
    cleanup: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      if (opts.finePointer) window.removeEventListener("pointermove", onPointer);
      intro.kill();
      disposables.forEach((d) => d.dispose());
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export default function Hero() {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || failed) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    let handles: SceneHandles | null = null;
    try {
      handles = buildScene(mount, {
        reduced,
        isMobile,
        finePointer,
        onFirstFrame: () => canvasRef.current?.classList.add("is-live"),
      });
      canvasRef.current = mount.querySelector("canvas");
    } catch {
      setFailed(true);
      return;
    }

    const canvas = canvasRef.current;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    canvas?.addEventListener("webglcontextlost", onContextLost);

    return () => {
      canvas?.removeEventListener("webglcontextlost", onContextLost);
      canvasRef.current = null;
      handles?.cleanup();
    };
  }, [reduced, failed]);

  return (
    <section className="relative h-[100svh] min-h-[540px] overflow-hidden bg-void">
      {/* layered atmosphere behind the artifact */}
      <div aria-hidden="true" className="hv-glow-hero pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="hv-grid pointer-events-none absolute inset-0" />

      {/* 3D stage (canvas appended imperatively) / static fallback */}
      <div
        ref={mountRef}
        className="absolute inset-0"
        role="img"
        aria-label="HexaVora 3D emblem — a chrome H core inside a hexagonal frame, surrounded by metallic rings, cyan and violet energy arcs, and a glowing network globe"
      >
        {failed && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-8">
            <HexaLogo size={180} />
            <Wordmark className="text-2xl" />
            <p className="text-[9px] tracking-[0.3em] text-dim">
              3D CORE UNAVAILABLE · STATIC EMBLEM MODE
            </p>
          </div>
        )}
      </div>

      {/* vignette above the stage */}
      <div aria-hidden="true" className="hv-vignette pointer-events-none absolute inset-0" />

      {/* system chrome */}
      <span aria-hidden="true" className="pointer-events-none absolute left-4 top-4 z-20 h-4 w-4 border-l-2 border-t-2 border-hv-cyan/50 sm:left-6 sm:top-6" />
      <span aria-hidden="true" className="pointer-events-none absolute right-4 top-4 z-20 h-4 w-4 border-r-2 border-t-2 border-hv-cyan/50 sm:right-6 sm:top-6" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-4 left-4 z-20 h-4 w-4 border-b-2 border-l-2 border-hv-cyan/50 sm:bottom-6 sm:left-6" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-4 right-4 z-20 h-4 w-4 border-b-2 border-r-2 border-hv-cyan/50 sm:bottom-6 sm:right-6" />

      <div className="pointer-events-none absolute bottom-6 left-6 z-20 hidden items-center gap-3 sm:flex sm:left-8 sm:bottom-8">
        <span className="anim-pulse-soft h-1.5 w-1.5 rounded-full bg-hv-ok shadow-[0_0_8px_rgba(87,232,141,0.9)]" />
        <span className="text-[8.5px] tracking-[0.32em] text-dim/85">
          HEXAVORA CORE // ARTIFACT H-01 ONLINE
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-6 right-6 z-20 hidden text-[8.5px] tracking-[0.32em] text-dim/60 sm:block sm:right-8 sm:bottom-8">
        REV 6.2 · CHROME LATTICE
      </div>
    </section>
  );
}
