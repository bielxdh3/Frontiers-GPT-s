import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/* Planet surface                                                      */
/* ------------------------------------------------------------------ */

const planetVert = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vPole;
varying vec2 vUv;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vPole = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const planetFrag = /* glsl */ `
uniform sampler2D map;
uniform float hasMap;
uniform vec3 baseColor;
uniform sampler2D normalMap;
uniform float hasNormal;
uniform sampler2D nightMap;
uniform float hasNight;
uniform float nightIntensity;
uniform vec3 sunPos;
uniform float ambient;
uniform float hasRingShadow;
uniform sampler2D ringTex;
uniform float ringInner;
uniform float ringOuter;
uniform vec3 ringCenter;
uniform vec3 ringNormal;
uniform vec3 atmoColor;
uniform float atmoIntensity;
uniform float glossScale;
uniform float flatShade;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vPole;
varying vec2 vUv;

void main() {
  vec3 Ng = normalize(vWorldNormal);
  vec3 L = normalize(sunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec4 tex = hasMap > 0.5 ? texture2D(map, vUv) : vec4(baseColor, 0.05);
  vec3 albedo = tex.rgb;
  float gloss = tex.a * glossScale;
  vec3 N = Ng;
  if (hasNormal > 0.5) {
    vec3 tn = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
    vec3 east = normalize(cross(vPole, Ng));
    vec3 north = cross(Ng, east);
    N = normalize(east * tn.x + north * tn.y + Ng * tn.z);
  }
  float ndlG = dot(Ng, L);
  float ndl = dot(N, L);
  float diffuse = max(ndl, 0.0);
  // Soft terminator on bodies with atmospheres (light scattering).
  diffuse += atmoIntensity * 0.10 * smoothstep(-0.25, 0.15, ndlG) * (1.0 - clamp(ndlG, 0.0, 1.0));
  // Analytical ring shadow: does the ray toward the Sun cross the ring annulus?
  float shadow = 1.0;
  if (hasRingShadow > 0.5) {
    float denom = dot(L, ringNormal);
    if (abs(denom) > 1e-4) {
      float s = dot(ringCenter - vWorldPos, ringNormal) / denom;
      if (s > 0.0) {
        vec3 hit = vWorldPos + L * s;
        float r = length(hit - ringCenter);
        if (r > ringInner && r < ringOuter) {
          float a = texture2D(ringTex, vec2((r - ringInner) / (ringOuter - ringInner), 0.5)).a;
          shadow = 1.0 - a * 0.92;
        }
      }
    }
  }
  vec3 color = albedo * (diffuse * shadow + ambient);
  // Specular (oceans / ice) from the gloss mask.
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 90.0) * gloss * 0.55 * smoothstep(0.0, 0.1, ndlG) * shadow;
  color += vec3(1.0, 0.97, 0.9) * spec;
  // Night lights only on the dark side.
  if (hasNight > 0.5) {
    float night = 1.0 - smoothstep(-0.12, 0.04, ndlG);
    color += texture2D(nightMap, vUv).rgb * night * nightIntensity;
  }
  // Atmospheric rim tint on the day side.
  if (atmoIntensity > 0.0) {
    float fres = pow(1.0 - max(dot(Ng, V), 0.0), 3.0);
    color += atmoColor * fres * atmoIntensity * 0.45 * (clamp(ndlG, 0.0, 1.0) + 0.05);
  }
  if (flatShade > 0.5) color = albedo * (0.25 + 0.75 * max(ndlG, 0.0) + ambient);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export interface PlanetMaterialOptions {
  color: string;
  atmoColor?: string;
  atmoIntensity?: number;
}

export function createPlanetMaterial(opts: PlanetMaterialOptions): THREE.ShaderMaterial {
  const blank = new THREE.Texture();
  return new THREE.ShaderMaterial({
    vertexShader: planetVert,
    fragmentShader: planetFrag,
    uniforms: {
      map: { value: blank }, hasMap: { value: 0 }, baseColor: { value: new THREE.Color(opts.color) },
      normalMap: { value: blank }, hasNormal: { value: 0 },
      nightMap: { value: blank }, hasNight: { value: 0 }, nightIntensity: { value: 0.9 },
      sunPos: { value: new THREE.Vector3() }, ambient: { value: 0.035 },
      hasRingShadow: { value: 0 }, ringTex: { value: blank }, ringInner: { value: 1 }, ringOuter: { value: 2 },
      ringCenter: { value: new THREE.Vector3() }, ringNormal: { value: new THREE.Vector3(0, 1, 0) },
      atmoColor: { value: new THREE.Color(opts.atmoColor ?? '#ffffff') }, atmoIntensity: { value: opts.atmoIntensity ?? 0 },
      glossScale: { value: 1 }, flatShade: { value: 0 },
    },
  });
}

/* ------------------------------------------------------------------ */
/* Clouds                                                              */
/* ------------------------------------------------------------------ */

const cloudFrag = /* glsl */ `
uniform sampler2D map;
uniform vec3 sunPos;
uniform float opacity;
uniform float ambient;
uniform float drift;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUv;
void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(sunPos - vWorldPos);
  float ndl = dot(N, L);
  vec4 tex = texture2D(map, vec2(vUv.x + drift, vUv.y));
  float light = max(ndl, 0.0) + ambient * 2.0;
  float a = tex.a * opacity * smoothstep(-0.25, 0.05, ndl + 0.3);
  gl_FragColor = vec4(tex.rgb * light, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createCloudMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: planetVert,
    fragmentShader: cloudFrag,
    transparent: true,
    depthWrite: false,
    uniforms: {
      map: { value: new THREE.Texture() }, sunPos: { value: new THREE.Vector3() }, opacity: { value: 0.95 }, ambient: { value: 0.035 }, drift: { value: 0 },
    },
  });
}

/* ------------------------------------------------------------------ */
/* Atmosphere shell                                                    */
/* ------------------------------------------------------------------ */

const atmoFrag = /* glsl */ `
uniform vec3 color;
uniform float intensity;
uniform vec3 sunPos;
uniform float power;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(sunPos - vWorldPos);
  float rim = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), power);
  float lit = smoothstep(-0.35, 0.35, dot(N, L));
  float a = rim * intensity * (0.08 + 0.92 * lit);
  gl_FragColor = vec4(color * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createAtmosphereMaterial(color: string, intensity: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: planetVert,
    fragmentShader: atmoFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color(color) }, intensity: { value: intensity }, sunPos: { value: new THREE.Vector3() }, power: { value: 4.0 } },
  });
}

/* ------------------------------------------------------------------ */
/* Sun                                                                 */
/* ------------------------------------------------------------------ */

const sunFrag = /* glsl */ `
uniform sampler2D map;
uniform float hasMap;
uniform float time;
uniform float brightness;
uniform vec3 tint;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUv;
void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float mu = clamp(dot(N, V), 0.0, 1.0);
  vec3 c = tint;
  if (hasMap > 0.5) {
    vec3 a = texture2D(map, vec2(vUv.x + time * 0.004, vUv.y)).rgb;
    vec3 b = texture2D(map, vec2(vUv.x * 1.0 - time * 0.006 + 0.37, clamp(vUv.y + 0.02 * sin(time * 0.3), 0.0, 1.0))).rgb;
    c = mix(a, b, 0.5);
  }
  float limb = 0.35 + 0.65 * pow(mu, 0.55);
  gl_FragColor = vec4(c * limb * brightness, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createSunMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: planetVert,
    fragmentShader: sunFrag,
    uniforms: { map: { value: new THREE.Texture() }, hasMap: { value: 0 }, time: { value: 0 }, brightness: { value: 2.2 }, tint: { value: new THREE.Color('#ffb347') } },
  });
}

/* ------------------------------------------------------------------ */
/* Rings                                                               */
/* ------------------------------------------------------------------ */

const ringVert = /* glsl */ `
varying vec3 vWorldPos;
varying float vR;
void main() {
  vR = length(position.xy);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const ringFrag = /* glsl */ `
uniform sampler2D map;
uniform float inner;
uniform float outer;
uniform vec3 sunPos;
uniform vec3 planetCenter;
uniform float planetRadius;
uniform vec3 ringNormal;
uniform float opacity;
uniform float boost;
varying vec3 vWorldPos;
varying float vR;
void main() {
  float t = (vR - inner) / (outer - inner);
  if (t < 0.0 || t > 1.0) discard;
  vec4 tex = texture2D(map, vec2(t, 0.5));
  float a = clamp(tex.a * boost, 0.0, 1.0);
  if (a < 0.004) discard;
  vec3 L = normalize(sunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float sideSun = dot(ringNormal, L);
  float sideCam = dot(ringNormal, V);
  float sameSide = step(0.0, sideSun * sideCam);
  float grazing = pow(abs(sideSun), 0.35);
  // Lit face vs. translucent unlit face.
  float light = mix(0.28 * (1.0 - a * 0.6), 1.0, sameSide) * (0.25 + 0.75 * grazing);
  // Planet shadow across the ring plane.
  vec3 d = vWorldPos - planetCenter;
  float along = dot(d, L);
  float shadow = 1.0;
  if (along < 0.0) {
    float perp = length(d - L * along);
    shadow = smoothstep(planetRadius * 0.985, planetRadius * 1.015, perp);
  }
  vec3 color = tex.rgb * (light * shadow + 0.02);
  gl_FragColor = vec4(color, a * opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createRingMaterial(tex: THREE.Texture, inner: number, outer: number, boost = 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: ringVert,
    fragmentShader: ringFrag,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      map: { value: tex }, inner: { value: inner }, outer: { value: outer }, sunPos: { value: new THREE.Vector3() },
      planetCenter: { value: new THREE.Vector3() }, planetRadius: { value: 1 }, ringNormal: { value: new THREE.Vector3(0, 1, 0) },
      opacity: { value: 1 }, boost: { value: boost },
    },
  });
}

/* ------------------------------------------------------------------ */
/* Points with per-vertex size and color (stars, tails)                */
/* ------------------------------------------------------------------ */

export const pointVert = /* glsl */ `
attribute float size;
attribute vec3 color;
attribute float alpha;
uniform float pixelRatio;
uniform float sizeScale;
uniform float attenuate;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = color;
  vAlpha = alpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float s = size * sizeScale * pixelRatio;
  if (attenuate > 0.5) s *= 300.0 / max(-mv.z, 0.001);
  gl_PointSize = clamp(s, 0.5, 64.0);
  gl_Position = projectionMatrix * mv;
}
`;

export const pointFrag = /* glsl */ `
uniform float intensity;
uniform float soft;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d) * 2.0;
  float a = soft > 0.5 ? pow(max(0.0, 1.0 - r), 2.0) : smoothstep(1.0, 0.55, r);
  gl_FragColor = vec4(vColor * intensity, a * vAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createPointsMaterial(opts: { attenuate?: boolean; soft?: boolean; additive?: boolean; sizeScale?: number; intensity?: number } = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: pointVert,
    fragmentShader: pointFrag,
    transparent: true,
    depthWrite: false,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      pixelRatio: { value: 1 }, sizeScale: { value: opts.sizeScale ?? 1 }, attenuate: { value: opts.attenuate ? 1 : 0 },
      intensity: { value: opts.intensity ?? 1 }, soft: { value: opts.soft ? 1 : 0 },
    },
  });
}
