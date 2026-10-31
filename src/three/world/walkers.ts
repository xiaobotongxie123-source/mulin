import * as THREE from 'three';
import { glowTexture } from '../textures';

export interface WalkerRefs {
  group: THREE.Group;
  update(elapsed: number): void;
  reset(baseElapsed: number): void;
}

interface Traveler {
  root: THREE.Group;
  body: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  lantern: THREE.Group;
  lanternGlow: THREE.Sprite;
  lanternLight: THREE.PointLight;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  delay: number;
  duration: number;
  phase: number;
  height: number;
}

interface TravelerDef {
  start: [number, number];
  end: [number, number];
  delay: number;
  duration: number;
  cloak: string;
  scarf: string;
  scale: number;
}

const TRAVELERS: TravelerDef[] = [
  {
    start: [-1.15, 9.4],
    end: [-1.0, -4.08],
    delay: 0,
    duration: 25,
    cloak: '#3f4a3d',
    scarf: '#8b6a42',
    scale: 1.0,
  },
  {
    start: [0.45, 11.2],
    end: [0.05, -4.14],
    delay: 2.4,
    duration: 26,
    cloak: '#4a3b2e',
    scarf: '#7f4d3b',
    scale: 0.94,
  },
  {
    start: [1.55, 13.1],
    end: [0.92, -4.02],
    delay: 4.9,
    duration: 27,
    cloak: '#2f3d3a',
    scarf: '#9a7a4f',
    scale: 1.04,
  },
  {
    start: [2.35, 15.0],
    end: [1.8, -3.96],
    delay: 7.5,
    duration: 28,
    cloak: '#4d4038',
    scarf: '#6d7f68',
    scale: 0.9,
  },
];

function createTraveler(def: TravelerDef): Traveler {
  const root = new THREE.Group();
  root.rotation.y = Math.PI;
  root.scale.setScalar(def.scale);
  const body = new THREE.Group();
  root.add(body);

  const cloakMat = new THREE.MeshStandardMaterial({
    color: def.cloak,
    roughness: 0.96,
    flatShading: true,
  });
  const cloakShadowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.cloak).multiplyScalar(0.62),
    roughness: 1,
    flatShading: true,
  });
  const leatherMat = new THREE.MeshStandardMaterial({ color: '#3b2c21', roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: '#9b8068', roughness: 0.86 });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#5f584b',
    metalness: 0.6,
    roughness: 0.45,
  });
  const scarfMat = new THREE.MeshStandardMaterial({ color: def.scarf, roughness: 0.95 });

  // A heavy, hooded travelling cloak — the silhouette matters more than the face.
  const cloak = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.38, 0.9, 9, 1), cloakMat);
  cloak.position.y = 0.88;
  cloak.castShadow = true;
  body.add(cloak);

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.26, 9, 7), cloakMat);
  shoulder.scale.set(1.05, 0.55, 0.72);
  shoulder.position.y = 1.2;
  shoulder.castShadow = true;
  body.add(shoulder);

  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.43, 0.16, 9, 1), cloakShadowMat);
  hem.position.y = 0.43;
  body.add(hem);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skinMat);
  face.scale.set(0.92, 1, 0.82);
  face.position.set(0, 1.34, 0.04);
  body.add(face);

  const hood = new THREE.Mesh(
    new THREE.ConeGeometry(0.235, 0.42, 9, 1, true),
    cloakShadowMat,
  );
  hood.position.set(0, 1.46, -0.015);
  hood.rotation.x = -0.16;
  hood.castShadow = true;
  body.add(hood);

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.032, 6, 14), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.19;
  body.add(scarf);

  const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.14), leatherMat);
  satchel.position.set(-0.25, 0.86, -0.15);
  satchel.rotation.y = 0.12;
  satchel.castShadow = true;
  body.add(satchel);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.022, 5, 18, Math.PI), leatherMat);
  strap.rotation.set(Math.PI / 2, 0.18, 0.16);
  strap.position.set(-0.06, 1.02, -0.04);
  body.add(strap);

  const legGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.5, 6);
  legGeo.translate(0, -0.25, 0);
  const bootGeo = new THREE.BoxGeometry(0.12, 0.11, 0.22);
  bootGeo.translate(0, -0.5, 0.05);
  const leftLeg = new THREE.Group();
  const leftLegMesh = new THREE.Mesh(legGeo, leatherMat);
  leftLegMesh.castShadow = true;
  const leftBoot = new THREE.Mesh(bootGeo, leatherMat);
  leftBoot.castShadow = true;
  leftLeg.add(leftLegMesh, leftBoot);
  leftLeg.position.set(-0.13, 0.56, 0);
  body.add(leftLeg);
  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.13;
  body.add(rightLeg);

  const armGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.48, 6);
  armGeo.translate(0, -0.24, 0);
  const handGeo = new THREE.SphereGeometry(0.062, 7, 6);
  const leftArm = new THREE.Group();
  const leftArmMesh = new THREE.Mesh(armGeo, cloakMat);
  leftArmMesh.castShadow = true;
  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.y = -0.49;
  leftArm.add(leftArmMesh, leftHand);
  leftArm.position.set(-0.3, 1.12, 0);
  leftArm.rotation.z = 0.08;
  body.add(leftArm);

  const rightArm = new THREE.Group();
  const rightArmMesh = new THREE.Mesh(armGeo, cloakMat);
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);
  rightArm.position.set(0.3, 1.12, 0);
  rightArm.rotation.z = -0.08;
  body.add(rightArm);

  // A small storm lantern, carried slightly ahead of the body.
  const lantern = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.22, 0.15), metalMat);
  frame.position.y = 0.02;
  frame.castShadow = true;
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.16, 0.11),
    new THREE.MeshBasicMaterial({ color: '#ffc678', transparent: true, opacity: 0.92, fog: false }),
  );
  glass.position.y = 0.02;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.08, 5), metalMat);
  cap.position.y = 0.17;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 5, 10, Math.PI), metalMat);
  handle.position.y = 0.24;
  handle.rotation.z = Math.PI / 2;
  lantern.add(frame, glass, cap, handle);
  lantern.position.set(0.31, 0.66, 0.24);
  body.add(lantern);

  const lanternGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('255,187,108'),
      color: '#ffbd72',
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  lanternGlow.scale.setScalar(0.52);
  lanternGlow.position.set(0, 0.02, 0.04);
  lantern.add(lanternGlow);

  const lanternLight = new THREE.PointLight('#ffb45e', 1.35, 3.3, 2);
  lanternLight.position.set(0, 0.03, 0.1);
  lanternLight.visible = false;
  lantern.add(lanternLight);

  return {
    root,
    body,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    lantern,
    lanternGlow,
    lanternLight,
    startX: def.start[0],
    startZ: def.start[1],
    endX: def.end[0],
    endZ: def.end[1],
    delay: def.delay,
    duration: def.duration,
    phase: def.delay * 0.7,
    height: def.scale,
  };
}

export function buildWalkers(): WalkerRefs {
  const group = new THREE.Group();
  group.name = 'approaching-travelers';
  const travelers = TRAVELERS.map(createTraveler);
  travelers.forEach((traveler, index) => {
    if (index === 0) traveler.lanternLight.visible = true;
    group.add(traveler.root);
  });

  let baseElapsed = 0;

  function place(traveler: Traveler, elapsed: number): void {
    const local = Math.max(0, elapsed - baseElapsed);
    const raw = THREE.MathUtils.clamp((local - traveler.delay) / traveler.duration, 0, 1);
    // A long, unhurried approach: linear travel with a soft ease at both ends.
    const eased = raw * raw * (3 - 2 * raw);
    const z = THREE.MathUtils.lerp(traveler.startZ, traveler.endZ, eased);
    const x = THREE.MathUtils.lerp(traveler.startX, traveler.endX, eased)
      + Math.sin(eased * Math.PI) * 0.18;
    const walking = raw > 0.001 && raw < 0.999;
    const step = elapsed * 4.4 + traveler.phase;
    const bob = walking ? Math.abs(Math.sin(step * 1.7)) * 0.028 : 0;
    traveler.root.position.set(x, bob, z);
    traveler.body.position.y = bob * 0.4;

    if (walking) {
      const stride = Math.sin(step) * 0.42;
      traveler.leftLeg.rotation.x = stride;
      traveler.rightLeg.rotation.x = -stride;
      traveler.leftArm.rotation.x = -stride * 0.65;
      traveler.rightArm.rotation.x = stride * 0.52;
      traveler.body.rotation.z = Math.sin(step) * 0.014;
      traveler.lantern.rotation.z = Math.sin(step * 0.5) * 0.08;
    } else {
      // At the door, settle into a quiet idle rather than snapping to a stop.
      const idle = Math.sin(elapsed * 0.72 + traveler.phase);
      traveler.leftLeg.rotation.x *= 0.92;
      traveler.rightLeg.rotation.x *= 0.92;
      traveler.leftArm.rotation.x = idle * 0.025;
      traveler.rightArm.rotation.x = -idle * 0.035;
      traveler.body.rotation.z = idle * 0.006;
      traveler.lantern.rotation.z = idle * 0.035;
    }

    // Lanterns warm up as the travellers get closer to the porch.
    const closeness = THREE.MathUtils.clamp(1 - Math.abs(z) / 12, 0, 1);
    traveler.lanternLight.intensity = 1.1 + closeness * 1.4;
    traveler.lanternGlow.material.opacity = 0.46 + closeness * 0.2;
  }

  return {
    group,
    update(elapsed: number) {
      for (const traveler of travelers) place(traveler, elapsed);
    },
    reset(nextBase: number) {
      baseElapsed = nextBase;
    },
  };
}
