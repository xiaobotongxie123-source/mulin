import * as THREE from 'three';
import { glowTexture } from '../textures';
import { mergeStaticMeshes } from './mergeStatic';

export interface WalkerRefs {
  group: THREE.Group;
  update(elapsed: number): void;
  reset(baseElapsed: number): void;
}

type TravelerArchetype = 'ranger' | 'elder' | 'healer' | 'guide';

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
  scarfTail: THREE.Group;
  yawOffset: number;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  delay: number;
  duration: number;
  phase: number;
}

interface TravelerDef {
  start: [number, number];
  end: [number, number];
  delay: number;
  duration: number;
  cloak: string;
  cloakLight: string;
  scarf: string;
  trim: string;
  skin: string;
  scale: number;
  archetype: TravelerArchetype;
  staff?: boolean;
  pack?: 'bedroll' | 'scroll';
  lanternSide: 1 | -1;
  yawOffset: number;
}

// Four deliberately different silhouettes and palettes. The old all-charcoal
// cloaks disappeared into the tree line; these keep a nocturnal mood while
// still reading as four distinct people from the porch.
const TRAVELERS: TravelerDef[] = [
  {
    start: [-1.35, 9.8],
    end: [-2.15, -4.02],
    delay: 0,
    duration: 25,
    cloak: '#6f8a4f',
    cloakLight: '#a3bd79',
    scarf: '#d8b786',
    trim: '#c8a66c',
    skin: '#c8a184',
    scale: 1.24,
    archetype: 'ranger',
    staff: true,
    lanternSide: 1,
    yawOffset: 0.6,
  },
  {
    start: [0.35, 11.4],
    end: [-0.88, -3.52],
    delay: 2.4,
    duration: 26,
    cloak: '#934f43',
    cloakLight: '#c47e61',
    scarf: '#dac7a7',
    trim: '#c99d68',
    skin: '#ba9072',
    scale: 1.18,
    archetype: 'elder',
    staff: true,
    lanternSide: -1,
    yawOffset: -0.48,
  },
  {
    start: [1.35, 12.9],
    end: [0.58, -4.24],
    delay: 4.9,
    duration: 27,
    cloak: '#5b9e93',
    cloakLight: '#9dcbbd',
    scarf: '#edf3de',
    trim: '#cfe0d2',
    skin: '#d2af90',
    scale: 1.26,
    archetype: 'healer',
    pack: 'scroll',
    lanternSide: -1,
    yawOffset: 0.38,
  },
  {
    start: [1.55, 13.3],
    end: [2.08, -3.52],
    delay: 7.5,
    duration: 28,
    cloak: '#b9782f',
    cloakLight: '#e3b25f',
    scarf: '#ffc99b',
    trim: '#f7d59b',
    skin: '#b58d6e',
    scale: 1.34,
    archetype: 'guide',
    staff: true,
    pack: 'bedroll',
    lanternSide: -1,
    yawOffset: -0.66,
  },
];

function createTraveler(def: TravelerDef): Traveler {
  const root = new THREE.Group();
  root.rotation.y = Math.PI;
  root.scale.setScalar(def.scale);
  const body = new THREE.Group();
  root.add(body);

  const cloakColor = new THREE.Color(def.cloak);
  const cloakLightColor = new THREE.Color(def.cloakLight);
  const trimColor = new THREE.Color(def.trim);
  const skinColor = new THREE.Color(def.skin);
  const scarfColor = new THREE.Color(def.scarf);

  const cloakMat = new THREE.MeshStandardMaterial({
    color: cloakColor,
    roughness: 0.9,
    flatShading: true,
    emissive: cloakColor.clone().multiplyScalar(0.26),
    emissiveIntensity: 0.55,
  });
  const cloakLightMat = new THREE.MeshStandardMaterial({
    color: cloakLightColor,
    roughness: 0.88,
    flatShading: true,
    side: THREE.DoubleSide,
    emissive: cloakLightColor.clone().multiplyScalar(0.18),
    emissiveIntensity: 0.42,
  });
  const cloakShadowMat = new THREE.MeshStandardMaterial({
    color: cloakColor.clone().multiplyScalar(0.55),
    roughness: 1,
    flatShading: true,
  });
  const leatherMat = new THREE.MeshStandardMaterial({ color: '#5a402c', roughness: 0.86 });
  const leatherLightMat = new THREE.MeshStandardMaterial({ color: '#8a6846', roughness: 0.84 });
  const bootMat = new THREE.MeshStandardMaterial({ color: '#38281e', roughness: 0.92 });
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.8,
    emissive: skinColor.clone().multiplyScalar(0.06),
    emissiveIntensity: 0.25,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#8f7b5e',
    metalness: 0.62,
    roughness: 0.34,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: trimColor,
    metalness: 0.12,
    roughness: 0.6,
    emissive: trimColor.clone().multiplyScalar(0.2),
    emissiveIntensity: 0.45,
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: scarfColor,
    roughness: 0.88,
    emissive: scarfColor.clone().multiplyScalar(0.2),
    emissiveIntensity: 0.45,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#7a5a3d', roughness: 0.9 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#c9a269', metalness: 0.55, roughness: 0.34 });
  const ironMat = new THREE.MeshStandardMaterial({ color: '#38332b', metalness: 0.5, roughness: 0.5 });
  const canvasMat = new THREE.MeshStandardMaterial({ color: '#9a7a55', roughness: 0.95 });

  // A heavy, hooded travelling cloak with a lighter mantle and hem trim.
  const cloak = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.41, 0.94, 10, 3), cloakMat);
  cloak.position.y = 0.88;
  cloak.castShadow = true;
  body.add(cloak);

  const capelet = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.41, 0.25, 10, 1, true), cloakLightMat);
  capelet.position.y = 1.13;
  capelet.castShadow = true;
  body.add(capelet);

  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.405, 0.43, 0.055, 10, 1, true), trimMat);
  hem.position.y = 0.435;
  body.add(hem);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.335, 0.07, 10, 1, true), leatherMat);
  belt.position.y = 0.92;
  body.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.075, 0.03), metalMat);
  buckle.position.set(0, 0.92, -0.31);
  body.add(buckle);

  // Back-of-cloak folds catch the lantern and moon just enough to describe cloth.
  for (let i = 0; i < 5; i += 1) {
    const angle = Math.PI - 0.72 + i * 0.36;
    const fold = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.56 - (i % 2) * 0.08, 0.018),
      i % 2 === 0 ? cloakLightMat : cloakShadowMat,
    );
    fold.position.set(Math.sin(angle) * 0.31, 0.73 - (i % 3) * 0.04, Math.cos(angle) * 0.31);
    fold.rotation.y = angle;
    body.add(fold);
  }

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 7), cloakMat);
  shoulder.scale.set(1.03, 0.5, 0.7);
  shoulder.position.y = 1.24;
  shoulder.castShadow = true;
  body.add(shoulder);

  // The face points toward the cabin; the camera sees the hood, scarf and pack.
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skinMat);
  face.scale.set(0.92, 1, 0.82);
  face.position.set(0, 1.35, 0.045);
  body.add(face);
  for (const x of [-0.045, 0.045]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), cloakShadowMat);
    eye.position.set(x, 1.38, 0.165);
    body.add(eye);
  }

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.245, 0.44, 10, 1, true), cloakShadowMat);
  hood.position.set(0, 1.48, -0.005);
  hood.rotation.x = -0.13;
  hood.castShadow = true;
  body.add(hood);
  const hoodCord = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.018, 5, 14), trimMat);
  hoodCord.rotation.x = Math.PI / 2;
  hoodCord.position.set(0, 1.27, -0.11);
  body.add(hoodCord);
  const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.041, 7, 6), trimMat);
  clasp.position.set(0, 1.27, -0.205);
  body.add(clasp);

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.034, 7, 16), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.22;
  body.add(scarf);

  const scarfTail = new THREE.Group();
  for (const dx of [-0.055, 0.05]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.3, 0.02), scarfMat);
    tail.position.set(dx, -0.14, 0);
    tail.rotation.x = -0.12;
    scarfTail.add(tail);
  }
  scarfTail.position.set(0, 1.12, -0.285);
  body.add(scarfTail);

  // Satchel, with a lighter flap and a visible strap.
  const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.3, 0.15), leatherMat);
  satchel.position.set(-0.25, 0.83, -0.24);
  satchel.rotation.y = 0.14;
  satchel.castShadow = true;
  body.add(satchel);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.12, 0.022), leatherLightMat);
  flap.position.set(-0.25, 0.94, -0.323);
  flap.rotation.y = 0.14;
  body.add(flap);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.022, 5, 18, Math.PI), leatherLightMat);
  strap.rotation.set(Math.PI / 2, 0.18, 0.16);
  strap.position.set(-0.06, 1.02, -0.04);
  body.add(strap);

  const legGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.5, 6);
  legGeo.translate(0, -0.25, 0);
  const bootGeo = new THREE.BoxGeometry(0.13, 0.12, 0.23);
  bootGeo.translate(0, -0.5, 0.045);
  const leftLeg = new THREE.Group();
  const leftLegMesh = new THREE.Mesh(legGeo, leatherMat);
  leftLegMesh.castShadow = true;
  const leftBoot = new THREE.Mesh(bootGeo, bootMat);
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
  const leftArmMesh = new THREE.Mesh(armGeo, cloakLightMat);
  leftArmMesh.castShadow = true;
  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.y = -0.49;
  const leftCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.068, 0.08, 6), trimMat);
  leftCuff.position.y = -0.425;
  leftArm.add(leftArmMesh, leftCuff, leftHand);
  leftArm.position.set(-0.3, 1.12, 0);
  leftArm.rotation.z = 0.08;
  body.add(leftArm);

  const rightArm = new THREE.Group();
  const rightArmMesh = new THREE.Mesh(armGeo, cloakLightMat);
  rightArmMesh.castShadow = true;
  const rightCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.068, 0.08, 6), trimMat);
  rightCuff.position.y = -0.425;
  rightArm.add(rightArmMesh, rightCuff);
  rightArm.position.set(0.3, 1.12, 0);
  rightArm.rotation.z = -0.08;
  body.add(rightArm);

  // A proper storm lantern: four thin cage posts, warm glass and a bright core.
  const lantern = new THREE.Group();
  const cage = new THREE.Group();
  for (const x of [-0.062, 0.062]) {
    for (const z of [-0.062, 0.062]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.23, 0.022), metalMat);
      post.position.set(x, 0.02, z);
      post.castShadow = true;
      cage.add(post);
    }
  }
  const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.16), metalMat);
  basePlate.position.y = -0.115;
  const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.16), metalMat);
  topPlate.position.y = 0.145;
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.105, 0.18, 0.105),
    new THREE.MeshBasicMaterial({
      color: '#ffd18c',
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  glass.position.y = 0.015;
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 6),
    new THREE.MeshBasicMaterial({ color: '#fff2c8', fog: false }),
  );
  core.position.y = 0.015;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.085, 6), metalMat);
  cap.position.y = 0.2;
  cap.rotation.y = Math.PI / 6;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.012, 5, 12, Math.PI), metalMat);
  handle.position.y = 0.28;
  handle.rotation.z = Math.PI / 2;
  cage.add(basePlate, topPlate, glass, core, cap, handle);
  lantern.add(cage);
  lantern.position.set(0.55 * def.lanternSide, 0.72, -0.34);
  lantern.scale.setScalar(1.18);
  body.add(lantern);

  const lanternGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('255,184,104'),
      color: '#ffbd72',
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  lanternGlow.scale.setScalar(0.88);
  lanternGlow.position.set(0, 0.02, 0.04);
  lantern.add(lanternGlow);

  const lanternLight = new THREE.PointLight('#ffb45e', 2.0, 4.2, 2);
  lanternLight.position.set(0, 0.03, 0.1);
  lantern.add(lanternLight);

  if (def.staff) {
    const staff = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 1.48, 6), woodMat);
    shaft.position.y = 0.74;
    shaft.castShadow = true;
    staff.add(shaft);
    const crook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 5, 12, Math.PI), woodMat);
    crook.position.y = 1.47;
    crook.rotation.z = Math.PI;
    staff.add(crook);
    const charm = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), brassMat);
    charm.position.set(0, 1.52, 0.025);
    staff.add(charm);
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.045, 0.1, 6), ironMat);
    ferrule.position.y = 0.05;
    staff.add(ferrule);
    staff.position.set(-0.46, 0, -0.02);
    staff.rotation.z = -0.025;
    body.add(staff);
  }

  if (def.pack === 'bedroll') {
    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.5, 8), canvasMat);
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 1.17, -0.28);
    bedroll.castShadow = true;
    body.add(bedroll);
    for (const x of [-0.15, 0.15]) {
      const strapBand = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 5, 10), leatherMat);
      strapBand.rotation.y = Math.PI / 2;
      strapBand.position.set(x, 1.17, -0.28);
      body.add(strapBand);
    }
  }

  if (def.pack === 'scroll') {
    const scrollCase = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.4, 8), leatherLightMat);
    scrollCase.rotation.z = 0.42;
    scrollCase.position.set(0.24, 1.02, -0.3);
    scrollCase.castShadow = true;
    body.add(scrollCase);
  }

  if (def.archetype === 'healer') {
    for (let i = 0; i < 4; i += 1) {
      const sprig = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18 + (i % 2) * 0.06, 4), new THREE.MeshStandardMaterial({
        color: '#7d9665',
        roughness: 0.9,
      }));
      sprig.position.set(-0.22 + i * 0.045, 0.74 + (i % 2) * 0.04, -0.32);
      sprig.rotation.z = (i - 1.5) * 0.2;
      body.add(sprig);
    }
  }

  if (def.archetype === 'elder') {
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 7), new THREE.MeshStandardMaterial({ color: '#d1c3ad', roughness: 1 }));
    beard.position.set(0, 1.23, 0.12);
    beard.rotation.x = 0.16;
    body.add(beard);
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.035, 10), leatherMat);
    hatBrim.position.set(0, 1.6, -0.01);
    hatBrim.castShadow = true;
    body.add(hatBrim);
    const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 9), cloakLightMat);
    hatCone.position.set(0, 1.72, -0.01);
    hatCone.castShadow = true;
    body.add(hatCone);
  }

  // Each traveler's body is static apart from the limb/lantern/scarf groups.
  // Merge those static parts and the contents of each animated group locally.
  mergeStaticMeshes(body, { exclude: [leftLeg, rightLeg, leftArm, rightArm, lantern, scarfTail] });
  mergeStaticMeshes(leftLeg);
  mergeStaticMeshes(rightLeg);
  mergeStaticMeshes(leftArm);
  mergeStaticMeshes(rightArm);
  mergeStaticMeshes(lantern);
  mergeStaticMeshes(scarfTail);

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
    scarfTail,
    yawOffset: def.yawOffset,
    startX: def.start[0],
    startZ: def.start[1],
    endX: def.end[0],
    endZ: def.end[1],
    delay: def.delay,
    duration: def.duration,
    phase: def.delay * 0.7,
  };
}

export function buildWalkers(): WalkerRefs {
  const group = new THREE.Group();
  group.name = 'approaching-travelers';
  const travelers = TRAVELERS.map(createTraveler);
  travelers.forEach((traveler) => group.add(traveler.root));

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
      traveler.scarfTail.rotation.x = -0.12 + Math.sin(step * 0.6) * 0.06;
      traveler.scarfTail.rotation.z = Math.cos(step * 0.5) * 0.05;
    } else {
      // At the door, settle into a quiet idle rather than snapping to a stop.
      const idle = Math.sin(elapsed * 0.72 + traveler.phase);
      traveler.leftLeg.rotation.x *= 0.92;
      traveler.rightLeg.rotation.x *= 0.92;
      traveler.leftArm.rotation.x = idle * 0.025;
      traveler.rightArm.rotation.x = -idle * 0.035;
      traveler.body.rotation.z = idle * 0.006;
      traveler.lantern.rotation.z = idle * 0.035;
      traveler.scarfTail.rotation.x = -0.12 + idle * 0.025;
    }

    // A small final turn gives the group a natural, conversational arrival pose.
    const turn = THREE.MathUtils.smoothstep(raw, 0.88, 1);
    traveler.root.rotation.y = Math.PI + turn * traveler.yawOffset;

    // Lanterns warm up as the travellers get closer to the porch.
    const closeness = THREE.MathUtils.clamp(1 - Math.abs(z) / 12, 0, 1);
    traveler.lanternLight.intensity = 3.0 + closeness * 1.8;
    traveler.lanternGlow.material.opacity = 0.68 + closeness * 0.16;
    traveler.lanternGlow.scale.setScalar(0.88 + closeness * 0.1);
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
