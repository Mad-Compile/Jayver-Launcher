import { useEffect, useRef, useState } from "react";
import type { WebGLRenderer } from "three";

const vertexShader = `in vec3 position;
in vec2 uv;
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`;

const fragmentShader = `precision highp float;

uniform float uTime;
uniform float uAspect;
in vec2 vUv;
out vec4 outColor;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float radius) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h) - radius;
}

float sdExtruded(float d2, float z, float halfDepth) {
  vec2 w = vec2(d2, abs(z) - halfDepth);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
}

float ribbon(vec3 p, vec2 a, vec2 b, float radius, float depth) {
  return sdExtruded(sdCapsule(p.xy, a, b, radius), p.z, depth);
}

float mapScene(vec3 p) {
  vec3 q = p;
  q.xy += 0.014 * vec2(
    sin(p.y * 4.4 + uTime * 0.62),
    sin(p.x * 2.8 - uTime * 0.48)
  );
  q.z += 0.012 * sin(p.x * 5.2 + p.y * 3.1 + uTime * 0.8);

  float d = 1e4;

  // One connected J silhouette: stem, hook and upper blade are liquid geometry.
  d = smin(d, ribbon(q, vec2(0.58, 1.02), vec2(0.56, 0.18), 0.145, 0.095), 0.105);
  d = smin(d, ribbon(q, vec2(0.56, 0.18), vec2(0.44, -0.62), 0.145, 0.095), 0.105);
  d = smin(d, ribbon(q, vec2(0.44, -0.62), vec2(0.18, -0.91), 0.145, 0.095), 0.105);
  d = smin(d, ribbon(q, vec2(0.18, -0.91), vec2(-0.67, -0.70), 0.145, 0.095), 0.105);
  d = smin(d, ribbon(q, vec2(-0.66, 0.68), vec2(0.77, 1.38), 0.125, 0.09), 0.11);

  // Left streams flow into the hook and the blade.
  d = smin(d, ribbon(q, vec2(-4.8, -0.28), vec2(-2.8, -0.40), 0.115, 0.075), 0.13);
  d = smin(d, ribbon(q, vec2(-2.8, -0.40), vec2(-0.67, -0.70), 0.115, 0.075), 0.13);
  d = smin(d, ribbon(q, vec2(-4.8, 0.55), vec2(-2.8, 0.64), 0.095, 0.07), 0.105);
  d = smin(d, ribbon(q, vec2(-2.8, 0.64), vec2(-0.66, 0.68), 0.095, 0.07), 0.105);

  // Right streams fold back into the same continuous metallic form.
  d = smin(d, ribbon(q, vec2(4.8, 0.42), vec2(2.7, 0.58), 0.105, 0.075), 0.12);
  d = smin(d, ribbon(q, vec2(2.7, 0.58), vec2(0.77, 1.38), 0.105, 0.075), 0.12);
  d = smin(d, ribbon(q, vec2(4.8, -0.18), vec2(2.7, -0.16), 0.105, 0.07), 0.12);
  d = smin(d, ribbon(q, vec2(2.7, -0.16), vec2(0.68, 0.28), 0.105, 0.07), 0.12);

  // Low-amplitude surface undulation gives the chrome a molten, flowing finish.
  d += 0.009 * sin(q.x * 5.4 + q.y * 3.2 + uTime * 1.05)
             * sin(q.y * 7.1 - uTime * 0.72);
  return d;
}

vec3 calcNormal(vec3 p) {
  const float e = 0.0018;
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * mapScene(p + k.xyy * e) +
    k.yyx * mapScene(p + k.yyx * e) +
    k.yxy * mapScene(p + k.yxy * e) +
    k.xxx * mapScene(p + k.xxx * e)
  );
}

float softBox(vec3 r, vec3 center, vec3 spread) {
  vec3 delta = (r - center) / spread;
  return exp(-dot(delta, delta) * 1.8);
}

vec3 studioEnvironment(vec3 r) {
  vec3 horizon = mix(vec3(0.012, 0.015, 0.02), vec3(0.20, 0.23, 0.27),
                     smoothstep(-0.48, 0.56, r.y));
  float floorFade = 1.0 - smoothstep(-0.7, 0.0, r.y);
  horizon = mix(horizon, vec3(0.012, 0.014, 0.018), floorFade);

  float topStrip = softBox(r, vec3(-0.08, 0.91, 0.25), vec3(0.30, 0.10, 0.55));
  float leftStrip = softBox(r, vec3(-0.82, 0.18, 0.25), vec3(0.075, 0.48, 0.45));
  float rightStrip = softBox(r, vec3(0.82, 0.34, 0.25), vec3(0.09, 0.42, 0.5));
  float lowerStrip = softBox(r, vec3(0.05, -0.82, 0.3), vec3(0.42, 0.075, 0.5));

  horizon += vec3(1.0, 1.0, 1.0) * (topStrip * 1.65 + leftStrip * 1.15 +
                                      rightStrip * 1.3 + lowerStrip * 0.8);
  horizon += vec3(0.34, 0.40, 0.48) * pow(max(r.x, 0.0), 5.0) * 0.32;
  return horizon;
}

void main() {
  vec2 screen = (vUv - 0.5) * vec2(uAspect * 2.78, 2.78);
  vec3 rayOrigin = vec3(screen, 5.0);
  vec3 rayDirection = vec3(0.0, 0.0, -1.0);

  float travel = 0.0;
  float distanceToSurface = 0.0;
  bool hit = false;

  for (int i = 0; i < 72; i++) {
    vec3 p = rayOrigin + rayDirection * travel;
    distanceToSurface = mapScene(p);
    if (distanceToSurface < 0.0012) {
      hit = true;
      break;
    }
    if (travel > 8.0) break;
    travel += max(distanceToSurface * 0.82, 0.006);
  }

  if (!hit) {
    outColor = vec4(0.0);
    return;
  }

  vec3 p = rayOrigin + rayDirection * travel;
  vec3 normal = calcNormal(p);
  vec3 reflected = reflect(rayDirection, normal);
  vec3 environment = studioEnvironment(reflected);

  float facing = clamp(dot(normal, -rayDirection), 0.0, 1.0);
  float fresnel = pow(1.0 - facing, 4.0);
  vec3 keyLight = normalize(vec3(-0.42, 0.82, 0.62));
  float diffuse = max(dot(normal, keyLight), 0.0);
  float rim = pow(1.0 - facing, 2.2);

  vec3 chrome = environment * 1.12;
  chrome = mix(chrome, vec3(0.64, 0.69, 0.75), 0.12 + diffuse * 0.16);
  chrome += vec3(0.78, 0.84, 0.92) * rim * 0.24;
  chrome += vec3(0.92, 0.96, 1.0) * pow(max(dot(reflect(-keyLight, normal), -rayDirection), 0.0), 52.0) * 0.52;

  // Subtle travelling highlight: the surface remains the focus, not a glow effect.
  float sweep = exp(-pow((p.x - sin(uTime * 0.22) * 2.1) * 2.2, 2.0));
  chrome += vec3(0.55, 0.62, 0.72) * sweep * (0.045 + rim * 0.07);

  outColor = vec4(clamp(chrome, 0.0, 1.65), 1.0);
}
`;

type LiquidMetalMarkProps = { className?: string };

export default function LiquidMetalMark({ className = "" }: LiquidMetalMarkProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let renderer: WebGLRenderer | null = null;
    let frameTime = 0;
    let visible = !document.hidden;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let motionAllowed = !reducedMotion.matches;

    const onVisibility = () => { visible = !document.hidden; };
    const onMotionChange = (event: MediaQueryListEvent) => { motionAllowed = !event.matches; };
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotion.addEventListener?.("change", onMotionChange);

    const initialise = async () => {
      try {
        const THREE = await import("three");
        if (cancelled || !host) return;

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;

        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
          premultipliedAlpha: false,
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.className = "jayver-liquid-metal-canvas";
        renderer.domElement.setAttribute("aria-hidden", "true");
        host.appendChild(renderer.domElement);

        const uniforms = {
          uTime: { value: 0 },
          uAspect: { value: 2.6 },
        };
        const material = new THREE.ShaderMaterial({
          glslVersion: THREE.GLSL3,
          vertexShader,
          fragmentShader,
          uniforms,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          blending: THREE.NormalBlending,
        });
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        const resize = () => {
          const width = Math.max(1, host.clientWidth);
          const height = Math.max(1, host.clientHeight);
          renderer?.setSize(width, height, false);
          uniforms.uAspect.value = width / height;
        };
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        resize();

        let lastFrameTime = 0;
        renderer.setAnimationLoop((timestamp) => {
          if (!visible || !renderer) {
            lastFrameTime = 0;
            return;
          }
          const delta = lastFrameTime === 0 ? 0 : Math.min((timestamp - lastFrameTime) / 1000, 0.05);
          lastFrameTime = timestamp;
          if (motionAllowed) frameTime += delta;
          uniforms.uTime.value = frameTime;
          renderer.render(scene, camera);
        });

        const onContextLost = (event: Event) => {
          event.preventDefault();
          setSupported(false);
        };
        renderer.domElement.addEventListener("webglcontextlost", onContextLost);

        const cleanup = () => {
          observer.disconnect();
          renderer?.domElement.removeEventListener("webglcontextlost", onContextLost);
          renderer?.setAnimationLoop(null);
          geometry.dispose();
          material.dispose();
          renderer?.dispose();
          renderer?.domElement.remove();
          renderer = null;
        };
        (host as HTMLDivElement & { __liquidCleanup?: () => void }).__liquidCleanup = cleanup;
        setSupported(true);
      } catch {
        setSupported(false);
      }
    };

    void initialise();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener?.("change", onMotionChange);
      const cleanupHost = host as HTMLDivElement & { __liquidCleanup?: () => void };
      cleanupHost.__liquidCleanup?.();
      delete cleanupHost.__liquidCleanup;
      if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
        renderer.domElement.remove();
        renderer = null;
      }
    };
  }, []);

  return (
    <div className={`jayver-liquid-metal-stage ${className}`} ref={hostRef}>
      {!supported && <img src="/brand/jayver-mark.svg" alt="" className="jayver-liquid-metal-fallback" />}
    </div>
  );
}
