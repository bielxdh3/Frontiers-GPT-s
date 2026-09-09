import * as THREE from 'three';
import { mulberry32 } from './noise';
import { createPointsMaterial } from './materials';
import { equatorialToEcliptic, unitFromRaDec } from '../sim/orientation';
import { eclToScene } from '../sim/scale';

/**
 * Seeded, distant starfield rendered in its own scene with a rotation-only
 * camera, so stars never show parallax. Procedural: not a real sky catalog.
 * The Milky Way band follows the real galactic plane orientation, but its
 * individual points are illustrative.
 */
export class Starfield {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private stars: THREE.Points;
  private band: THREE.Points;
  private starMat: THREE.ShaderMaterial;
  private bandMat: THREE.ShaderMaterial;
  private baseIntensity = 1;

  constructor(seed = 20260908, count = 9000) {
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    const rnd = mulberry32(seed);
    // Galactic north pole (J2000 equatorial) → ecliptic → scene axes.
    const gpEq = unitFromRaDec(192.85948, 27.12825);
    const gp = eclToScene(equatorialToEcliptic(gpEq));
    const pole = new THREE.Vector3(gp.x, gp.y, gp.z).normalize();
    const u = new THREE.Vector3(1, 0, 0).cross(pole).normalize();
    const v = new THREE.Vector3().crossVectors(pole, u);

    const R = 100;
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count), alpha = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // ~35% of stars concentrate toward the galactic plane.
      let p: THREE.Vector3;
      if (rnd() < 0.35) {
        const phi = rnd() * Math.PI * 2;
        const lat = (rnd() + rnd() + rnd() - 1.5) * 0.35; // concentrated near plane
        p = new THREE.Vector3().addScaledVector(u, Math.cos(phi) * Math.cos(lat)).addScaledVector(v, Math.sin(phi) * Math.cos(lat)).addScaledVector(pole, Math.sin(lat));
      } else {
        const z = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
        p = new THREE.Vector3(r * Math.cos(t), z, r * Math.sin(t));
      }
      p.multiplyScalar(R);
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      const mag = Math.pow(rnd(), 3.2); // most stars faint
      size[i] = 0.6 + mag * 2.6;
      alpha[i] = 0.35 + mag * 0.65;
      const temp = rnd();
      let c: [number, number, number];
      if (temp < 0.12) c = [1.0, 0.78, 0.6];
      else if (temp < 0.3) c = [1.0, 0.92, 0.8];
      else if (temp < 0.75) c = [1.0, 1.0, 1.0];
      else c = [0.78, 0.86, 1.0];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    this.starMat = createPointsMaterial({ soft: false, additive: false, sizeScale: 1 });
    this.starMat.depthTest = false;
    this.stars = new THREE.Points(geo, this.starMat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    // Diffuse Milky Way glow: large, dim, soft additive points along the band.
    const bn = 700;
    const bpos = new Float32Array(bn * 3), bcol = new Float32Array(bn * 3), bsize = new Float32Array(bn), balpha = new Float32Array(bn);
    for (let i = 0; i < bn; i++) {
      const phi = rnd() * Math.PI * 2;
      const lat = (rnd() + rnd() - 1) * 0.22 + 0.03 * Math.sin(phi * 3);
      const p = new THREE.Vector3().addScaledVector(u, Math.cos(phi) * Math.cos(lat)).addScaledVector(v, Math.sin(phi) * Math.cos(lat)).addScaledVector(pole, Math.sin(lat)).multiplyScalar(R * 0.99);
      bpos[i * 3] = p.x; bpos[i * 3 + 1] = p.y; bpos[i * 3 + 2] = p.z;
      const dust = rnd() < 0.25;
      bsize[i] = 22 + rnd() * 40;
      balpha[i] = dust ? -0.04 : 0.028 + rnd() * 0.03;
      const warm = rnd();
      bcol[i * 3] = 0.72 + warm * 0.2; bcol[i * 3 + 1] = 0.74 + warm * 0.12; bcol[i * 3 + 2] = 0.9;
    }
    const bgeo = new THREE.BufferGeometry();
    bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
    bgeo.setAttribute('color', new THREE.BufferAttribute(bcol, 3));
    bgeo.setAttribute('size', new THREE.BufferAttribute(bsize, 1));
    bgeo.setAttribute('alpha', new THREE.BufferAttribute(balpha, 1));
    this.bandMat = createPointsMaterial({ soft: true, additive: true, sizeScale: 1 });
    this.bandMat.depthTest = false;
    this.band = new THREE.Points(bgeo, this.bandMat);
    this.band.frustumCulled = false;
    this.scene.add(this.band);
  }

  setIntensity(background: number, milkyWay: boolean, pixelRatio: number): void {
    this.baseIntensity = background;
    this.starMat.uniforms.intensity.value = 0.25 + 0.95 * background;
    this.starMat.uniforms.pixelRatio.value = pixelRatio;
    this.bandMat.uniforms.intensity.value = background * 1.1;
    this.bandMat.uniforms.pixelRatio.value = pixelRatio;
    this.band.visible = milkyWay && background > 0.05;
    this.stars.visible = background > 0.02;
  }

  get intensity(): number { return this.baseIntensity; }

  render(renderer: THREE.WebGLRenderer, mainCamera: THREE.PerspectiveCamera): void {
    this.camera.fov = mainCamera.fov;
    this.camera.aspect = mainCamera.aspect;
    this.camera.updateProjectionMatrix();
    this.camera.quaternion.copy(mainCamera.quaternion);
    renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.stars.geometry.dispose(); this.starMat.dispose();
    this.band.geometry.dispose(); this.bandMat.dispose();
  }
}
