"use strict";

const assert = require("node:assert/strict");
const S = require("./science.js");
const D = require("./data.js");

const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
}
function near(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message || "values differ"}: ${actual} vs ${expected}`);
}

test("catalog identifiers are unique", () => {
  const ids = D.bodies.map((body) => body.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("all parent references resolve", () => {
  D.bodies.forEach((body) => { if (body.parent) assert.ok(D.getBody(body.parent), `${body.id} parent`); });
});

test("core catalog contains Sun, eight planets, and Moon", () => {
  ["sun","mercury","venus","earth","moon","mars","jupiter","saturn","uranus","neptune"].forEach((id) => assert.ok(D.getBody(id), id));
  assert.equal(D.bodies.filter((body) => body.category === "planet").length, 8);
});

test("all eight planets use JPL element sets", () => {
  D.bodies.filter((body) => body.category === "planet").forEach((body) => {
    assert.equal(body.jpl.base.length, 6, body.id);
    assert.equal(body.jpl.rate.length, 6, body.id);
  });
});

test("same instant evaluates deterministically", () => {
  const t = Date.UTC(2026, 8, 5);
  const a = S.allPhysicalPositions(t, D);
  const b = S.allPhysicalPositions(t, D);
  D.bodies.forEach((body) => assert.deepEqual(a.get(body.id), b.get(body.id), body.id));
});

test("planet positions remain finite across supported dates", () => {
  [Date.UTC(1800,0,1), Date.UTC(2000,0,1,12), Date.UTC(2050,11,31)].forEach((t) => {
    D.bodies.filter((body) => body.category === "planet").forEach((body) => {
      const p = S.physicalPosition(body, t, D);
      assert.ok([p.x,p.y,p.z].every(Number.isFinite), `${body.id} at ${new Date(t).toISOString()}`);
      assert.equal(p.solverOk, true);
    });
  });
});

test("Kepler solver satisfies M = E - e sin E", () => {
  [[0,.1],[1.2,.6],[-2.5,.89]].forEach(([M,e]) => {
    const solved = S.solveKepler(M,e);
    assert.equal(solved.ok,true);
    near(solved.value - e * Math.sin(solved.value), ((M + Math.PI) % (2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI, 1e-9);
    assert.ok(solved.iterations <= 16);
  });
});

test("Moon hierarchy equals Earth world position plus local offset", () => {
  const t = Date.UTC(2026, 8, 5);
  const earth = S.physicalPosition("earth", t, D);
  const moon = S.physicalPosition("moon", t, D);
  const local = S.localMoonOffset(D.getBody("moon"), t);
  near(moon.x - earth.x, local.x, 1e-13);
  near(moon.y - earth.y, local.y, 1e-13);
  near(moon.z - earth.z, local.z, 1e-13);
});

test("another satellite system is parent-relative", () => {
  const t = Date.UTC(2024, 0, 1);
  const parent = S.physicalPosition("jupiter", t, D);
  const moon = S.physicalPosition("europa", t, D);
  const localDistanceKm = S.length(S.sub(moon, parent)) * S.AU_KM;
  near(localDistanceKm, D.getBody("europa").distanceKm * (1 - D.getBody("europa").e), D.getBody("europa").distanceKm * .02);
});

test("presentation scale never changes a physical distance", () => {
  const t = Date.UTC(2026, 8, 5);
  const physicalBefore = S.distanceBetween("earth", "mars", t, D).km;
  S.allDisplayPositions(t, D, "exploration");
  const physicalAfterExploration = S.distanceBetween("earth", "mars", t, D).km;
  S.allDisplayPositions(t, D, "relative");
  const physicalAfterRelative = S.distanceBetween("earth", "mars", t, D).km;
  assert.equal(physicalBefore, physicalAfterExploration);
  assert.equal(physicalBefore, physicalAfterRelative);
});

test("AU conversion and one-way light-time are correct", () => {
  near(S.AU_KM, 149597870.7, 0);
  near(S.lightTimeSeconds(S.AU_KM), 499.004783836, 1e-6);
});

test("gravity equation reproduces Earth reference order", () => {
  const earth = D.getBody("earth");
  const g = S.gravityFromMassRadius(earth.massKg, earth.radiusKm * 1000);
  near(g, 9.82, .05);
});

test("weight and two-body period use compatible SI units", () => {
  near(S.weightNewton(10, 9.8), 98, 1e-12);
  const period = S.twoBodyPeriodSeconds(D.getBody("earth").massKg, (6371.0084 + 400) * 1000);
  near(period / 60, 92.4, 1.2);
});

test("orbit sandbox rejects unsupported trajectories", () => {
  assert.equal(S.orbitSandbox(1e24, 40000, 1).ok, false);
  assert.equal(S.orbitSandbox(-1, 40000, .2).ok, false);
  assert.equal(S.orbitSandbox(1e24, 40000, .8).ok, true);
});

test("zero tilt gives twelve idealized daylight hours", () => {
  [-80,-30,0,45,80].forEach((latitude) => near(S.daylightHours(0, latitude, 90).hours, 12, 1e-10));
});

test("lunar phase illumination has correct endpoints", () => {
  near(S.lunarPhase(0).illuminatedFraction, 0, 1e-12);
  near(S.lunarPhase(180).illuminatedFraction, 1, 1e-12);
  near(S.lunarPhase(90).illuminatedFraction, .5, 1e-12);
});

test("angular separation uses the observer as the vertex", () => {
  near(S.angularSeparation({x:0,y:0,z:0},{x:1,y:0,z:0},{x:0,y:1,z:0}), 90, 1e-12);
  near(S.angularSeparation({x:0,y:0,z:0},{x:1,y:0,z:0},{x:2,y:0,z:0}), 0, 1e-12);
});

test("supported date boundaries reject extrapolation", () => {
  assert.equal(S.validDateMs("1800-01-01T00:00:00Z").ok, true);
  assert.equal(S.validDateMs("2050-12-31T23:59:59Z").ok, true);
  assert.equal(S.validDateMs("1799-12-31T23:59:59Z").ok, false);
  assert.equal(S.validDateMs("2051-01-01T00:00:00Z").ok, false);
  assert.equal(S.validDateMs("not-a-date").ok, false);
});

test("catalog source routes all resolve", () => {
  D.bodies.forEach((body) => body.sourceIds.forEach((id) => assert.ok(D.sources[id], `${body.id}: ${id}`)));
});

test("bilingual identity and education copy is present", () => {
  D.bodies.forEach((body) => {
    [body.name, body.description, body.fact].forEach((field) => {
      assert.ok(field && field.pt && field.en, body.id);
    });
  });
});

test("about-this-model disclosure is bilingual and searchable", () => {
  const article = D.glossary.find((item) => item.id === "about-model");
  assert.ok(article && article.title.pt && article.title.en && article.short.pt && article.short.en);
});

test("tour routes resolve and have meaningful stops", () => {
  assert.ok(D.tours.length >= 5);
  D.tours.forEach((tour) => {
    assert.ok(tour.stops.length >= 3, tour.id);
    tour.stops.forEach((stop) => assert.ok(D.getBody(stop[0]), `${tour.id}: ${stop[0]}`));
  });
});

test("at least twelve activities have evaluable contracts", () => {
  assert.ok(D.activities.length >= 12);
  D.activities.forEach((activity) => {
    assert.ok(activity.answer !== undefined || activity.check, activity.id);
  });
});

const failed = results.filter((result) => !result.ok);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
if (failed.length) process.exitCode = 1;
