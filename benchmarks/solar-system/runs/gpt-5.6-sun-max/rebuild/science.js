(function (root) {
  "use strict";

  const AU_KM = 149597870.7;
  const DAY_SECONDS = 86400;
  const DAY_MS = DAY_SECONDS * 1000;
  const JULIAN_YEAR_DAYS = 365.25;
  const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
  const G = 6.67430e-11;
  const C_KM_S = 299792.458;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const mod = (value, base) => ((value % base) + base) % base;
  const degToRad = (value) => value * Math.PI / 180;
  const radToDeg = (value) => value * 180 / Math.PI;
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  const scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  const length = (a) => Math.hypot(a.x, a.y, a.z);
  const normalize = (a) => {
    const len = length(a);
    return len > 1e-15 ? scale(a, 1 / len) : { x: 0, y: 0, z: 0 };
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpVec = (a, b, t) => ({ x: lerp(a.x,b.x,t), y: lerp(a.y,b.y,t), z: lerp(a.z,b.z,t) });

  function hashString(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function solveKepler(meanAnomalyRad, eccentricity, tolerance = 1e-10, maxIterations = 16) {
    if (!Number.isFinite(meanAnomalyRad) || !Number.isFinite(eccentricity) || eccentricity < 0 || eccentricity >= 1) {
      return { ok: false, value: NaN, iterations: 0 };
    }
    const M = mod(meanAnomalyRad + Math.PI, Math.PI * 2) - Math.PI;
    let E = eccentricity < 0.8 ? M : Math.PI * Math.sign(M || 1);
    for (let i = 0; i < maxIterations; i += 1) {
      const residual = E - eccentricity * Math.sin(E) - M;
      const derivative = 1 - eccentricity * Math.cos(E);
      if (Math.abs(derivative) < 1e-14) return { ok: false, value: E, iterations: i + 1 };
      const delta = residual / derivative;
      E -= delta;
      if (Math.abs(delta) <= tolerance) return { ok: true, value: E, iterations: i + 1 };
    }
    return { ok: false, value: E, iterations: maxIterations };
  }

  function rotateOrbitalPlane(xPrime, yPrime, inclinationDeg, periDeg, nodeDeg) {
    const I = degToRad(inclinationDeg || 0);
    const omega = degToRad((periDeg || 0) - (nodeDeg || 0));
    const node = degToRad(nodeDeg || 0);
    const cw = Math.cos(omega), sw = Math.sin(omega);
    const cO = Math.cos(node), sO = Math.sin(node);
    const cI = Math.cos(I), sI = Math.sin(I);
    return {
      x: (cw * cO - sw * sO * cI) * xPrime + (-sw * cO - cw * sO * cI) * yPrime,
      y: (sw * sI) * xPrime + (cw * sI) * yPrime,
      z: (cw * sO + sw * cO * cI) * xPrime + (-sw * sO + cw * cO * cI) * yPrime
    };
  }

  function jplPlanetPosition(body, dateMs) {
    if (!body || !body.jpl) return null;
    const T = (dateMs - J2000_MS) / DAY_MS / 36525;
    const values = body.jpl.base.map((base, index) => base + body.jpl.rate[index] * T);
    const [a, e, I, L, longPeri, longNode] = values;
    const meanAnomaly = degToRad(mod(L - longPeri, 360));
    const solved = solveKepler(meanAnomaly, e);
    if (!solved.ok) return { x: NaN, y: NaN, z: NaN, solverOk: false, iterations: solved.iterations };
    const xPrime = a * (Math.cos(solved.value) - e);
    const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(solved.value);
    return Object.assign(rotateOrbitalPlane(xPrime, yPrime, I, longPeri, longNode), { solverOk: true, iterations: solved.iterations });
  }

  function genericOrbitPosition(body, dateMs, semiMajorOverride) {
    const a = semiMajorOverride || body.aAu || ((body.distanceKm || 0) / AU_KM);
    if (!a || !body.periodDays) return { x: 0, y: 0, z: 0, solverOk: true, iterations: 0 };
    const elapsedDays = (dateMs - J2000_MS) / DAY_MS;
    const signedPeriod = body.periodDays;
    const meanDeg = mod((body.phase || 0) + elapsedDays / signedPeriod * 360, 360);
    const e = clamp(Math.abs(body.e || 0), 0, .96);
    const solved = solveKepler(degToRad(meanDeg), e);
    if (!solved.ok) return { x: NaN, y: NaN, z: NaN, solverOk: false, iterations: solved.iterations };
    const xPrime = a * (Math.cos(solved.value) - e);
    const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(solved.value);
    const hash = hashString(body.id);
    const node = body.node == null ? hash % 360 : body.node;
    const peri = body.peri == null ? (body.phase || 0) * .43 + (hash % 73) : body.peri;
    return Object.assign(rotateOrbitalPlane(xPrime, yPrime, body.inc || 0, peri, node), { solverOk: true, iterations: solved.iterations });
  }

  function localMoonOffset(body, dateMs) {
    const aAu = (body.distanceKm || 0) / AU_KM;
    const raw = genericOrbitPosition(body, dateMs, aAu);
    // Rotate each satellite system around a stable, parent-specific axis so local systems do not all overlap.
    const parentHash = hashString(body.parent || body.id);
    const angle = degToRad(parentHash % 360);
    return {
      x: raw.x * Math.cos(angle) - raw.z * Math.sin(angle),
      y: raw.y,
      z: raw.x * Math.sin(angle) + raw.z * Math.cos(angle),
      solverOk: raw.solverOk,
      iterations: raw.iterations
    };
  }

  function physicalPosition(bodyOrId, dateMs, data, cache) {
    const body = typeof bodyOrId === "string" ? data.getBody(bodyOrId) : bodyOrId;
    if (!body) return null;
    const memo = cache || new Map();
    if (memo.has(body.id)) return memo.get(body.id);
    let position;
    if (body.id === "sun") {
      position = { x: 0, y: 0, z: 0, solverOk: true, iterations: 0 };
    } else if (body.parent && body.parent !== "sun") {
      const parent = physicalPosition(body.parent, dateMs, data, memo);
      const offset = localMoonOffset(body, dateMs);
      position = add(parent, offset);
      position.solverOk = parent.solverOk !== false && offset.solverOk !== false;
      position.iterations = offset.iterations;
    } else if (body.jpl) {
      position = jplPlanetPosition(body, dateMs);
    } else {
      position = genericOrbitPosition(body, dateMs);
    }
    memo.set(body.id, position);
    return position;
  }

  function allPhysicalPositions(dateMs, data) {
    const cache = new Map();
    data.bodies.forEach((body) => physicalPosition(body, dateMs, data, cache));
    return cache;
  }

  function displayRadius(body, mode = "exploration") {
    if (!body || !body.radiusKm) return 2;
    if (body.id === "sun") return mode === "relative" ? 18 : 21;
    const earthRatio = body.radiusKm / 6371.0084;
    if (mode === "relative") {
      const trueRelative = earthRatio * .17;
      return Math.max(2.15, Math.min(13, trueRelative));
    }
    if (body.category === "moon") return clamp(2.4 + Math.pow(earthRatio, .38) * 2.4, 2.7, 6.2);
    if (body.type === "asteroid" || body.type === "comet") return body.type === "comet" ? 3.3 : 3.8;
    return clamp(3.5 + Math.pow(earthRatio, .42) * 2.25, 4.1, 13.2);
  }

  function mapHeliocentric(position, mode) {
    const radius = length(position);
    if (radius < 1e-12) return { x: 0, y: 0, z: 0 };
    const direction = scale(position, 1 / radius);
    const mappedRadius = mode === "relative"
      ? radius * 10
      : 25 + 43 * Math.log1p(radius * 1.7);
    return scale(direction, mappedRadius);
  }

  function displayPosition(bodyOrId, dateMs, data, mode = "exploration", physicalCache, displayCache) {
    const body = typeof bodyOrId === "string" ? data.getBody(bodyOrId) : bodyOrId;
    if (!body) return null;
    const pCache = physicalCache || allPhysicalPositions(dateMs, data);
    const dCache = displayCache || new Map();
    if (dCache.has(body.id)) return dCache.get(body.id);
    let position;
    if (body.id === "sun") {
      position = { x: 0, y: 0, z: 0 };
    } else if (body.parent && body.parent !== "sun") {
      const parentDisplay = displayPosition(body.parent, dateMs, data, mode, pCache, dCache);
      const parentPhysical = pCache.get(body.parent);
      const bodyPhysical = pCache.get(body.id);
      const localDirection = normalize(sub(bodyPhysical, parentPhysical));
      const distanceKm = body.distanceKm || length(sub(bodyPhysical, parentPhysical)) * AU_KM;
      // Satellite distances are locally compressed in both overview modes and explicitly labeled as such.
      const localDistance = 16 + 10.5 * Math.log1p(distanceKm / 80000);
      position = add(parentDisplay, scale(localDirection, localDistance));
    } else {
      position = mapHeliocentric(pCache.get(body.id), mode);
    }
    dCache.set(body.id, position);
    return position;
  }

  function allDisplayPositions(dateMs, data, mode, physicalCache) {
    const pCache = physicalCache || allPhysicalPositions(dateMs, data);
    const cache = new Map();
    data.bodies.forEach((body) => displayPosition(body, dateMs, data, mode, pCache, cache));
    return cache;
  }

  function sampleOrbit(body, dateMs, data, mode = "exploration", samples = 120) {
    if (!body || body.id === "sun" || !body.periodDays) return [];
    const points = [];
    const parent = body.parent && body.parent !== "sun" ? data.getBody(body.parent) : null;
    const physicalBase = allPhysicalPositions(dateMs, data);
    const parentPhysical = parent ? physicalBase.get(parent.id) : null;
    const parentDisplay = parent ? displayPosition(parent, dateMs, data, mode, physicalBase, new Map()) : null;
    for (let i = 0; i <= samples; i += 1) {
      const sampleMs = dateMs + body.periodDays * DAY_MS * (i / samples);
      if (parent) {
        const offset = localMoonOffset(body, sampleMs);
        const direction = normalize(offset);
        const localDistance = 16 + 10.5 * Math.log1p((body.distanceKm || 0) / 80000);
        points.push(add(parentDisplay, scale(direction, localDistance)));
      } else {
        const physical = body.jpl ? jplPlanetPosition(body, sampleMs) : genericOrbitPosition(body, sampleMs);
        points.push(mapHeliocentric(physical, mode));
      }
    }
    return points;
  }

  function distanceKm(a, b) { return length(sub(a, b)) * AU_KM; }
  function lightTimeSeconds(km) { return km / C_KM_S; }

  function distanceBetween(bodyA, bodyB, dateMs, data) {
    const cache = allPhysicalPositions(dateMs, data);
    const a = cache.get(typeof bodyA === "string" ? bodyA : bodyA.id);
    const b = cache.get(typeof bodyB === "string" ? bodyB : bodyB.id);
    if (!a || !b) return null;
    const km = distanceKm(a, b);
    return { km, au: km / AU_KM, lightSeconds: lightTimeSeconds(km), dateMs };
  }

  function gravityFromMassRadius(massKg, radiusM) {
    if (![massKg, radiusM].every(Number.isFinite) || massKg <= 0 || radiusM <= 0) return NaN;
    return G * massKg / (radiusM * radiusM);
  }

  function weightNewton(massKg, gravityMs2) {
    if (![massKg, gravityMs2].every(Number.isFinite) || massKg < 0 || gravityMs2 < 0) return NaN;
    return massKg * gravityMs2;
  }

  function twoBodyPeriodSeconds(centralMassKg, semiMajorAxisM) {
    if (![centralMassKg, semiMajorAxisM].every(Number.isFinite) || centralMassKg <= 0 || semiMajorAxisM <= 0) return NaN;
    return 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxisM, 3) / (G * centralMassKg));
  }

  function orbitSandbox(centralMassKg, semiMajorAxisKm, eccentricity) {
    if (![centralMassKg, semiMajorAxisKm, eccentricity].every(Number.isFinite) || centralMassKg <= 0 || semiMajorAxisKm <= 0 || eccentricity < 0 || eccentricity >= 1) {
      return { ok: false };
    }
    const periodSeconds = twoBodyPeriodSeconds(centralMassKg, semiMajorAxisKm * 1000);
    const mu = G * centralMassKg;
    const aM = semiMajorAxisKm * 1000;
    const periapsisKm = semiMajorAxisKm * (1 - eccentricity);
    const apoapsisKm = semiMajorAxisKm * (1 + eccentricity);
    const periapsisSpeedKmS = Math.sqrt(mu * (2 / (periapsisKm * 1000) - 1 / aM)) / 1000;
    const apoapsisSpeedKmS = Math.sqrt(mu * (2 / (apoapsisKm * 1000) - 1 / aM)) / 1000;
    return { ok: true, periodSeconds, periapsisKm, apoapsisKm, periapsisSpeedKmS, apoapsisSpeedKmS };
  }

  function daylightHours(axialTiltDeg, latitudeDeg, orbitalLongitudeDeg) {
    const tilt = degToRad(clamp(axialTiltDeg, 0, 90));
    const latitude = degToRad(clamp(latitudeDeg, -90, 90));
    const longitude = degToRad(orbitalLongitudeDeg);
    const declination = Math.asin(Math.sin(tilt) * Math.sin(longitude));
    const argument = -Math.tan(latitude) * Math.tan(declination);
    if (argument <= -1) return { hours: 24, state: "polar-day", declinationDeg: radToDeg(declination) };
    if (argument >= 1) return { hours: 0, state: "polar-night", declinationDeg: radToDeg(declination) };
    const hourAngle = Math.acos(argument);
    return { hours: 24 * hourAngle / Math.PI, state: "normal", declinationDeg: radToDeg(declination) };
  }

  function lunarPhase(phaseDeg) {
    const angle = degToRad(mod(phaseDeg, 360));
    const illuminatedFraction = (1 - Math.cos(angle)) / 2;
    const index = Math.round(mod(phaseDeg, 360) / 45) % 8;
    const keys = ["new","waxing-crescent","first-quarter","waxing-gibbous","full","waning-gibbous","last-quarter","waning-crescent"];
    return { angleRad: angle, illuminatedFraction, waxing: mod(phaseDeg,360) < 180, key: keys[index] };
  }

  function angularSeparation(observer, a, b) {
    const va = sub(a, observer), vb = sub(b, observer);
    const denom = length(va) * length(vb);
    if (denom <= 1e-15) return NaN;
    return radToDeg(Math.acos(clamp(dot(va, vb) / denom, -1, 1)));
  }

  function formatNumber(value, locale = "pt-BR", options) {
    if (!Number.isFinite(value)) return locale.startsWith("pt") ? "indisponível" : "unavailable";
    return new Intl.NumberFormat(locale, options || { maximumFractionDigits: 2 }).format(value);
  }

  function formatScientific(value, locale = "pt-BR", precision = 3) {
    if (!Number.isFinite(value)) return locale.startsWith("pt") ? "indisponível" : "unavailable";
    if (value === 0) return "0";
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    if (exponent >= -2 && exponent <= 5) return formatNumber(value, locale, { maximumFractionDigits: precision });
    const coefficient = value / Math.pow(10, exponent);
    return `${formatNumber(coefficient, locale, { maximumFractionDigits: precision })} × 10${toSuperscript(exponent)}`;
  }

  function toSuperscript(value) {
    const map = {"-":"⁻","0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹"};
    return String(value).split("").map((char) => map[char] || char).join("");
  }

  function formatDistance(km, locale = "pt-BR") {
    if (!Number.isFinite(km)) return locale.startsWith("pt") ? "indisponível" : "unavailable";
    if (km >= 1e9) return `${formatNumber(km / 1e9, locale, { maximumFractionDigits: 3 })} ${locale.startsWith("pt") ? "bilhões km" : "billion km"}`;
    if (km >= 1e6) return `${formatNumber(km / 1e6, locale, { maximumFractionDigits: 3 })} ${locale.startsWith("pt") ? "milhões km" : "million km"}`;
    return `${formatNumber(km, locale, { maximumFractionDigits: km < 100 ? 1 : 0 })} km`;
  }

  function formatDuration(seconds, locale = "pt-BR") {
    if (!Number.isFinite(seconds)) return locale.startsWith("pt") ? "indisponível" : "unavailable";
    const abs = Math.abs(seconds);
    if (abs < 60) return `${formatNumber(abs, locale, { maximumFractionDigits: 1 })} s`;
    if (abs < 3600) return `${formatNumber(abs / 60, locale, { maximumFractionDigits: 1 })} min`;
    if (abs < DAY_SECONDS) return `${formatNumber(abs / 3600, locale, { maximumFractionDigits: 2 })} h`;
    return `${formatNumber(abs / DAY_SECONDS, locale, { maximumFractionDigits: 2 })} ${locale.startsWith("pt") ? "dias" : "days"}`;
  }

  function validDateMs(value, minYear = 1800, maxYear = 2050) {
    const ms = typeof value === "number" ? value : Date.parse(value);
    if (!Number.isFinite(ms)) return { ok: false, reason: "invalid" };
    const year = new Date(ms).getUTCFullYear();
    if (year < minYear || year > maxYear) return { ok: false, reason: "range", minYear, maxYear };
    return { ok: true, value: ms };
  }

  const api = {
    AU_KM, DAY_SECONDS, DAY_MS, JULIAN_YEAR_DAYS, J2000_MS, G, C_KM_S,
    clamp, mod, degToRad, radToDeg, add, sub, scale, dot, cross, length, normalize, lerp, lerpVec,
    hashString, seededRandom, solveKepler, rotateOrbitalPlane, jplPlanetPosition, genericOrbitPosition,
    localMoonOffset, physicalPosition, allPhysicalPositions, displayRadius, displayPosition, allDisplayPositions,
    sampleOrbit, distanceKm, lightTimeSeconds, distanceBetween, gravityFromMassRadius, weightNewton,
    twoBodyPeriodSeconds, orbitSandbox, daylightHours, lunarPhase, angularSeparation,
    formatNumber, formatScientific, formatDistance, formatDuration, validDateMs
  };

  root.SolarScience = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
