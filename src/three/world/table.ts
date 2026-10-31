import * as THREE from 'three';
import type { Character } from '@/data/characters';
import { flameTexture, glowTexture, runeDialTexture, stoneTexture, woodTexture } from '../textures';

export interface SeatFigureRefs {
  seat: number;
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  hoodMat: THREE.MeshStandardMaterial;
  faceMat: THREE.MeshStandardMaterial;
  lanternMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  selectMat: THREE.MeshBasicMaterial;
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
  const { cloak, cloakDeep, accent, skin, hair } = character.palette;

  const bodyMat = new THREE.MeshStandardMaterial({ color: cloak, roughness: 0.94, emissive: cloak, emissiveIntensity: 0.07 });
  const hoodMat = new THREE.MeshStandardMaterial({ color: cloakDeep, roughness: 0.96, emissive: cloakDeep, emissiveIntensity: 0.05 });
  const faceMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.86, emissive: skin, emissiveIntensity: 0.06 });

  const cloakGeo = new THREE.CylinderGeometry(0.2, 0.55, 1.35, 9, 1);
  const body = new THREE.Mesh(cloakGeo, bodyMat);
  body.position.y = 1.02;
  body.castShadow = true;
  group.add(body);

  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), bodyMat);
  shoulders.scale.set(1, 0.62, 0.86);
  shoulders.position.y = 1.58;
  shoulders.castShadow = true;
  group.add(shoulders);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 6, 16), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6, metalness: 0.25 }));
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.66;
  group.add(collar);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), faceMat);
  head.position.set(0, 1.94, 0.02);
  head.castShadow = true;
  group.add(head);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), faceMat);
  face.scale.set(0.85, 1, 0.55);
  face.position.set(0, 1.94, 0.15);
  group.add(face);

  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 8), new THREE.MeshStandardMaterial({ color: hair, roughness: 1 }));
  hairMesh.scale.set(1.04, 0.7, 1.02);
  hairMesh.position.set(0, 2.05, -0.02);
  group.add(hairMesh);

  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 12), hoodMat);
  hood.scale.set(1.05, 1.05, 1);
  hood.position.set(0, 1.98, -0.06);
  hood.castShadow = true;
  group.add(hood);

  // Cut the hood open at the face with a slightly smaller dark shell in front.
  const hoodRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 18, Math.PI * 1.45), hoodMat);
  hoodRim.position.set(0, 1.97, 0.14);
  hoodRim.rotation.z = Math.PI * 0.275;
  group.add(hoodRim);

  // Chair: seat + back, facing local +z toward the table.
  const chairMat = new THREE.MeshStandardMaterial({ color: '#3a2a1d', roughness: 0.96 });
  const seatDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.16, 10), chairMat);
  seatDisc.position.y = 0.52;
  seatDisc.receiveShadow = true;
  group.add(seatDisc);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.1), chairMat);
  back.position.set(0, 1.0, -0.46);
  back.castShadow = true;
  group.add(back);
  for (const x of [-0.34, 0.34]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52, 0.09), chairMat);
    leg.position.set(x, 0.26, -0.28);
    group.add(leg);
  }

  // A small personal lantern on the floor beside the chair.
  const lanternMat = new THREE.MeshBasicMaterial({ color: '#ffcf86', fog: false });
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), lanternMat);
  lantern.position.set(0.62, 0.2, 0.26);
  group.add(lantern);
  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.1, 4), chairMat);
  lanternCap.position.set(0.62, 0.36, 0.26);
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
  lanternGlow.position.set(0.62, 0.28, 0.26);
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
    bodyMat,
    hoodMat,
    faceMat,
    lanternMat,
    ringMat,
    selectMat,
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
