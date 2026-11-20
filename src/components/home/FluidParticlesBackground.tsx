import { useEffect, useRef } from "react";

interface FluidParticlesBackgroundProps {
  particleCount?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
}

// Improved Perlin noise field from the supplied background, kept module-scoped
// so its permutation table is created once rather than on every React render.
function createNoise() {
  const permutation = [
    151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,
    234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
    134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,
    1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,
    124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,
    154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,
    242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,
    50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,
  ];
  const p = new Array<number>(512);
  for (let i = 0; i < 256; i++) p[256 + i] = p[i] = permutation[i];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t: number, a: number, b: number) => a + t * (b - a);
  const grad = (hash: number, x: number, y: number, z: number) => {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  return (x: number, y: number, z: number) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
    const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(w,
      lerp(v,
        lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
        lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
      lerp(v,
        lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
        lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
  };
}

const sampleNoise = createNoise();

function makeParticles(width: number, height: number, count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: .55 + Math.random() * .85,
    velocityX: 0,
    velocityY: 0,
    life: Math.random() * 180,
    maxLife: 180 + Math.random() * 100,
  }));
}

export default function FluidParticlesBackground({
  particleCount = 560,
  className = "",
}: FluidParticlesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1, height = 1, dpr = 1;
    let particles: Particle[] = [];
    let frame = 0, lastFrame = 0, disposed = false;
    let visible = !document.hidden;
    let initialized = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, rect.width);
      const nextHeight = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const nextCanvasWidth = Math.max(1, Math.round(nextWidth * dpr));
      const nextCanvasHeight = Math.max(1, Math.round(nextHeight * dpr));
      if (canvas.width !== nextCanvasWidth || canvas.height !== nextCanvasHeight) {
        const scaleX = width > 1 ? nextWidth / width : 1;
        const scaleY = height > 1 ? nextHeight / height : 1;
        canvas.width = nextCanvasWidth;
        canvas.height = nextCanvasHeight;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (initialized) {
          particles.forEach(particle => { particle.x *= scaleX; particle.y *= scaleY; });
        }
      }
      width = nextWidth;
      height = nextHeight;
      const areaCount = Math.round((width * height) / 330);
      const targetCount = Math.min(particleCount, Math.max(150, areaCount));
      if (!initialized || particles.length !== targetCount) {
        particles = makeParticles(width, height, targetCount);
        initialized = true;
      }
    };

    const draw = (now: number) => {
      if (disposed || !visible) return;
      if (now - lastFrame < 20) {
        frame = requestAnimationFrame(draw);
        return;
      }
      lastFrame = now;
      // Fade previous particle marks while preserving transparency over the card material.
      context.globalCompositeOperation = "destination-out";
      context.fillStyle = "rgba(0, 0, 0, 0.12)";
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = "source-over";

      const time = now * .0001;
      for (const particle of particles) {
        particle.life += 1;
        if (particle.life > particle.maxLife) {
          particle.life = 0;
          particle.x = Math.random() * width;
          particle.y = Math.random() * height;
        }
        const opacity = Math.sin((particle.life / particle.maxLife) * Math.PI) * .115;
        const n = sampleNoise(particle.x * .003, particle.y * .003, time);
        const angle = n * Math.PI * 4;
        // Same noise-steered flow as the supplied implementation, with a calmer
        // profile-card speed so it reads as atmosphere rather than visual static.
        particle.velocityX = Math.cos(angle) * .72;
        particle.velocityY = Math.sin(angle) * .72;
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        if (particle.x < 0) particle.x = width;
        else if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        else if (particle.y > height) particle.y = 0;

        context.fillStyle = `rgba(211, 222, 230, ${opacity})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      if (!reducedMotion.matches) frame = requestAnimationFrame(draw);
    };

    const start = () => {
      if (disposed || !visible) return;
      cancelAnimationFrame(frame);
      lastFrame = 0;
      frame = requestAnimationFrame(draw);
    };
    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) start();
      else cancelAnimationFrame(frame);
    };
    const onMotionChange = () => start();

    resize();
    const observer = new ResizeObserver(() => { resize(); if (reducedMotion.matches) start(); });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotion.addEventListener("change", onMotionChange);
    start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, [particleCount]);

  return <canvas ref={canvasRef} className={`jayver-profile-fluid ${className}`} aria-hidden="true" />;
}
