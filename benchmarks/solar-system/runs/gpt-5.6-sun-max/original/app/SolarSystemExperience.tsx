"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Aperture,
  ArrowLeftRight,
  BadgeInfo,
  BookOpen,
  ChevronLeft,
  CircleDot,
  Eye,
  EyeOff,
  Focus,
  Gauge,
  Info,
  Keyboard,
  ListFilter,
  LocateFixed,
  Menu,
  Minus,
  Orbit,
  Pause,
  Play,
  RefreshCcw,
  Route,
  RotateCcw,
  Scale,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Telescope,
  X,
} from "lucide-react";

type BodyId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "moon"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

type BodyDef = {
  id: BodyId;
  name: string;
  short: string;
  type: string;
  diameter: number;
  distance: string;
  distanceAU: number;
  orbitalDays: number | null;
  rotationHours: number;
  moons: number;
  temperature: string;
  fact: string;
  mass: string;
  gravity: number;
  color: string;
  accent: string;
  axialTilt: number;
  inclination: number;
  startAngle: number;
  radiusExplore: number;
  radiusRelative: number;
  orbitExplore: number;
  orbitRelative: number;
};

const BODIES: BodyDef[] = [
  {
    id: "sun",
    name: "Sun",
    short: "Sol",
    type: "G-type main-sequence star",
    diameter: 1_392_700,
    distance: "System center",
    distanceAU: 0,
    orbitalDays: null,
    rotationHours: 609.12,
    moons: 0,
    temperature: "≈5,500 °C (photosphere)",
    fact: "It contains about 99.86% of all mass in the Solar System.",
    mass: "1.989 × 10³⁰ kg",
    gravity: 274,
    color: "#ffb23f",
    accent: "#ffd37a",
    axialTilt: 7.25,
    inclination: 0,
    startAngle: 0,
    radiusExplore: 4.8,
    radiusRelative: 18.56,
    orbitExplore: 0,
    orbitRelative: 0,
  },
  {
    id: "mercury",
    name: "Mercury",
    short: "Mer",
    type: "Terrestrial planet",
    diameter: 4_879,
    distance: "57.9 million km (0.39 AU)",
    distanceAU: 0.387,
    orbitalDays: 87.97,
    rotationHours: 1_407.6,
    moons: 0,
    temperature: "≈167 °C average",
    fact: "A solar day on Mercury lasts roughly two Mercurian years.",
    mass: "3.301 × 10²³ kg",
    gravity: 3.7,
    color: "#8e8b86",
    accent: "#d0cbc3",
    axialTilt: 0.034,
    inclination: 7,
    startAngle: 2.45,
    radiusExplore: 0.46,
    radiusRelative: 0.065,
    orbitExplore: 9,
    orbitRelative: 25.5,
  },
  {
    id: "venus",
    name: "Venus",
    short: "Ven",
    type: "Terrestrial planet",
    diameter: 12_104,
    distance: "108.2 million km (0.72 AU)",
    distanceAU: 0.723,
    orbitalDays: 224.7,
    rotationHours: -5_832.5,
    moons: 0,
    temperature: "≈464 °C",
    fact: "Venus rotates backward and has the hottest planetary surface.",
    mass: "4.867 × 10²⁴ kg",
    gravity: 8.87,
    color: "#d4a45d",
    accent: "#ffe0a0",
    axialTilt: 177.4,
    inclination: 3.39,
    startAngle: 5.2,
    radiusExplore: 0.7,
    radiusRelative: 0.161,
    orbitExplore: 13.5,
    orbitRelative: 30,
  },
  {
    id: "earth",
    name: "Earth",
    short: "Ear",
    type: "Terrestrial planet",
    diameter: 12_742,
    distance: "149.6 million km (1 AU)",
    distanceAU: 1,
    orbitalDays: 365.256,
    rotationHours: 23.934,
    moons: 1,
    temperature: "≈15 °C average",
    fact: "Earth is the only world known to host life and surface oceans.",
    mass: "5.972 × 10²⁴ kg",
    gravity: 9.81,
    color: "#2879c7",
    accent: "#7fd5ff",
    axialTilt: 23.44,
    inclination: 0,
    startAngle: 0.52,
    radiusExplore: 0.78,
    radiusRelative: 0.17,
    orbitExplore: 18.5,
    orbitRelative: 34,
  },
  {
    id: "moon",
    name: "Moon",
    short: "Luna",
    type: "Natural satellite",
    diameter: 3_474.8,
    distance: "≈384,400 km from Earth",
    distanceAU: 1,
    orbitalDays: 27.322,
    rotationHours: 655.73,
    moons: 0,
    temperature: "≈−20 °C average",
    fact: "Its synchronous rotation keeps nearly the same face toward Earth.",
    mass: "7.342 × 10²² kg",
    gravity: 1.62,
    color: "#aaa9a4",
    accent: "#eeeee8",
    axialTilt: 6.68,
    inclination: 5.14,
    startAngle: 3.4,
    radiusExplore: 0.24,
    radiusRelative: 0.046,
    orbitExplore: 2.25,
    orbitRelative: 1.5,
  },
  {
    id: "mars",
    name: "Mars",
    short: "Mar",
    type: "Terrestrial planet",
    diameter: 6_779,
    distance: "227.9 million km (1.52 AU)",
    distanceAU: 1.524,
    orbitalDays: 686.98,
    rotationHours: 24.623,
    moons: 2,
    temperature: "≈−63 °C",
    fact: "Olympus Mons is the tallest known volcano in the Solar System.",
    mass: "6.417 × 10²³ kg",
    gravity: 3.71,
    color: "#a4482c",
    accent: "#ff9160",
    axialTilt: 25.19,
    inclination: 1.85,
    startAngle: 4.4,
    radiusExplore: 0.58,
    radiusRelative: 0.09,
    orbitExplore: 24,
    orbitRelative: 39,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    short: "Jup",
    type: "Gas giant",
    diameter: 139_820,
    distance: "778.5 million km (5.20 AU)",
    distanceAU: 5.203,
    orbitalDays: 4_332.59,
    rotationHours: 9.925,
    moons: 101,
    temperature: "≈−110 °C (cloud tops)",
    fact: "Its Great Red Spot is a storm wider than Earth.",
    mass: "1.898 × 10²⁷ kg",
    gravity: 24.79,
    color: "#c49b76",
    accent: "#f4d0ad",
    axialTilt: 3.13,
    inclination: 1.31,
    startAngle: 1.75,
    radiusExplore: 2.5,
    radiusRelative: 1.864,
    orbitExplore: 34,
    orbitRelative: 59,
  },
  {
    id: "saturn",
    name: "Saturn",
    short: "Sat",
    type: "Gas giant",
    diameter: 116_460,
    distance: "1.43 billion km (9.54 AU)",
    distanceAU: 9.537,
    orbitalDays: 10_759.22,
    rotationHours: 10.656,
    moons: 274,
    temperature: "≈−140 °C (cloud tops)",
    fact: "Its broad rings are mostly water ice, from dust to house-sized pieces.",
    mass: "5.683 × 10²⁶ kg",
    gravity: 10.44,
    color: "#d6bb7b",
    accent: "#ffdea0",
    axialTilt: 26.73,
    inclination: 2.49,
    startAngle: 3.75,
    radiusExplore: 2.1,
    radiusRelative: 1.553,
    orbitExplore: 45,
    orbitRelative: 74,
  },
  {
    id: "uranus",
    name: "Uranus",
    short: "Ura",
    type: "Ice giant",
    diameter: 50_724,
    distance: "2.87 billion km (19.19 AU)",
    distanceAU: 19.191,
    orbitalDays: 30_688.5,
    rotationHours: -17.24,
    moons: 29,
    temperature: "≈−195 °C (cloud tops)",
    fact: "Uranus rotates on its side, likely after a colossal early impact.",
    mass: "8.681 × 10²⁵ kg",
    gravity: 8.69,
    color: "#8bd8dc",
    accent: "#c9ffff",
    axialTilt: 97.77,
    inclination: 0.77,
    startAngle: 5.75,
    radiusExplore: 1.35,
    radiusRelative: 0.677,
    orbitExplore: 57,
    orbitRelative: 89,
  },
  {
    id: "neptune",
    name: "Neptune",
    short: "Nep",
    type: "Ice giant",
    diameter: 49_244,
    distance: "4.50 billion km (30.07 AU)",
    distanceAU: 30.069,
    orbitalDays: 60_182,
    rotationHours: 16.11,
    moons: 16,
    temperature: "≈−200 °C (cloud tops)",
    fact: "The fastest winds measured in the Solar System rage on Neptune.",
    mass: "1.024 × 10²⁶ kg",
    gravity: 11.15,
    color: "#265fd5",
    accent: "#70a8ff",
    axialTilt: 28.32,
    inclination: 1.77,
    startAngle: 2.88,
    radiusExplore: 1.32,
    radiusRelative: 0.657,
    orbitExplore: 69,
    orbitRelative: 104,
  },
];

const BODY_MAP = new Map(BODIES.map((body) => [body.id, body]));
const TAU = Math.PI * 2;

const TOUR_STOPS: Array<{ id: BodyId; kicker: string; title: string; description: string }> = [
  {
    id: "sun",
    kicker: "STOP 01 · THE ENGINE",
    title: "Our local star",
    description: "Every orbit begins here. The Sun’s gravity organizes the system, while fusion in its core supplies nearly all the light and heat reaching the planets.",
  },
  {
    id: "earth",
    kicker: "STOP 02 · THE OCEAN WORLD",
    title: "Earth, in the habitable zone",
    description: "Liquid surface water, a protective magnetic field and an active atmosphere make Earth the only world currently known to support life.",
  },
  {
    id: "moon",
    kicker: "STOP 03 · EARTH’S COMPANION",
    title: "A stabilizing Moon",
    description: "The Moon raises tides, helps stabilize Earth’s axial tilt and preserves a cratered record of the inner Solar System’s violent past.",
  },
  {
    id: "mars",
    kicker: "STOP 04 · THE RED PLANET",
    title: "A once-wetter world",
    description: "Ancient river valleys and minerals reveal that Mars once had abundant liquid water, though its surface is now cold, dry and radiation-bathed.",
  },
  {
    id: "jupiter",
    kicker: "STOP 05 · THE GIANT",
    title: "A planetary system within a system",
    description: "Jupiter is more massive than all other planets combined. Its huge magnetosphere, turbulent bands and diverse moons form a miniature system of their own.",
  },
  {
    id: "saturn",
    kicker: "STOP 06 · THE RINGED WORLD",
    title: "Ice sculpted into rings",
    description: "Saturn’s rings span hundreds of thousands of kilometers yet are astonishingly thin, built from countless icy particles orbiting independently.",
  },
  {
    id: "uranus",
    kicker: "STOP 07 · THE SIDEWAYS GIANT",
    title: "A planet tipped over",
    description: "Uranus rolls around the Sun with an axial tilt near 98°, creating extreme seasons that can leave a pole facing sunlight for decades.",
  },
  {
    id: "neptune",
    kicker: "STOP 08 · THE FRONTIER",
    title: "Blue, distant and dynamic",
    description: "Despite receiving little sunlight, Neptune drives ferocious weather. Methane colors its atmosphere blue while winds exceed 2,000 km/h.",
  },
];

type ScaleMode = "exploration" | "relative";
type OrbitMode = "all" | "selected" | "none";

type SceneApi = {
  focus: (id: BodyId, follow?: boolean) => void;
  overview: () => void;
};

type BodyObject = {
  group: THREE.Group;
  tiltGroup: THREE.Group;
  mesh: THREE.Mesh;
  pick: THREE.Mesh;
  atmosphere?: THREE.Mesh;
  cloud?: THREE.Mesh;
  glow?: THREE.Sprite;
  radius: number;
};

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makePlanetTexture(body: BodyDef, renderer: THREE.WebGLRenderer) {
  const width = body.id === "jupiter" || body.id === "saturn" ? 768 : 512;
  const height = width / 2;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const image = ctx.createImageData(width, height);
  const data = image.data;
  const random = seededRandom(body.diameter + 73);
  const base = new THREE.Color(body.color);
  const accent = new THREE.Color(body.accent);

  for (let y = 0; y < height; y++) {
    const lat = y / height;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const wave = Math.sin(lat * 44 + Math.sin(x * 0.025) * 1.6);
      const fine = Math.sin(x * 0.08 + y * 0.17) * 0.5 + Math.sin(x * 0.021 - y * 0.11) * 0.5;
      const noise = (random() - 0.5) * 0.18 + fine * 0.06;
      let mix = 0.16 + noise;

      if (body.id === "sun") mix = 0.35 + wave * 0.13 + noise * 0.7;
      if (body.id === "jupiter") mix = 0.32 + wave * 0.22 + noise * 0.45;
      if (body.id === "saturn") mix = 0.28 + Math.sin(lat * 70) * 0.1 + noise * 0.25;
      if (body.id === "uranus") mix = 0.2 + Math.sin(lat * 24) * 0.025 + noise * 0.08;
      if (body.id === "neptune") mix = 0.15 + Math.sin(lat * 30) * 0.05 + noise * 0.25;

      const c = base.clone().lerp(accent, THREE.MathUtils.clamp(mix, 0, 0.72));

      if (body.id === "earth") {
        const continent =
          Math.sin(x * 0.031 + Math.sin(y * 0.061) * 2.4) +
          Math.sin(x * 0.067 - y * 0.028) * 0.7 +
          Math.sin(x * 0.013 + y * 0.051) * 0.55;
        const polar = Math.abs(lat - 0.5) > 0.43;
        if (polar) c.set("#e7f2ee");
        else if (continent > 1.0) c.set( lat < 0.45 ? "#648b48" : "#8e9252").offsetHSL(noise * 0.05, 0, noise * 0.3);
        else c.set("#0b4f8d").lerp(new THREE.Color("#2493bd"), Math.max(0, wave) * 0.22);
      }

      if (body.id === "mars") {
        const dark = Math.sin(x * 0.025 + Math.sin(y * 0.055) * 2) + Math.sin(x * 0.071 - y * 0.03);
        if (dark > 1.15) c.multiplyScalar(0.48);
        if (Math.abs(lat - 0.5) > 0.445) c.lerp(new THREE.Color("#ead7c4"), 0.8);
      }

      if (body.id === "mercury" || body.id === "moon") {
        const gray = 0.58 + noise * 1.4 + Math.sin(x * 0.037 + y * 0.059) * 0.04;
        c.setRGB(gray, gray * 0.99, gray * 0.95);
      }

      if (body.id === "venus") {
        const swirl = Math.sin(y * 0.11 + Math.sin(x * 0.025) * 3) * 0.12;
        c.offsetHSL(0.01, -0.08, swirl);
      }

      data[i] = Math.round(c.r * 255);
      data[i + 1] = Math.round(c.g * 255);
      data[i + 2] = Math.round(c.b * 255);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  if (body.id === "jupiter") {
    ctx.save();
    ctx.translate(width * 0.72, height * 0.61);
    ctx.scale(1.8, 0.7);
    const spot = ctx.createRadialGradient(0, 0, 3, 0, 0, 31);
    spot.addColorStop(0, "#c95f3f");
    spot.addColorStop(0.55, "#a9422d");
    spot.addColorStop(1, "rgba(130,54,36,0)");
    ctx.fillStyle = spot;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  if (body.id === "moon" || body.id === "mercury") {
    const craterRandom = seededRandom(body.diameter + 900);
    for (let i = 0; i < 90; i++) {
      const x = craterRandom() * width;
      const y = craterRandom() * height;
      const r = 1 + craterRandom() * 8;
      const gradient = ctx.createRadialGradient(x - r * 0.25, y - r * 0.2, 0, x, y, r);
      gradient.addColorStop(0, "rgba(255,255,245,.12)");
      gradient.addColorStop(0.35, "rgba(40,39,37,.18)");
      gradient.addColorStop(1, "rgba(20,20,20,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function makeCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const random = seededRandom(2468);
  for (let i = 0; i < 420; i++) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const w = 4 + random() * 28;
    const alpha = 0.03 + random() * 0.14;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w, w * 0.22, random() * Math.PI, 0, TAU);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createAtmosphere(color: string) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    uniforms: { glowColor: { value: new THREE.Color(color) } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      uniform vec3 glowColor;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.6);
        gl_FragColor = vec4(glowColor, rim * .38);
      }
    `,
  });
}

function createRingMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      inner: { value: 1.32 },
      outer: { value: 2.35 },
    },
    vertexShader: `
      varying float vRadius;
      void main() {
        vRadius = length(position.xy);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vRadius;
      uniform float inner;
      uniform float outer;
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        float t = (vRadius - inner) / (outer - inner);
        float edge = smoothstep(0.0,.025,t) * (1.0 - smoothstep(.94,1.0,t));
        float bands = .56 + .22*sin(t*125.0) + .12*sin(t*311.0);
        float gap = smoothstep(.018,.04,abs(t-.48));
        vec3 c = mix(vec3(.34,.28,.21), vec3(.91,.78,.55), t);
        gl_FragColor = vec4(c, edge * bands * gap * .92);
      }
    `,
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPeriod(days: number | null) {
  if (days === null) return "—";
  if (days < 1000) return `≈${days.toFixed(days < 100 ? 2 : 1)} days`;
  return `≈${(days / 365.256).toFixed(1)} Earth years`;
}

function formatRotation(hours: number) {
  const retrograde = hours < 0;
  const abs = Math.abs(hours);
  const value = abs < 48 ? `${abs.toFixed(2)} hours` : `${(abs / 24).toFixed(1)} days`;
  return `≈${value}${retrograde ? " · retrograde" : ""}`;
}

function IconButton({
  label,
  children,
  onClick,
  active = false,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`icon-button ${active ? "active" : ""} ${className}`}
      onClick={onClick}
      aria-label={label}
      data-tip={label}
      type="button"
    >
      {children}
    </button>
  );
}

export default function SolarSystemExperience() {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const sceneApi = useRef<SceneApi | null>(null);
  const selectedRef = useRef<BodyId>("earth");
  const followRef = useRef(false);
  const pausedRef = useRef(false);
  const speedRef = useRef(1);
  const directionRef = useRef(1);
  const orbitModeRef = useRef<OrbitMode>("all");
  const labelsVisibleRef = useRef(true);
  const scaleModeRef = useRef<ScaleMode>("exploration");

  const [loading, setLoading] = useState(true);
  const [webglFallback, setWebglFallback] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);
  const [selected, setSelected] = useState<BodyId>("earth");
  const [following, setFollowing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [direction, setDirection] = useState(1);
  const [customSpeed, setCustomSpeed] = useState(250);
  const [orbitMode, setOrbitMode] = useState<OrbitMode>("all");
  const [labelsVisible, setLabelsVisible] = useState(true);
  const [scaleMode, setScaleMode] = useState<ScaleMode>("exploration");
  const [search, setSearch] = useState("");
  const [navigatorOpen, setNavigatorOpen] = useState(true);
  const [infoOpen, setInfoOpen] = useState(true);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [compareA, setCompareA] = useState<BodyId>("earth");
  const [compareB, setCompareB] = useState<BodyId>("jupiter");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourPaused, setTourPaused] = useState(false);
  const [displayDate, setDisplayDate] = useState("01 JAN 2000");
  const [quality, setQuality] = useState("Adaptive · High");

  const selectedBody = BODY_MAP.get(selected)!;
  const compareBodyA = BODY_MAP.get(compareA)!;
  const compareBodyB = BODY_MAP.get(compareB)!;
  const tourStop = TOUR_STOPS[tourIndex];
  const visibleBodies = useMemo(() => {
    const query = search.trim().toLowerCase();
    return BODIES.filter(
      (body) =>
        !query ||
        body.name.toLowerCase().includes(query) ||
        body.type.toLowerCase().includes(query),
    );
  }, [search]);
  const comparisonMaxDiameter = Math.max(compareBodyA.diameter, compareBodyB.diameter);
  const comparisonCircleSize = (diameter: number) =>
    Math.max(12, Math.round((diameter / comparisonMaxDiameter) * 156));
  const diameterRatio = Math.max(compareBodyA.diameter, compareBodyB.diameter) /
    Math.min(compareBodyA.diameter, compareBodyB.diameter);
  const comparisonRows = [
    { label: "Diameter", a: `${formatNumber(compareBodyA.diameter)} km`, b: `${formatNumber(compareBodyB.diameter)} km` },
    { label: "Mass", a: compareBodyA.mass, b: compareBodyB.mass },
    { label: "Surface gravity", a: `${compareBodyA.gravity} m/s²`, b: `${compareBodyB.gravity} m/s²` },
    { label: "Length of day", a: formatRotation(compareBodyA.rotationHours), b: formatRotation(compareBodyB.rotationHours) },
    { label: "Length of year", a: formatPeriod(compareBodyA.orbitalDays), b: formatPeriod(compareBodyB.orbitalDays) },
    { label: "Average temperature", a: compareBodyA.temperature, b: compareBodyB.temperature },
  ];

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    followRef.current = following;
  }, [following]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);
  useEffect(() => {
    orbitModeRef.current = orbitMode;
  }, [orbitMode]);
  useEffect(() => {
    labelsVisibleRef.current = labelsVisible;
  }, [labelsVisible]);
  useEffect(() => {
    scaleModeRef.current = scaleMode;
  }, [scaleMode]);

  const selectBody = useCallback((id: BodyId, shouldFollow = false) => {
    setSelected(id);
    selectedRef.current = id;
    setFollowing(shouldFollow);
    followRef.current = shouldFollow;
    setInfoOpen(true);
    sceneApi.current?.focus(id, shouldFollow);
  }, []);

  const showOverview = useCallback(() => {
    setFollowing(false);
    followRef.current = false;
    sceneApi.current?.overview();
  }, []);

  const changeScale = useCallback((mode: ScaleMode) => {
    setScaleMode(mode);
    scaleModeRef.current = mode;
    window.setTimeout(() => {
      if (followRef.current) sceneApi.current?.focus(selectedRef.current, true);
      else sceneApi.current?.overview();
    }, 650);
  }, []);

  const visitTourStop = useCallback(
    (index: number) => {
      const bounded = Math.max(0, Math.min(TOUR_STOPS.length - 1, index));
      setTourIndex(bounded);
      setTourPaused(false);
      selectBody(TOUR_STOPS[bounded].id, true);
      setInfoOpen(false);
    },
    [selectBody],
  );

  const startTour = useCallback(() => {
    setIntroOpen(false);
    setComparisonOpen(false);
    setAboutOpen(false);
    setNavigatorOpen(false);
    setInfoOpen(false);
    setTourActive(true);
    visitTourStop(0);
  }, [visitTourStop]);

  const exitTour = useCallback(() => {
    setTourActive(false);
    setTourPaused(false);
    setFollowing(false);
    followRef.current = false;
  }, []);

  const resetSimulation = useCallback(() => {
    window.dispatchEvent(new CustomEvent("orbitarium-reset-simulation"));
    setPaused(false);
    pausedRef.current = false;
    setDirection(1);
    directionRef.current = 1;
    setSpeed(1);
    speedRef.current = 1;
    setSelected("earth");
    selectedRef.current = "earth";
    setFollowing(false);
    followRef.current = false;
    setTimeout(() => sceneApi.current?.overview(), 40);
  }, []);

  useEffect(() => {
    if (!tourActive || tourPaused) return;
    const timer = window.setTimeout(() => {
      if (tourIndex < TOUR_STOPS.length - 1) visitTourStop(tourIndex + 1);
      else setTourPaused(true);
    }, 8500);
    return () => window.clearTimeout(timer);
  }, [tourActive, tourIndex, tourPaused, visitTourStop]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    const isCompact = window.matchMedia("(max-width: 760px)").matches;
    const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
    const segments = isCompact || lowPower ? 48 : 64;
    const starCount = isCompact || lowPower ? 3600 : 6800;
    setQuality(isCompact || lowPower ? "Adaptive · Balanced" : "Adaptive · High");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010307);
    scene.fog = new THREE.FogExp2(0x02050a, 0.00072);

    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, 0.03, 1800);
    camera.position.set(0, 52, 96);

    let renderer: THREE.WebGLRenderer;
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2", {
        antialias: !lowPower,
        powerPreference: "high-performance",
      });
      if (!context) throw new Error("WebGL 2 is unavailable");
      renderer = new THREE.WebGLRenderer({ canvas, context, antialias: !lowPower, powerPreference: "high-performance" });
    } catch {
      const fallbackTimer = window.setTimeout(() => {
        setWebglFallback(true);
        setQuality("Fallback · Accessible");
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(fallbackTimer);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.45 : 1.8));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.className = "space-canvas";
    renderer.domElement.setAttribute("aria-label", "Interactive three-dimensional model of the Solar System");
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.rotateSpeed = 0.48;
    controls.zoomSpeed = 0.75;
    controls.panSpeed = 0.55;
    controls.minDistance = 0.4;
    controls.maxDistance = 420;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0x172a48, 0x020204, 0.055));
    const sunLight = new THREE.PointLight(0xffe4b0, 950, 420, 1.55);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const starRandom = seededRandom(40210);
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const palette = [new THREE.Color("#ffffff"), new THREE.Color("#a7c7ff"), new THREE.Color("#ffe7c2")];
    for (let i = 0; i < starCount; i++) {
      const r = 180 + Math.pow(starRandom(), 0.62) * 720;
      const phi = Math.acos(2 * starRandom() - 1);
      const theta = starRandom() * TAU;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const color = palette[Math.floor(starRandom() * palette.length)].clone().multiplyScalar(0.55 + starRandom() * 0.55);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({ size: isCompact ? 0.56 : 0.68, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.9 }),
    );
    scene.add(stars);

    const dustGeometry = new THREE.BufferGeometry();
    const dustCount = isCompact ? 450 : 900;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const r = 25 + starRandom() * 115;
      const theta = starRandom() * TAU;
      dustPositions[i * 3] = Math.cos(theta) * r;
      dustPositions[i * 3 + 1] = (starRandom() - 0.5) * 9;
      dustPositions[i * 3 + 2] = Math.sin(theta) * r;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({ color: 0x6f87a4, size: 0.07, transparent: true, opacity: 0.16, depthWrite: false }),
    );
    scene.add(dust);

    const bodies = new Map<BodyId, BodyObject>();
    const orbitLines = new Map<BodyId, THREE.LineLoop>();
    const pickables: THREE.Object3D[] = [];
    const sharedSphere = new THREE.SphereGeometry(1, segments, Math.floor(segments / 2));
    const cloudTexture = makeCloudTexture();

    for (const body of BODIES) {
      const group = new THREE.Group();
      group.name = body.id;
      scene.add(group);

      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = THREE.MathUtils.degToRad(body.axialTilt);
      group.add(tiltGroup);

      const texture = makePlanetTexture(body, renderer);
      const material =
        body.id === "sun"
          ? new THREE.MeshBasicMaterial({ map: texture, color: 0xffd08a })
          : new THREE.MeshStandardMaterial({
              map: texture,
              color: 0xffffff,
              roughness: body.id === "earth" ? 0.78 : 0.93,
              metalness: 0,
            });
      const mesh = new THREE.Mesh(sharedSphere, material);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.userData.bodyId = body.id;
      tiltGroup.add(mesh);

      const pick = new THREE.Mesh(
        sharedSphere,
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
      );
      pick.userData.bodyId = body.id;
      group.add(pick);
      pickables.push(pick);

      let atmosphere: THREE.Mesh | undefined;
      if (["venus", "earth", "mars", "uranus", "neptune"].includes(body.id)) {
        atmosphere = new THREE.Mesh(sharedSphere, createAtmosphere(body.accent));
        atmosphere.scale.setScalar(body.id === "earth" ? 1.08 : 1.055);
        group.add(atmosphere);
      }

      let cloud: THREE.Mesh | undefined;
      if (body.id === "earth") {
        cloud = new THREE.Mesh(
          sharedSphere,
          new THREE.MeshStandardMaterial({ map: cloudTexture, transparent: true, opacity: 0.62, depthWrite: false, roughness: 1 }),
        );
        cloud.scale.setScalar(1.012);
        tiltGroup.add(cloud);
      }

      let glow: THREE.Sprite | undefined;
      if (body.id === "sun") {
        const glowCanvas = document.createElement("canvas");
        glowCanvas.width = 256;
        glowCanvas.height = 256;
        const glowCtx = glowCanvas.getContext("2d")!;
        const gradient = glowCtx.createRadialGradient(128, 128, 8, 128, 128, 128);
        gradient.addColorStop(0, "rgba(255,242,197,1)");
        gradient.addColorStop(0.12, "rgba(255,180,52,.7)");
        gradient.addColorStop(0.42, "rgba(255,104,19,.18)");
        gradient.addColorStop(1, "rgba(255,80,0,0)");
        glowCtx.fillStyle = gradient;
        glowCtx.fillRect(0, 0, 256, 256);
        const glowMaterial = new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(glowCanvas),
          color: 0xffc35a,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        glow = new THREE.Sprite(glowMaterial);
        glow.scale.set(4.8, 4.8, 1);
        group.add(glow);
      }

      if (body.id === "saturn") {
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.32, 2.35, 192, 8), createRingMaterial());
        ring.rotation.x = Math.PI / 2;
        tiltGroup.add(ring);
      }

      if (body.id === "uranus") {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.38, 1.68, 128),
          new THREE.MeshBasicMaterial({ color: 0xaeecef, transparent: true, opacity: 0.19, side: THREE.DoubleSide, depthWrite: false }),
        );
        ring.rotation.x = Math.PI / 2;
        tiltGroup.add(ring);
      }

      const initialRadius = body.radiusExplore;
      group.scale.setScalar(initialRadius);
      pick.scale.setScalar(Math.max(1, 1.35 / initialRadius));
      bodies.set(body.id, { group, tiltGroup, mesh, pick, atmosphere, cloud, glow, radius: initialRadius });

      if (body.id !== "sun") {
        const orbitPoints: THREE.Vector3[] = [];
        const resolution = body.id === "moon" ? 96 : 192;
        for (let i = 0; i < resolution; i++) {
          const angle = (i / resolution) * TAU;
          orbitPoints.push(new THREE.Vector3(Math.cos(angle) * body.orbitExplore, 0, Math.sin(angle) * body.orbitExplore));
        }
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbit = new THREE.LineLoop(
          orbitGeometry,
          new THREE.LineBasicMaterial({
            color: body.id === "moon" ? 0x7295ad : 0x31506a,
            transparent: true,
            opacity: body.id === "moon" ? 0.34 : 0.29,
            depthWrite: false,
          }),
        );
        orbit.userData.bodyId = body.id;
        scene.add(orbit);
        orbitLines.set(body.id, orbit);
      }
    }

    const highlight = new THREE.Mesh(
      new THREE.TorusGeometry(1.28, 0.025, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0x6ee7ff, transparent: true, opacity: 0.92, depthWrite: false }),
    );
    highlight.renderOrder = 4;
    scene.add(highlight);

    let simDays = 0;
    let scaleBlend = 0;
    let lastScaleBlend = -1;
    let lastTime = performance.now();
    let lastUiUpdate = 0;
    let transition:
      | {
          start: number;
          duration: number;
          startPos: THREE.Vector3;
          startTarget: THREE.Vector3;
          offset: THREE.Vector3;
          targetId?: BodyId;
          overviewTarget?: THREE.Vector3;
        }
      | undefined;
    let followLastPosition: THREE.Vector3 | null = null;
    const tempWorld = new THREE.Vector3();
    const tempVec = new THREE.Vector3();
    const projected = new THREE.Vector3();

    const currentRadius = (body: BodyDef) => THREE.MathUtils.lerp(body.radiusExplore, body.radiusRelative, scaleBlend);
    const currentOrbit = (body: BodyDef) => THREE.MathUtils.lerp(body.orbitExplore, body.orbitRelative, scaleBlend);

    const updateOrbitGeometry = () => {
      for (const body of BODIES) {
        if (body.id === "sun") continue;
        const line = orbitLines.get(body.id)!;
        const attribute = line.geometry.getAttribute("position") as THREE.BufferAttribute;
        const radius = currentOrbit(body);
        const inclination = THREE.MathUtils.degToRad(body.inclination);
        for (let i = 0; i < attribute.count; i++) {
          const angle = (i / attribute.count) * TAU;
          attribute.setXYZ(
            i,
            Math.cos(angle) * radius,
            Math.sin(angle) * radius * Math.sin(inclination),
            Math.sin(angle) * radius * Math.cos(inclination),
          );
        }
        attribute.needsUpdate = true;
      }
    };

    const bodyWorldPosition = (id: BodyId) => bodies.get(id)!.group.getWorldPosition(new THREE.Vector3());

    const focusBody = (id: BodyId, shouldFollow = false) => {
      const body = BODY_MAP.get(id)!;
      const target = bodyWorldPosition(id);
      const radius = currentRadius(body);
      const currentDirection = camera.position.clone().sub(controls.target);
      if (currentDirection.lengthSq() < 0.1) currentDirection.set(1, 0.5, 1);
      currentDirection.normalize();
      const ringFactor = id === "saturn" ? 7.2 : id === "sun" ? 3.2 : 5.3;
      const minDistance = id === "moon" || id === "mercury" ? 2.5 : 3.2;
      const distance = Math.max(minDistance, radius * ringFactor);
      const offset = currentDirection.multiplyScalar(distance);
      offset.y = Math.max(offset.y, radius * 0.7 + 0.35);
      transition = {
        start: performance.now(),
        duration: 1250,
        startPos: camera.position.clone(),
        startTarget: controls.target.clone(),
        offset,
        targetId: id,
      };
      followLastPosition = shouldFollow ? target.clone() : null;
    };

    const overview = () => {
      const outer = scaleModeRef.current === "relative" ? 104 : 69;
      transition = {
        start: performance.now(),
        duration: 1500,
        startPos: camera.position.clone(),
        startTarget: controls.target.clone(),
        offset: new THREE.Vector3(0, outer * 0.72, outer * 1.2),
        overviewTarget: new THREE.Vector3(0, 0, 0),
      };
      followLastPosition = null;
    };

    sceneApi.current = { focus: focusBody, overview };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerStart = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => pointerStart.set(event.clientX, event.clientY);
    const onPointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 7) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      if (hit?.object.userData.bodyId) selectBody(hit.object.userData.bodyId as BodyId, false);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const cancelTransition = () => {
      if (transition) transition = undefined;
    };
    controls.addEventListener("start", cancelTransition);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 760 ? 1.45 : 1.8));
    };
    window.addEventListener("resize", onResize);

    const onReset = () => {
      simDays = 0;
      scaleBlend = scaleModeRef.current === "relative" ? 1 : 0;
    };
    window.addEventListener("orbitarium-reset-simulation", onReset);

    const updateLabels = () => {
      if (!labelsVisibleRef.current) {
        for (const body of BODIES) {
          const element = labelsRef.current[body.id];
          if (element) element.style.opacity = "0";
        }
        return;
      }
      const occupied: Array<{ x: number; y: number }> = [];
      const candidates = BODIES.map((body) => {
        const object = bodies.get(body.id)!;
        object.group.getWorldPosition(projected);
        const distance = camera.position.distanceTo(projected);
        projected.project(camera);
        return { body, x: (projected.x * 0.5 + 0.5) * mount.clientWidth, y: (-projected.y * 0.5 + 0.5) * mount.clientHeight, z: projected.z, distance };
      }).sort((a, b) => (a.body.id === selectedRef.current ? -1 : b.body.id === selectedRef.current ? 1 : a.distance - b.distance));

      for (const item of candidates) {
        const element = labelsRef.current[item.body.id];
        if (!element) continue;
        const inView = item.z > -1 && item.z < 1 && item.x > 10 && item.x < mount.clientWidth - 10 && item.y > 45 && item.y < mount.clientHeight - 40;
        const overlaps = occupied.some((point) => Math.abs(point.x - item.x) < 74 && Math.abs(point.y - item.y) < 25);
        const selectedLabel = item.body.id === selectedRef.current;
        const visible = inView && (!overlaps || selectedLabel) && (item.distance < 180 || selectedLabel);
        element.style.transform = `translate3d(${item.x}px, ${item.y}px, 0) translate(-50%, -50%)`;
        element.style.opacity = visible ? String(THREE.MathUtils.clamp(1.25 - item.distance / 180, selectedLabel ? 0.8 : 0.25, 0.95)) : "0";
        element.style.setProperty("--label-scale", String(THREE.MathUtils.clamp(1.18 - item.distance / 250, 0.78, 1)));
        element.classList.toggle("selected", selectedLabel);
        if (visible) occupied.push({ x: item.x, y: item.y });
      }
    };

    const animate = (now: number) => {
      if (disposed) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (!pausedRef.current) simDays += dt * (speedRef.current / 24) * directionRef.current;

      const desiredBlend = scaleModeRef.current === "relative" ? 1 : 0;
      scaleBlend = THREE.MathUtils.damp(scaleBlend, desiredBlend, 3.6, dt);
      if (Math.abs(scaleBlend - lastScaleBlend) > 0.0005) {
        updateOrbitGeometry();
        lastScaleBlend = scaleBlend;
      }

      for (const body of BODIES) {
        const object = bodies.get(body.id)!;
        const radius = currentRadius(body);
        object.radius = radius;
        object.group.scale.setScalar(radius);
        object.pick.scale.setScalar(Math.max(1.15, 1.35 / Math.max(radius, 0.001)));

        if (body.id === "sun") {
          object.group.position.set(0, 0, 0);
        } else if (body.id === "moon") {
          const earthPosition = bodies.get("earth")!.group.position;
          const angle = body.startAngle + (simDays / body.orbitalDays!) * TAU;
          const orbit = currentOrbit(body);
          object.group.position.set(
            earthPosition.x + Math.cos(angle) * orbit,
            earthPosition.y + Math.sin(angle) * orbit * Math.sin(THREE.MathUtils.degToRad(body.inclination)),
            earthPosition.z + Math.sin(angle) * orbit * Math.cos(THREE.MathUtils.degToRad(body.inclination)),
          );
          orbitLines.get("moon")!.position.copy(earthPosition);
        } else {
          const angle = body.startAngle + (simDays / body.orbitalDays!) * TAU;
          const orbit = currentOrbit(body);
          const inclination = THREE.MathUtils.degToRad(body.inclination);
          object.group.position.set(
            Math.cos(angle) * orbit,
            Math.sin(angle) * orbit * Math.sin(inclination),
            Math.sin(angle) * orbit * Math.cos(inclination),
          );
        }

        object.mesh.rotation.y = (simDays * 24 * TAU) / body.rotationHours;
        if (object.cloud) object.cloud.rotation.y = object.mesh.rotation.y * 1.045 + simDays * 0.03;
        if (object.glow) object.glow.scale.setScalar(3.2 + Math.sin(now * 0.0012) * 0.12);
      }

      const selectedObject = bodies.get(selectedRef.current)!;
      selectedObject.group.getWorldPosition(tempWorld);
      highlight.position.copy(tempWorld);
      highlight.quaternion.copy(camera.quaternion);
      const highlightScale = Math.max(currentRadius(BODY_MAP.get(selectedRef.current)!) * 1.45, 0.45);
      highlight.scale.setScalar(highlightScale * (1 + Math.sin(now * 0.003) * 0.035));

      for (const [id, line] of orbitLines) {
        line.visible =
          orbitModeRef.current === "all" ||
          (orbitModeRef.current === "selected" && id === selectedRef.current);
      }

      if (transition) {
        const progress = THREE.MathUtils.clamp((now - transition.start) / transition.duration, 0, 1);
        const eased = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        const target = transition.targetId ? bodyWorldPosition(transition.targetId) : transition.overviewTarget!.clone();
        camera.position.lerpVectors(transition.startPos, target.clone().add(transition.offset), eased);
        controls.target.lerpVectors(transition.startTarget, target, eased);
        if (progress >= 1) {
          if (transition.targetId && followRef.current) followLastPosition = target.clone();
          transition = undefined;
        }
      } else if (followRef.current) {
        const target = bodyWorldPosition(selectedRef.current);
        if (followLastPosition) {
          tempVec.copy(target).sub(followLastPosition);
          camera.position.add(tempVec);
          controls.target.add(tempVec);
        }
        followLastPosition = target.clone();
        controls.target.lerp(target, 1 - Math.exp(-dt * 8));
      }

      stars.rotation.y += dt * 0.0008;
      dust.rotation.y -= dt * 0.0015;
      controls.update();
      updateLabels();
      renderer.render(scene, camera);

      if (now - lastUiUpdate > 240) {
        const date = new Date(Date.UTC(2000, 0, 1, 12) + simDays * 86_400_000);
        setDisplayDate(
          date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase(),
        );
        lastUiUpdate = now;
      }
      requestAnimationFrame(animate);
    };

    updateOrbitGeometry();
    requestAnimationFrame(animate);
    const readyTimer = window.setTimeout(() => {
      setLoading(false);
      overview();
    }, 700);

    return () => {
      disposed = true;
      clearTimeout(readyTimer);
      sceneApi.current = null;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orbitarium-reset-simulation", onReset);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.removeEventListener("start", cancelTransition);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material && "map" in material && material.map instanceof THREE.Texture) material.map.dispose();
            material?.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [selectBody]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        setPaused((value) => {
          pausedRef.current = !value;
          return !value;
        });
      }
      if (event.key.toLowerCase() === "r") showOverview();
      if (event.key.toLowerCase() === "o")
        setOrbitMode((value) => (value === "none" ? "all" : "none"));
      if (event.key.toLowerCase() === "l") setLabelsVisible((value) => !value);
      if (event.key === "Escape") {
        setIntroOpen(false);
        setComparisonOpen(false);
        setAboutOpen(false);
        setTourActive(false);
        setTourPaused(false);
        setFollowing(false);
        followRef.current = false;
        setNavigatorOpen(false);
        setInfoOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showOverview]);

  const togglePause = () =>
    setPaused((value) => {
      pausedRef.current = !value;
      return !value;
    });

  const setPreset = (value: number) => {
    setSpeed(value);
    speedRef.current = value;
  };

  return (
    <main className="experience-shell">
      <div className="scene-mount" ref={mountRef} />
      {webglFallback && (
        <div className="fallback-scene" aria-label="Low-power orbital map">
          <div className="fallback-stars" />
          <button className="fallback-sun" onClick={() => selectBody("sun")} aria-label="Select Sun" />
          {BODIES.filter((body) => body.id !== "sun" && body.id !== "moon").map((body, index) => (
            <div
              className={`fallback-orbit fallback-orbit-${index}`}
              key={body.id}
              style={{ "--orbit-index": index, "--orbit-color": body.accent } as React.CSSProperties}
            >
              <button
                className={`fallback-planet glyph-${body.id}`}
                style={{ "--body-color": body.color, "--body-accent": body.accent } as React.CSSProperties}
                onClick={() => selectBody(body.id)}
                aria-label={`Select ${body.name}`}
              />
            </div>
          ))}
          <button className="fallback-moon" onClick={() => selectBody("moon")} aria-label="Select Moon" />
          <div className="fallback-message glass-panel">
            <BadgeInfo size={14} />
            <span><strong>Low-power orbital map</strong> · 3D graphics are unavailable in this browser session; all data controls remain accessible.</span>
          </div>
        </div>
      )}
      <div className="scene-vignette" aria-hidden="true" />
      <div className="label-layer" aria-hidden={!labelsVisible}>
        {BODIES.map((body) => (
          <div
            className="body-label"
            key={body.id}
            ref={(element) => {
              labelsRef.current[body.id] = element;
            }}
          >
            <span className="label-dot" style={{ background: body.accent }} />
            {body.name}
          </div>
        ))}
      </div>

      <header className="topbar glass-panel">
        <button className="brand" onClick={showOverview} aria-label="Return to Solar System overview">
          <span className="brand-mark"><Orbit size={20} /></span>
          <span>
            <strong>ORBITARIUM</strong>
            <small>SOLAR SYSTEM · J2000 MODEL</small>
          </span>
        </button>

        <div className="date-readout" aria-label={`Simulation date ${displayDate}`}>
          <span className={`live-dot ${paused ? "paused" : ""}`} />
          <div>
            <small>{paused ? "SIMULATION PAUSED" : direction < 0 ? "REVERSE TIME" : "SIMULATION TIME"}</small>
            <strong>{displayDate}</strong>
          </div>
        </div>

        <div className="top-actions">
          <div className="scale-switch" aria-label="Model scale">
            <button className={scaleMode === "exploration" ? "active" : ""} onClick={() => changeScale("exploration")}>Explore</button>
            <button className={scaleMode === "relative" ? "active" : ""} onClick={() => changeScale("relative")}>Relative</button>
          </div>
          <IconButton className="top-feature" label="Compare two celestial bodies" active={comparisonOpen} onClick={() => { setComparisonOpen(true); setAboutOpen(false); }}>
            <ArrowLeftRight size={18} />
          </IconButton>
          <IconButton className="top-feature" label="Start guided tour" active={tourActive} onClick={startTour}>
            <Route size={18} />
          </IconButton>
          <IconButton className="top-feature" label="About this model" active={aboutOpen} onClick={() => { setAboutOpen(true); setComparisonOpen(false); }}>
            <BookOpen size={18} />
          </IconButton>
          <IconButton label="Show object navigator" active={navigatorOpen} onClick={() => setNavigatorOpen((value) => !value)}>
            <Menu size={18} />
          </IconButton>
          <IconButton className="overview-top" label="Return to full system view" onClick={showOverview}>
            <Telescope size={18} />
          </IconButton>
          <IconButton label="Show selected object details" active={infoOpen} onClick={() => setInfoOpen((value) => !value)}>
            <Info size={18} />
          </IconButton>
        </div>
      </header>

      <aside className={`navigator-panel glass-panel ${navigatorOpen ? "open" : ""}`} aria-label="Celestial object navigator">
        <div className="panel-heading">
          <div>
            <small>OBJECT NAVIGATOR</small>
            <h2>Celestial bodies</h2>
          </div>
          <button className="panel-close" onClick={() => setNavigatorOpen(false)} aria-label="Close navigator"><X size={17} /></button>
        </div>
        <label className="search-field">
          <Search size={15} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search planets, types…" />
          {search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}
        </label>
        <div className="object-list" role="list">
          {visibleBodies.map((body) => (
            <div className={`object-row ${selected === body.id ? "selected" : ""}`} key={body.id} role="listitem">
              <button className="object-main" onClick={() => selectBody(body.id, false)}>
                <span className={`object-glyph glyph-${body.id}`} style={{ "--body-color": body.color, "--body-accent": body.accent } as React.CSSProperties} />
                <span className="object-copy">
                  <strong>{body.name}</strong>
                  <small>{body.type}</small>
                </span>
                <ChevronLeft className="row-chevron" size={15} />
              </button>
              <button
                className={`row-follow ${following && selected === body.id ? "active" : ""}`}
                onClick={() => selectBody(body.id, true)}
                aria-label={`Follow ${body.name}`}
                title={`Follow ${body.name}`}
              >
                <LocateFixed size={14} />
              </button>
            </div>
          ))}
          {visibleBodies.length === 0 && (
            <div className="empty-state"><Search size={24} /><strong>No objects found</strong><span>Try a planet name or “gas giant”.</span></div>
          )}
        </div>
        <div className="navigator-footer">
          <div className="quality-readout"><Gauge size={13} /><span>{quality}</span></div>
          <span>{BODIES.length} objects tracked</span>
        </div>
      </aside>

      <aside className={`info-panel glass-panel ${infoOpen ? "open" : ""}`} aria-label={`${selectedBody.name} information`}>
        <div className="panel-heading info-heading">
          <div className="eyebrow"><span style={{ background: selectedBody.accent }} /> SELECTED OBJECT</div>
          <button className="panel-close" onClick={() => setInfoOpen(false)} aria-label="Close information panel"><X size={17} /></button>
        </div>
        <div className="planet-title">
          <div className={`hero-glyph glyph-${selectedBody.id}`} style={{ "--body-color": selectedBody.color, "--body-accent": selectedBody.accent } as React.CSSProperties} />
          <div>
            <h1>{selectedBody.name}</h1>
            <p>{selectedBody.type}</p>
          </div>
        </div>
        <div className="object-actions">
          <button className="primary-action" onClick={() => selectBody(selected, false)}><Focus size={15} /> Travel here</button>
          <button className={following ? "secondary-action active" : "secondary-action"} onClick={() => selectBody(selected, !following)}>
            <LocateFixed size={15} /> {following ? "Following" : "Follow"}
          </button>
        </div>
        <div className="data-grid">
          <div><small>DIAMETER</small><strong>{formatNumber(selectedBody.diameter)} km</strong></div>
          <div><small>KNOWN MOONS</small><strong>{selectedBody.moons}</strong></div>
          <div className="wide"><small>DISTANCE</small><strong>{selectedBody.distance}</strong></div>
          <div><small>ORBITAL PERIOD</small><strong>{formatPeriod(selectedBody.orbitalDays)}</strong></div>
          <div><small>ROTATION</small><strong>{formatRotation(selectedBody.rotationHours)}</strong></div>
          <div className="wide"><small>AVERAGE TEMPERATURE</small><strong>{selectedBody.temperature}</strong></div>
        </div>
        <div className="fact-card">
          <Sparkles size={16} />
          <div><small>FIELD NOTE</small><p>{selectedBody.fact}</p></div>
        </div>
        <p className="approx-note"><BadgeInfo size={13} /> Values marked ≈ are rounded estimates.</p>
      </aside>

      <section className="view-tools glass-panel" aria-label="View controls">
        <div className="tool-group">
          <span className="tool-label">ORBITS</span>
          <div className="mini-segmented">
            <button className={orbitMode === "all" ? "active" : ""} onClick={() => setOrbitMode("all")}>All</button>
            <button className={orbitMode === "selected" ? "active" : ""} onClick={() => setOrbitMode("selected")}>Focus</button>
            <button className={orbitMode === "none" ? "active" : ""} onClick={() => setOrbitMode("none")}>Off</button>
          </div>
        </div>
        <span className="tool-divider" />
        <IconButton label={labelsVisible ? "Hide object labels" : "Show object labels"} active={labelsVisible} onClick={() => setLabelsVisible((value) => !value)}>
          {labelsVisible ? <Eye size={17} /> : <EyeOff size={17} />}
        </IconButton>
        <IconButton label="Reset camera view" onClick={showOverview}><Aperture size={17} /></IconButton>
      </section>

      <section className="time-console glass-panel" aria-label="Simulation time controls">
        <div className="time-main">
          <IconButton label={paused ? "Resume simulation" : "Pause simulation"} active={paused} onClick={togglePause} className="play-button">
            {paused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
          </IconButton>
          <button
            className={`direction-button ${direction < 0 ? "active" : ""}`}
            onClick={() => {
              const next = direction * -1;
              setDirection(next);
              directionRef.current = next;
            }}
          >
            <RotateCcw size={16} />
            <span>{direction < 0 ? "Reverse" : "Forward"}</span>
          </button>
          <div className="speed-presets">
            {[1, 10, 100, 1000].map((value) => (
              <button key={value} className={speed === value ? "active" : ""} onClick={() => setPreset(value)}>{value.toLocaleString()}×</button>
            ))}
          </div>
          <div className="custom-speed">
            <span>CUSTOM</span>
            <input
              type="range"
              min="1"
              max="5000"
              step="1"
              value={customSpeed}
              onChange={(event) => {
                const value = Number(event.target.value);
                setCustomSpeed(value);
                setPreset(value);
              }}
              aria-label="Custom simulation speed"
            />
            <output>{customSpeed.toLocaleString()}×</output>
          </div>
        </div>
        <div className="speed-status">
          <span className="speed-value">{direction < 0 ? "−" : ""}{speed.toLocaleString()}×</span>
          <span>{speed === 1 ? "1 sim hour / real second" : `${(speed / 24).toLocaleString(undefined, { maximumFractionDigits: 1 })} sim days / real second`}</span>
        </div>
        <IconButton label="Reset simulation and view" onClick={resetSimulation}><RefreshCcw size={17} /></IconButton>
      </section>

      <div className="mobile-quickbar glass-panel">
        <IconButton label="Open navigator" active={navigatorOpen} onClick={() => setNavigatorOpen((value) => !value)}><ListFilter size={18} /></IconButton>
        <IconButton label="Selected object information" active={infoOpen} onClick={() => setInfoOpen((value) => !value)}><CircleDot size={18} /></IconButton>
        <IconButton label="Compare celestial bodies" active={comparisonOpen} onClick={() => setComparisonOpen(true)}><ArrowLeftRight size={18} /></IconButton>
        <IconButton label="Start guided tour" active={tourActive} onClick={startTour}><Route size={18} /></IconButton>
        <IconButton label="About this model" active={aboutOpen} onClick={() => setAboutOpen(true)}><BookOpen size={18} /></IconButton>
        <IconButton label="Full Solar System overview" onClick={showOverview}><Telescope size={18} /></IconButton>
      </div>

      {scaleMode === "relative" && (
        <div className="scale-notice glass-panel"><BadgeInfo size={14} /><span><strong>Relative size mode</strong> · Body diameters share one ratio. Orbital distances remain compressed.</span></div>
      )}

      {tourActive && (
        <section className="tour-card glass-panel" aria-label="Guided Solar System tour" aria-live="polite">
          <div className="tour-progress-row">
            <span>{tourStop.kicker}</span>
            <strong>{String(tourIndex + 1).padStart(2, "0")} / {String(TOUR_STOPS.length).padStart(2, "0")}</strong>
          </div>
          <div className="tour-progress-track"><span style={{ width: `${((tourIndex + 1) / TOUR_STOPS.length) * 100}%` }} /></div>
          <h2>{tourStop.title}</h2>
          <p>{tourStop.description}</p>
          <div className="tour-controls">
            <button onClick={() => visitTourStop(tourIndex - 1)} disabled={tourIndex === 0} aria-label="Previous tour stop"><SkipBack size={16} /></button>
            <button className="tour-pause" onClick={() => setTourPaused((value) => !value)}>
              {tourPaused ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />}
              {tourPaused ? "Continue tour" : "Pause tour"}
            </button>
            <button onClick={() => visitTourStop(tourIndex + 1)} disabled={tourIndex === TOUR_STOPS.length - 1} aria-label="Next tour stop"><SkipForward size={16} /></button>
            <button className="tour-exit" onClick={exitTour}>Exit</button>
          </div>
        </section>
      )}

      {comparisonOpen && (
        <div className="modal-backdrop feature-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setComparisonOpen(false); }}>
          <section className="comparison-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="comparison-title">
            <div className="feature-modal-header">
              <div>
                <span><Scale size={14} /> ANALYSIS TOOL</span>
                <h2 id="comparison-title">Compare worlds</h2>
                <p>Put two celestial bodies side by side.</p>
              </div>
              <button className="panel-close" onClick={() => setComparisonOpen(false)} aria-label="Close comparison"><X size={18} /></button>
            </div>

            <div className="compare-selectors">
              <label>
                <small>OBJECT A</small>
                <span className="select-wrap">
                  <i style={{ background: compareBodyA.accent }} />
                  <select
                    value={compareA}
                    onChange={(event) => {
                      const next = event.target.value as BodyId;
                      if (next === compareB) setCompareB(compareA);
                      setCompareA(next);
                    }}
                    aria-label="First comparison object"
                  >
                    {BODIES.map((body) => <option key={body.id} value={body.id}>{body.name}</option>)}
                  </select>
                </span>
              </label>
              <button
                className="swap-button"
                onClick={() => { setCompareA(compareB); setCompareB(compareA); }}
                aria-label="Swap comparison objects"
              ><ArrowLeftRight size={17} /></button>
              <label>
                <small>OBJECT B</small>
                <span className="select-wrap">
                  <i style={{ background: compareBodyB.accent }} />
                  <select
                    value={compareB}
                    onChange={(event) => {
                      const next = event.target.value as BodyId;
                      if (next === compareA) setCompareA(compareB);
                      setCompareB(next);
                    }}
                    aria-label="Second comparison object"
                  >
                    {BODIES.map((body) => <option key={body.id} value={body.id}>{body.name}</option>)}
                  </select>
                </span>
              </label>
            </div>

            <div className="size-comparison" aria-label="Visual diameter comparison">
              <div className="circle-column">
                <div className="circle-stage">
                  <div
                    className={`comparison-circle glyph-${compareBodyA.id}`}
                    style={{
                      width: comparisonCircleSize(compareBodyA.diameter),
                      height: comparisonCircleSize(compareBodyA.diameter),
                      "--body-color": compareBodyA.color,
                      "--body-accent": compareBodyA.accent,
                    } as React.CSSProperties}
                  />
                </div>
                <strong>{compareBodyA.name}</strong>
              </div>
              <div className="ratio-readout"><small>DIAMETER RATIO</small><strong>{diameterRatio.toFixed(diameterRatio >= 100 ? 0 : 1)} : 1</strong><span>Larger to smaller</span></div>
              <div className="circle-column">
                <div className="circle-stage">
                  <div
                    className={`comparison-circle glyph-${compareBodyB.id}`}
                    style={{
                      width: comparisonCircleSize(compareBodyB.diameter),
                      height: comparisonCircleSize(compareBodyB.diameter),
                      "--body-color": compareBodyB.color,
                      "--body-accent": compareBodyB.accent,
                    } as React.CSSProperties}
                  />
                </div>
                <strong>{compareBodyB.name}</strong>
              </div>
            </div>
            {diameterRatio > 13 && <p className="minimum-marker-note"><BadgeInfo size={12} /> The smaller object uses a minimum on-screen marker; the numeric ratio remains exact.</p>}

            <div className="comparison-table" role="table" aria-label={`${compareBodyA.name} and ${compareBodyB.name} comparison`}>
              <div className="comparison-row comparison-table-head" role="row">
                <span role="columnheader">METRIC</span><strong role="columnheader">{compareBodyA.name}</strong><strong role="columnheader">{compareBodyB.name}</strong>
              </div>
              {comparisonRows.map((row) => (
                <div className="comparison-row" role="row" key={row.label}>
                  <span role="rowheader">{row.label}</span><strong role="cell">{row.a}</strong><strong role="cell">{row.b}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {aboutOpen && (
        <div className="modal-backdrop feature-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setAboutOpen(false); }}>
          <section className="about-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <div className="feature-modal-header">
              <div>
                <span><BookOpen size={14} /> MODEL NOTES</span>
                <h2 id="about-title">About this model</h2>
                <p>Where astronomy ends and visualization begins.</p>
              </div>
              <button className="panel-close" onClick={() => setAboutOpen(false)} aria-label="Close model information"><X size={18} /></button>
            </div>
            <div className="about-hero">
              <Orbit size={34} />
              <div><strong>Scientifically informed.<br />Intentionally explorable.</strong><p>Real Solar System scale spans too many orders of magnitude for planets and orbits to remain visible together.</p></div>
            </div>
            <div className="model-mode-grid">
              <article>
                <span>01</span><h3>Exploration Scale</h3>
                <p>Planet sizes are individually exaggerated and orbital radii are heavily compressed. The result preserves the system’s order and makes every world easy to find.</p>
              </article>
              <article>
                <span>02</span><h3>Relative Scale</h3>
                <p>Body diameters use a common ratio: the Sun is about 109 Earth diameters wide. Orbit distances still use a separate compressed curve, and the Earth–Moon gap is reduced.</p>
              </article>
            </div>
            <div className="honesty-list">
              <div><i /> <span><strong>Motion</strong> uses circularized, near-coplanar paths driven by real sidereal periods; it is not a live precision ephemeris.</span></div>
              <div><i /> <span><strong>Time</strong> begins at the J2000 epoch. At 1×, one real second advances one simulated hour.</span></div>
              <div><i /> <span><strong>Appearance</strong> is procedural and interpretive. Atmospheres, shadows, bands, storms and terrain are designed to be recognizable, not cartographically exact.</span></div>
              <div><i /> <span><strong>Values</strong> are rounded astronomical reference values. Moon counts reflect currently recognized objects and can change as classifications evolve.</span></div>
            </div>
            <div className="about-footer"><BadgeInfo size={14} /><p>Diameters, periods, masses, gravity and temperatures are based on commonly published NASA planetary fact-sheet values. “≈” marks estimates or rounded values.</p></div>
          </section>
        </div>
      )}

      {loading && (
        <div className="loading-screen">
          <div className="loading-orbit"><span /><span /><i /></div>
          <div className="loading-wordmark">ORBITARIUM</div>
          <p>Calibrating ephemerides</p>
          <div className="loading-bar"><span /></div>
        </div>
      )}

      {!loading && introOpen && (
        <div className="modal-backdrop intro-backdrop">
          <section className="intro-card glass-panel" role="dialog" aria-modal="true" aria-labelledby="intro-title">
            <button className="panel-close intro-close" onClick={() => setIntroOpen(false)} aria-label="Close introduction"><X size={18} /></button>
            <div className="intro-icon"><Orbit size={28} /></div>
            <small>INTERACTIVE ORRERY · J2000</small>
            <h2 id="intro-title">The Solar System is yours to explore.</h2>
            <p>Drag to orbit the camera, scroll or pinch to zoom, and select any world to travel there. Time is simulated from a common astronomical epoch.</p>
            <div className="gesture-grid">
              <div><span className="gesture-icon drag-gesture" /><strong>Orbit</strong><small>Drag the scene</small></div>
              <div><span className="gesture-icon scroll-gesture"><Minus /><Minus /></span><strong>Zoom</strong><small>Scroll or pinch</small></div>
              <div><span className="gesture-icon click-gesture" /><strong>Inspect</strong><small>Select a world</small></div>
            </div>
            <button className="launch-button" onClick={() => setIntroOpen(false)}>Begin exploration <span>↗</span></button>
            <div className="keyboard-hint"><Keyboard size={14} /> <span><kbd>Space</kbd> pause · <kbd>R</kbd> overview · <kbd>O</kbd> orbits · <kbd>L</kbd> labels</span></div>
          </section>
        </div>
      )}
    </main>
  );
}
