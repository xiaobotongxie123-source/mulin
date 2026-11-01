import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture, shingleTexture, smokeTexture, stoneTexture, woodTexture } from '../textures';
import { addCabinDetails } from './cabinDetail';
import { mergeStaticMeshes } from './mergeStatic';

export interface CabinRefs {
  group: THREE.Group;
  windowMaterials: THREE.MeshBasicMaterial[];
  windowLights: THREE.PointLight[];
  lanternMaterial: THREE.MeshBasicMaterial;
  lanternLight: THREE.PointLight;
  doorLight: THREE.PointLight;
  smoke: THREE.Sprite[];
  windowGlow: THREE.Sprite[];
}

const logGeo = new THREE.CylinderGeometry(0.16, 0.16, 1, 7, 1);
const logMat = new THREE.MeshStandardMaterial({
  color: '#7d5b3f',
  roughness: 0.95,
  emissive: '#1d120a',
  emissiveIntensity: 0.5,
});

export function buildCabin(scale = 1): CabinRefs {
  const group = new THREE.Group();
  group.scale.setScalar(scale);
  const wood = woodTexture('#8a6244', '#402b1c');
  wood.repeat.set(2, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.92, emissive: '#20140c', emissiveIntensity: 0.4 });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    map: woodTexture('#5c402c', '#2a1a11'),
    color: '#b9a68e',
    roughness: 0.95,
  });
  const shingles = shingleTexture();
  shingles.repeat.set(3, 2);
  const roofMat = new THREE.MeshStandardMaterial({ map: shingles, roughness: 1, emissive: '#0a120d', emissiveIntensity: 0.35 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 1 });
  stoneMat.map!.repeat.set(2, 1.4);

  // ---- dark shell behind the logs -------------------------------------
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(5.9, 2.7, 4.0),
    new THREE.MeshStandardMaterial({ color: '#18120d', roughness: 1 }),
  );
  shell.position.y = 1.8;
  group.add(shell);

  // ---- stacked logs ----------------------------------------------------
  const logs: THREE.BufferGeometry[] = [];
  for (let row = 0; row < 9; row += 1) {
    const y = 0.42 + row * 0.29;
    for (const z of [-2.18, 2.18]) {
      const geo = logGeo.clone();
      geo.scale(1, 6.3, 1);
      geo.rotateZ(Math.PI / 2);
      geo.translate(0, y, z);
      logs.push(geo);
    }
    for (const x of [-2.96, 2.96]) {
      const geo = logGeo.clone();
      geo.scale(1, 4.5, 1);
      geo.rotateX(Math.PI / 2);
      geo.translate(x, y, 0);
      logs.push(geo);
    }
  }
  const logMesh = new THREE.Mesh(mergeGeometries(logs, false)!, logMat);
  logMesh.castShadow = true;
  logMesh.receiveShadow = true;
  group.add(logMesh);
  logs.forEach((geo) => geo.dispose());

  // ---- gables ----------------------------------------------------------
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-3.0, 0);
  gableShape.lineTo(3.0, 0);
  gableShape.lineTo(0, 1.55);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.28, bevelEnabled: false });
  for (const z of [-2.3, 2.02]) {
    const gable = new THREE.Mesh(gableGeo, wallMat);
    gable.position.set(0, 2.96, z);
    gable.castShadow = true;
    group.add(gable);
  }

  // ---- roof ------------------------------------------------------------
  const slope = Math.atan2(1.18, 2.62);
  for (const dir of [1, -1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.16, 3.5), roofMat);
    panel.position.set(0, 3.82, dir * 1.28);
    panel.rotation.x = dir * slope;
    panel.castShadow = true;
    panel.receiveShadow = true;
    group.add(panel);
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(7.35, 0.1, 0.16), darkWoodMat);
    fascia.position.set(0, 3.06, dir * 2.62);
    group.add(fascia);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(7.45, 0.12, 0.26), darkWoodMat);
  ridge.position.set(0, 4.4, 0);
  ridge.castShadow = true;
  group.add(ridge);

  // ---- chimney ---------------------------------------------------------
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.68, 2.1, 0.68), stoneMat);
  chimney.position.set(1.95, 4.0, -0.9);
  chimney.castShadow = true;
  group.add(chimney);
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.12, 0.84), stoneMat);
  chimneyCap.position.set(1.95, 5.08, -0.9);
  group.add(chimneyCap);
  const chimneyHole = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.16, 0.36),
    new THREE.MeshBasicMaterial({ color: '#050403' }),
  );
  chimneyHole.position.set(1.95, 5.16, -0.9);
  group.add(chimneyHole);

  // ---- door ------------------------------------------------------------
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.28, 2.06, 0.12), darkWoodMat);
  doorFrame.position.set(0, 1.44, 2.23);
  group.add(doorFrame);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.86, 0.1), darkWoodMat);
  door.position.set(0, 1.4, 2.3);
  group.add(door);
  for (const x of [-0.28, 0.28]) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.7, 0.03), logMat);
    plank.position.set(x, 1.4, 2.36);
    group.add(plank);
  }
  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 8, 8),
    new THREE.MeshStandardMaterial({ color: '#c8a86c', metalness: 0.7, roughness: 0.4 }),
  );
  handle.position.set(0.36, 1.36, 2.39);
  group.add(handle);
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.5), stoneMat);
  step1.position.set(0, 0.08, 2.72);
  step1.receiveShadow = true;
  group.add(step1);
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.55), stoneMat);
  step2.position.set(0, -0.02, 3.12);
  step2.receiveShadow = true;
  group.add(step2);

  // ---- windows ---------------------------------------------------------
  const windowMaterials: THREE.MeshBasicMaterial[] = [];
  const windowLights: THREE.PointLight[] = [];
  const windowGlow: THREE.Sprite[] = [];
  const glowTex = glowTexture('255,187,99');
  for (const x of [-1.72, 1.72]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.06, 0.1), darkWoodMat);
    frame.position.set(x, 2.02, 2.25);
    group.add(frame);
    const glassMat = new THREE.MeshBasicMaterial({ color: '#ffd18c', transparent: true, opacity: 0.98, fog: false });
    windowMaterials.push(glassMat);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.82), glassMat);
    glass.position.set(x, 2.02, 2.31);
    group.add(glass);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.82, 0.03), darkWoodMat);
    crossV.position.set(x, 2.02, 2.34);
    group.add(crossV);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.05, 0.03), darkWoodMat);
    crossH.position.set(x, 2.02, 2.34);
    group.add(crossH);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: '#ffb45e',
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(3.4);
    glow.position.set(x, 2.02, 2.4);
    group.add(glow);
    windowGlow.push(glow);
    const light = new THREE.PointLight('#ffb15c', 5.0, 9.5, 2);
    light.position.set(x, 2.0, 2.65);
    group.add(light);
    windowLights.push(light);
  }

  // ---- porch -----------------------------------------------------------
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 1.75), darkWoodMat);
  deck.position.set(0, 0.18, 3.05);
  deck.receiveShadow = true;
  group.add(deck);
  for (const x of [-1.78, 1.78]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), darkWoodMat);
    post.position.set(x, 1.4, 3.6);
    post.castShadow = true;
    group.add(post);
  }
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.12, 1.6), roofMat);
  porchRoof.position.set(0, 2.66, 3.1);
  porchRoof.rotation.x = -0.14;
  porchRoof.castShadow = true;
  group.add(porchRoof);

  // ---- door lantern ----------------------------------------------------
  const lanternMat = new THREE.MeshBasicMaterial({ color: '#ffd18a', fog: false });
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), lanternMat);
  lantern.position.set(1.18, 2.42, 2.72);
  group.add(lantern);
  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.14, 4), darkWoodMat);
  lanternCap.position.set(1.18, 2.64, 2.72);
  lanternCap.rotation.y = Math.PI / 4;
  group.add(lanternCap);
  const lanternGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: '#ffbd72',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  lanternGlow.scale.setScalar(1.4);
  lanternGlow.position.copy(lantern.position);
  group.add(lanternGlow);
  const lanternLight = new THREE.PointLight('#ffb45e', 6.0, 11, 2);
  lanternLight.position.set(1.18, 2.4, 2.9);
  group.add(lanternLight);

  // ---- firewood --------------------------------------------------------
  const woodGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6);
  const woodMat = new THREE.MeshStandardMaterial({ color: '#4a3524', roughness: 1 });
  for (let i = 0; i < 7; i += 1) {
    const piece = new THREE.Mesh(woodGeo, woodMat);
    piece.rotation.z = Math.PI / 2;
    piece.rotation.y = 0.4;
    piece.position.set(3.3 + (i % 3) * 0.12, 0.18 + Math.floor(i / 3) * 0.2, 1.75 + (i % 2) * 0.1);
    group.add(piece);
  }

  // ---- smoke -----------------------------------------------------------
  const smokeTex = smokeTexture();
  const smoke: THREE.Sprite[] = [];
  for (let i = 0; i < 7; i += 1) {
    const material = new THREE.SpriteMaterial({
      map: smokeTex,
      color: '#b9c6b8',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(1.95, 5.15, -0.9);
    sprite.scale.set(1.35, 1.35, 1);
    sprite.userData.phase = i / 7;
    group.add(sprite);
    smoke.push(sprite);
  }

  const doorLight = new THREE.PointLight('#ffb45e', 3.2, 7, 2);
  doorLight.position.set(0, 1.9, 2.1);
  group.add(doorLight);

  const warm = new THREE.PointLight('#ff9f4a', 2.2, 9, 2);
  warm.position.set(0, 2.3, 2.2);
  group.add(warm);

  // A warm pool of light at the foot of the porch steps.
  const pool = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('255,170,82'),
      color: '#ffab5e',
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  pool.scale.set(9, 4.4, 1);
  pool.position.set(0, 0.35, 4.2);
  group.add(pool);

  // Soft porch spill from the lantern.
  const porchLight = new THREE.PointLight('#ffb45e', 5.2, 12, 2);
  porchLight.position.set(0, 2.7, 4.6);
  group.add(porchLight);

  addCabinDetails(group);

  // The cabin is a static assembly of hundreds of logs, shingles and trims.
  // Merge its opaque geometry per material before it reaches the render loop.
  mergeStaticMeshes(group);

  return {
    group,
    windowMaterials,
    windowLights,
    lanternMaterial: lanternMat,
    lanternLight,
    doorLight,
    smoke,
    windowGlow,
  };
}
