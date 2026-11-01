import * as THREE from 'three';
import type { Character } from '@/data/characters';
import { flameTexture, glowTexture, runeDialTexture, stoneTexture, woodTexture } from '../textures';

export interface SeatFigureRefs {
  seat: number;
  group: THREE.Group;
  bodyGroup: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  hoodMat: THREE.MeshStandardMaterial;
  faceMat: THREE.MeshStandardMaterial;
  lanternMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  selectMat: THREE.MeshBasicMaterial;
  openEyes: THREE.Group;
  closedEyes: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  lanternGlow: THREE.Sprite;
  ring: THREE.Mesh;
  selectedRing: THREE.Mesh;
  baseY: number;
  alive: boolean;
}

export interface TableRefs {
  group: THREE.Group;
  seats: Map<number, SeatFigureRefs>;
  dialMaterial: THREE.MeshBasicMaterial;
  dial: THREE.Mesh;
  candleLight: THREE.PointLight;
  flames: THREE.Sprite[];
  humanChair: THREE.Group;
  tableTopMaterial: THREE.MeshStandardMaterial;
}

export const SEAT_RADIUS = 5.5;
export const SEAT_ANGLES = Array.from({ length: 9 }, (_, index) => (index / 9) * Math.PI * 2);

function buildFigure(seat: number, character: Character): SeatFigureRefs {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const { cloak, cloakDeep, accent, skin, hair } = character.palette;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: cloak,
    roughness: 0.9,
    emissive: cloak,
    emissiveIntensity: 0.1,
  });
  const hoodMat = new THREE.MeshStandardMaterial({
    color: cloakDeep,
    roughness: 0.92,
    emissive: cloakDeep,
    emissiveIntensity: 0.08,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    color: skin,
    roughness: 0.82,
    emissive: skin,
    emissiveIntensity: 0.1,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accent,
    metalness: 0.22,
    roughness: 0.54,
    emissive: accent,
    emissiveIntensity: 0.08,
  });
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.95 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#18110d', roughness: 0.38 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: '#6f4238', roughness: 0.7 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: '#4b3424', roughness: 0.9 });
  const bootMat = new THREE.MeshStandardMaterial({ color: '#2d2118', roughness: 0.92 });
  const chairMat = new THREE.MeshStandardMaterial({ color: '#3a2a1d', roughness: 0.96 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.92 });

  // ---- chair: a little more furniture than a plain silhouette ------------
  const seatDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.16, 10), chairMat);
  seatDisc.position.y = 0.52;
  seatDisc.receiveShadow = true;
  group.add(seatDisc);
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.075, 0.52), cushionMat);
  cushion.position.set(0, 0.605, 0.01);
  cushion.receiveShadow = true;
  group.add(cushion);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.98, 0.1), chairMat);
  back.position.set(0, 1.03, -0.46);
  back.castShadow = true;
  group.add(back);
  for (let i = 0; i < 3; i += 1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.055, 0.035), accentMat);
    slat.position.set(0, 1.22 + i * 0.16, -0.52);
    group.add(slat);
  }
  for (const x of [-0.4, 0.4]) {
    const stile = new THREE.Mesh(new THREE.BoxGeometry(0.075, 1.06, 0.08), chairMat);
    stile.position.set(x, 1.02, -0.5);
    stile.castShadow = true;
    group.add(stile);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), accentMat);
    finial.position.set(x, 1.58, -0.5);
    group.add(finial);
    const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.065, 0.62), chairMat);
    armrest.position.set(x * 1.12, 0.88, 0.05);
    armrest.castShadow = true;
    group.add(armrest);
    const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), chairMat);
    armPost.position.set(x * 1.12, 0.74, 0.28);
    group.add(armPost);
  }
  for (const x of [-0.34, 0.34]) {
    for (const z of [-0.28, 0.28]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.52, 0.085), chairMat);
      leg.position.set(x, 0.26, z);
      leg.castShadow = true;
      group.add(leg);
    }
  }

  // ---- body ------------------------------------------------------------
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.55, 1.12, 11, 3), bodyMat);
  body.position.y = 1.14;
  body.castShadow = true;
  bodyGroup.add(body);

  const hemTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.56, 0.055, 11, 1, true), accentMat);
  hemTrim.position.y = 0.59;
  bodyGroup.add(hemTrim);

  const capelet = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.46, 0.28, 10, 1, true), hoodMat);
  capelet.position.y = 1.5;
  capelet.castShadow = true;
  bodyGroup.add(capelet);
  const capeTrim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 5, 18), accentMat);
  capeTrim.rotation.x = Math.PI / 2;
  capeTrim.position.y = 1.42;
  bodyGroup.add(capeTrim);

  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), bodyMat);
  shoulders.scale.set(1, 0.62, 0.86);
  shoulders.position.y = 1.58;
  shoulders.castShadow = true;
  bodyGroup.add(shoulders);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 6, 16), accentMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.66;
  bodyGroup.add(collar);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.075, 10, 1, true), leatherMat);
  belt.position.y = 1.26;
  bodyGroup.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.085, 0.035), accentMat);
  buckle.position.set(0, 1.26, 0.315);
  bodyGroup.add(buckle);

  // Vertical drape lines keep the cloak from reading as a smooth cone.
  for (let i = 0; i < 4; i += 1) {
    const angle = -1.05 + i * 0.7;
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.7, 0.018), hoodMat);
    seam.position.set(Math.sin(angle) * 0.4, 0.82, Math.cos(angle) * 0.4);
    seam.rotation.y = angle;
    bodyGroup.add(seam);
  }

  // ---- arms ------------------------------------------------------------
  const armGeo = new THREE.CylinderGeometry(0.07, 0.1, 0.58, 6);
  armGeo.translate(0, -0.29, 0);
  const handGeo = new THREE.SphereGeometry(0.075, 8, 6);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    const sleeve = new THREE.Mesh(armGeo, bodyMat);
    sleeve.castShadow = true;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.075, 6), accentMat);
    cuff.position.y = -0.53;
    const hand = new THREE.Mesh(handGeo, faceMat);
    hand.position.y = -0.6;
    arm.add(sleeve, cuff, hand);
    arm.position.set(side * 0.38, 1.55, 0.02);
    arm.rotation.z = -side * 0.14;
    bodyGroup.add(arm);
  }

  // ---- legs ------------------------------------------------------------
  const legGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.4, 6);
  legGeo.translate(0, -0.2, 0);
  const bootGeo = new THREE.BoxGeometry(0.14, 0.12, 0.25);
  bootGeo.translate(0, -0.43, 0.06);
  const makeLeg = (x: number): THREE.Group => {
    const leg = new THREE.Group();
    const shin = new THREE.Mesh(legGeo, leatherMat);
    shin.castShadow = true;
    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.castShadow = true;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.088, 0.06, 6), accentMat);
    cuff.position.y = -0.33;
    leg.add(shin, cuff, boot);
    leg.position.set(x, 0.47, 0);
    bodyGroup.add(leg);
    return leg;
  };
  const leftLeg = makeLeg(-0.17);
  const rightLeg = makeLeg(0.17);

  // ---- head and face ---------------------------------------------------
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), faceMat);
  head.position.set(0, 1.94, 0.02);
  head.castShadow = true;
  bodyGroup.add(head);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), faceMat);
  face.scale.set(0.85, 1, 0.58);
  face.position.set(0, 1.94, 0.2);
  bodyGroup.add(face);

  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 8), hairMat);
  hairMesh.scale.set(1.04, 0.72, 1.02);
  hairMesh.position.set(0, 2.05, -0.02);
  bodyGroup.add(hairMesh);
  for (const side of [-1, 1]) {
    const strand = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.26, 5), hairMat);
    strand.position.set(side * 0.2, 1.93, 0.12);
    strand.rotation.z = -side * 0.22;
    bodyGroup.add(strand);
  }

  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 12), hoodMat);
  hood.scale.set(1.05, 1.05, 1);
  hood.position.set(0, 1.98, -0.08);
  hood.castShadow = true;
  bodyGroup.add(hood);
  const hoodRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.038, 6, 20, Math.PI * 1.45), hoodMat);
  hoodRim.position.set(0, 1.97, 0.265);
  hoodRim.rotation.z = Math.PI * 0.275;
  bodyGroup.add(hoodRim);
  const hoodLining = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.016, 5, 18, Math.PI * 1.36), accentMat);
  hoodLining.position.set(0, 1.97, 0.28);
  hoodLining.rotation.z = Math.PI * 0.32;
  bodyGroup.add(hoodLining);

  const eyeZ = 0.32;
  const openEyes = new THREE.Group();
  for (const x of [-0.07, 0.07]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 9, 7), eyeMat);
    eye.scale.set(0.82, 1.08, 0.5);
    eye.position.set(x, 1.985, eyeZ);
    openEyes.add(eye);
    const glint = new THREE.Mesh(
      new THREE.SphereGeometry(0.009, 5, 4),
      new THREE.MeshBasicMaterial({ color: '#ffe1ab', fog: false }),
    );
    glint.position.set(x + 0.01, 2.0, eyeZ + 0.018);
    openEyes.add(glint);
  }
  bodyGroup.add(openEyes);

  const closedEyes = new THREE.Group();
  for (const x of [-0.07, 0.07]) {
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, 0.012), eyeMat);
    lid.position.set(x, 1.985, eyeZ + 0.005);
    lid.rotation.z = x < 0 ? -0.12 : 0.12;
    closedEyes.add(lid);
  }
  bodyGroup.add(closedEyes);

  for (const x of [-0.075, 0.075]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.018, 0.014), hairMat);
    brow.position.set(x, 2.062, eyeZ + 0.002);
    brow.rotation.z = x < 0 ? -0.12 : 0.12;
    bodyGroup.add(brow);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.027, 6, 5), faceMat);
  nose.scale.set(0.8, 1.3, 0.75);
  nose.position.set(0, 1.93, 0.323);
  bodyGroup.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.012), mouthMat);
  mouth.position.set(0, 1.875, 0.318);
  bodyGroup.add(mouth);

  // ---- character accessory ---------------------------------------------
  const accessory = new THREE.Group();
  switch (character.accessory) {
    case 'compass': {
      const caseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 12), accentMat);
      caseMesh.rotation.x = Math.PI / 2;
      caseMesh.position.set(0.3, 1.3, 0.2);
      accessory.add(caseMesh);
      break;
    }
    case 'herb': {
      for (let i = 0; i < 3; i += 1) {
        const sprig = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 5), new THREE.MeshStandardMaterial({ color: '#7f9a67', roughness: 0.9 }));
        sprig.position.set(-0.34 + i * 0.035, 1.36 + (i % 2) * 0.04, 0.18);
        sprig.rotation.z = (i - 1) * 0.22;
        accessory.add(sprig);
      }
      break;
    }
    case 'antler': {
      for (const side of [-1, 1]) {
        const antler = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.3, 5), accentMat);
        antler.position.set(side * 0.22, 2.2, 0.02);
        antler.rotation.z = side * 0.42;
        accessory.add(antler);
        const tine = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.16, 5), accentMat);
        tine.position.set(side * 0.3, 2.15, 0.02);
        tine.rotation.z = side * 0.9;
        accessory.add(tine);
      }
      break;
    }
    case 'mask': {
      const mask = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), accentMat);
      mask.scale.set(1, 0.55, 0.18);
      mask.position.set(-0.3, 1.36, 0.25);
      accessory.add(mask);
      break;
    }
    case 'pine': {
      const pine = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.24, 6), new THREE.MeshStandardMaterial({ color: '#526b52', roughness: 0.95 }));
      pine.position.set(0.33, 1.58, 0.16);
      pine.rotation.z = -0.3;
      accessory.add(pine);
      break;
    }
    case 'key': {
      const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 5, 10), accentMat);
      keyRing.position.set(-0.32, 1.4, 0.2);
      accessory.add(keyRing);
      const keyShaft = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.018), accentMat);
      keyShaft.position.set(-0.32, 1.31, 0.2);
      accessory.add(keyShaft);
      break;
    }
    case 'quill': {
      const quill = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.38, 4), accentMat);
      quill.position.set(0.35, 1.64, 0.1);
      quill.rotation.z = -0.45;
      quill.rotation.x = 0.25;
      accessory.add(quill);
      break;
    }
    case 'mushroom': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshStandardMaterial({ color: '#b35b45', roughness: 0.8 }));
      cap.scale.set(1, 0.55, 1);
      cap.position.set(-0.32, 1.39, 0.2);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.12, 6), faceMat);
      stem.position.set(-0.32, 1.3, 0.2);
      accessory.add(cap, stem);
      break;
    }
    case 'lantern': {
      const charm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), accentMat);
      charm.position.set(0.33, 1.39, 0.2);
      accessory.add(charm);
      break;
    }
  }
  bodyGroup.add(accessory);

  // A small personal lantern on the floor beside the chair.
  const lanternMat = new THREE.MeshBasicMaterial({ color: '#ffcf86', fog: false });
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), lanternMat);
  lantern.position.set(0.72, 0.2, 0.3);
  group.add(lantern);
  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.1, 4), chairMat);
  lanternCap.position.set(0.72, 0.36, 0.3);
  lanternCap.rotation.y = Math.PI / 4;
  group.add(lanternCap);
  const lanternGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('255,190,105'),
      color: '#ffb96e',
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  lanternGlow.scale.setScalar(0.85);
  lanternGlow.position.set(0.72, 0.28, 0.3);
  group.add(lanternGlow);

  const ringMat = new THREE.MeshBasicMaterial({
    color: '#e7c991',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.64, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  const selectMat = new THREE.MeshBasicMaterial({
    color: '#fff0c9',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const selectedRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.76, 44), selectMat);
  selectedRing.rotation.x = -Math.PI / 2;
  selectedRing.position.y = 0.05;
  group.add(selectedRing);

  return {
    seat,
    group,
    bodyGroup,
    bodyMat,
    hoodMat,
    faceMat,
    lanternMat,
    ringMat,
    selectMat,
    openEyes,
    closedEyes,
    leftLeg,
    rightLeg,
    lanternGlow,
    ring,
    selectedRing,
    baseY: 0,
    alive: true,
  };
}

export function buildTable(players: Array<{ seat: number; character: Character }>): TableRefs {
  const group = new THREE.Group();

  const tableWood = woodTexture('#6a4a31', '#2f2015');
  tableWood.repeat.set(3, 1.5);
  const tableTopMaterial = new THREE.MeshStandardMaterial({ map: tableWood, roughness: 0.85 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 1 });
  stoneMat.map!.repeat.set(1.2, 1.2);

  // pedestal
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.7, 1.2, 10), stoneMat);
  pedestal.position.y = 0.6;
  pedestal.castShadow = true;
  group.add(pedestal);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.16, 12), stoneMat);
  foot.position.y = 0.08;
  foot.receiveShadow = true;
  group.add(foot);

  // top
  const top = new THREE.Mesh(new THREE.CylinderGeometry(4.15, 4.32, 0.24, 72), tableTopMaterial);
  top.position.y = 1.42;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(4.18, 0.07, 8, 80),
    new THREE.MeshStandardMaterial({ color: '#8b673c', roughness: 0.55, metalness: 0.25 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.55;
  group.add(rim);

  // place settings
  const plateMat = new THREE.MeshStandardMaterial({ color: '#8a8272', roughness: 0.7, metalness: 0.1 });
  const cupMat = new THREE.MeshStandardMaterial({ color: '#5d5344', roughness: 0.8 });
  for (let i = 0; i < 9; i += 1) {
    const angle = SEAT_ANGLES[i];
    const x = Math.sin(angle) * 3.55;
    const z = Math.cos(angle) * 3.55;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 18), plateMat);
    plate.position.set(x, 1.55, z);
    group.add(plate);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.14, 10), cupMat);
    cup.position.set(x + Math.sin(angle) * 0.22, 1.62, z + Math.cos(angle) * 0.22);
    group.add(cup);
  }

  // centre dial
  const dialMaterial = new THREE.MeshBasicMaterial({
    map: runeDialTexture(),
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    color: '#f0d3a0',
    fog: false,
  });
  const dial = new THREE.Mesh(new THREE.PlaneGeometry(3.15, 3.15), dialMaterial);
  dial.rotation.x = -Math.PI / 2;
  dial.position.y = 1.558;
  group.add(dial);

  // candles
  const flames: THREE.Sprite[] = [];
  const candleMat = new THREE.MeshStandardMaterial({ color: '#d8c8a4', roughness: 0.9 });
  const flameTex = flameTexture();
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2 + 0.6;
    const x = Math.cos(angle) * 1.95;
    const z = Math.sin(angle) * 1.95;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.4, 8), candleMat);
    candle.position.set(x, 1.74, z);
    group.add(candle);
    const flame = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: flameTex,
        color: '#ffcf8a',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    flame.scale.set(0.25, 0.55, 1);
    flame.position.set(x, 2.02, z);
    flame.userData.baseY = 2.02;
    group.add(flame);
    flames.push(flame);
  }

  const candleLight = new THREE.PointLight('#ffb35f', 7, 13, 2);
  candleLight.position.set(0, 2.6, 0);
  candleLight.castShadow = false;
  group.add(candleLight);

  const dialLight = new THREE.PointLight('#e7c991', 2.2, 7, 2);
  dialLight.position.set(0, 1.9, 0);
  group.add(dialLight);

  // a small deck of cards near the front edge
  const cardMat = new THREE.MeshStandardMaterial({ color: '#25352b', roughness: 0.8 });
  for (let i = 0; i < 4; i += 1) {
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.015, 0.42), cardMat);
    card.position.set(0.9, 1.57 + i * 0.016, 2.25);
    card.rotation.y = 0.2 + i * 0.03;
    group.add(card);
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(0.31, 0.004, 0.01),
      new THREE.MeshBasicMaterial({ color: '#c8a86c' }),
    );
    edge.position.set(0.9, 1.578 + i * 0.016, 2.46);
    edge.rotation.y = 0.2 + i * 0.03;
    group.add(edge);
  }

  // seats
  const seats = new Map<number, SeatFigureRefs>();
  for (const { seat, character } of players) {
    if (seat === 1) continue;
    const index = seat - 1;
    const angle = SEAT_ANGLES[index];
    const figure = buildFigure(seat, character);
    figure.group.position.set(Math.sin(angle) * SEAT_RADIUS, 0, Math.cos(angle) * SEAT_RADIUS);
    // lookAt() can flip figures on the near half of the circle (negative Y), sinking them under the floor.
    figure.group.rotation.y = angle + Math.PI;
    group.add(figure.group);
    seats.set(seat, figure);
  }

  // the viewer's own chair, seen from behind at the bottom of the frame
  const humanChair = new THREE.Group();
  const chairMat = new THREE.MeshStandardMaterial({ color: '#38281b', roughness: 0.96 });
  const seatDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.18, 12), chairMat);
  seatDisc.position.y = 0.7;
  humanChair.add(seatDisc);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.12), chairMat);
  back.position.set(0, 1.2, -0.5);
  humanChair.add(back);
  const cushion = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.44, 0.08, 12),
    new THREE.MeshStandardMaterial({ color: '#5c4630', roughness: 1 }),
  );
  cushion.position.y = 0.8;
  humanChair.add(cushion);
  const cloak = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.7, 7),
    new THREE.MeshStandardMaterial({ color: '#3f4a3d', roughness: 1 }),
  );
  cloak.position.set(0, 1.18, -0.12);
  cloak.rotation.x = 0.16;
  humanChair.add(cloak);
  humanChair.position.set(0, 0, 6.1);
  humanChair.rotation.y = Math.PI;
  group.add(humanChair);

  return {
    group,
    seats,
    dialMaterial,
    dial,
    candleLight,
    flames,
    humanChair,
    tableTopMaterial,
  };
}
