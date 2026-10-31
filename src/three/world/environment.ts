import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '@/game/random';
import {
  flameTexture,
  glowTexture,
  groundTexture,
  moonTexture,
  smokeTexture,
  softParticleTexture,
  stoneTexture,
  valueNoise,
} from '../textures';

export interface EnvironmentRefs {
  sky: THREE.Mesh;
  skyUniforms: Record<string, THREE.IUniform>;
  moon: THREE.Sprite;
  moonHalo: THREE.Sprite;
  stars: THREE.Points;
  starMaterial: THREE.PointsMaterial;
  clouds: THREE.Sprite[];
  ground: THREE.Mesh;
  pines: THREE.InstancedMesh[];
  fireflies: THREE.Points;
  fireflyMaterial: THREE.PointsMaterial;
  fireflyBase: Float32Array;
  fireflyPhase: Float32Array;
  mist: THREE.Sprite[];
  fireGroup: THREE.Group;
  fireFlames: THREE.Sprite[];
  fireLight: THREE.PointLight;
  firefliesCount: number;
  scatter: THREE.Group;
}

const SKY_VERT = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform float uDay;
  uniform vec3 uNightTop;
  uniform vec3 uNightHorizon;
  uniform vec3 uDayTop;
  uniform vec3 uDayHorizon;
  varying vec3 vWorldPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float h = clamp(dir.y, 0.0, 1.0);
    float t = smoothstep(0.0, 0.72, h);
    vec3 top = mix(uNightTop, uDayTop, uDay);
    vec3 horizon = mix(uNightHorizon, uDayHorizon, uDay);
    vec3 color = mix(horizon, top, t);

    // A low warm seam where the forest meets the sky.
    float seam = pow(1.0 - clamp(abs(dir.y) * 3.4, 0.0, 1.0), 3.0);
    color += vec3(0.16, 0.1, 0.05) * seam * (1.0 - uDay * 0.55);

    // Dithering keeps the very dark gradient free of banding.
    float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(color + dither, 1.0);
  }
`;

function addVertexColor(geometry: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const count = geometry.attributes.position.count;
  const array = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    array[i * 3] = color.r;
    array[i * 3 + 1] = color.g;
    array[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(array, 3));
  return geometry;
}

function buildPineGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.14, 0.26, 2.4, 6);
  trunk.translate(0, 1.2, 0);
  parts.push(addVertexColor(trunk, new THREE.Color('#4a3726')));

  const layers = [
    { radius: 1.85, height: 2.7, y: 2.15, color: '#284333' },
    { radius: 1.4, height: 2.3, y: 3.5, color: '#2d4b37' },
    { radius: 0.95, height: 1.9, y: 4.65, color: '#33533c' },
  ];
  for (const layer of layers) {
    const cone = new THREE.ConeGeometry(layer.radius, layer.height, 7, 1);
    cone.translate(0, layer.y, 0);
    parts.push(addVertexColor(cone, new THREE.Color(layer.color)));
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('failed to build pine geometry');
  return merged;
}

function buildGround(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(170, 170, 96, 96);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const dark = new THREE.Color('#2a2b22');
  const moss = new THREE.Color('#354a37');
  const pale = new THREE.Color('#5b5c46');

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const radius = Math.hypot(x, z);
    const clearing = THREE.MathUtils.smoothstep(radius, 8, 24);
    const noise = valueNoise(x * 0.09 + 3, z * 0.09 + 7) * 0.55 + valueNoise(x * 0.33, z * 0.33) * 0.2;
    const height = (noise - 0.28) * 1.4 * clearing;
    position.setY(i, height);
    const blend = THREE.MathUtils.clamp(noise * 1.15, 0, 1);
    const color = dark.clone().lerp(moss, blend);
    if (radius < 8) color.lerp(pale, 0.14);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const texture = groundTexture();
  texture.repeat.set(22, 22);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function buildTrees(): THREE.InstancedMesh[] {
  const rng = mulberry32(20261031);
  const geometry = buildPineGeometry();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    flatShading: true,
  });

  const near: Array<{ x: number; z: number; scale: number; rot: number; tint: number }> = [];
  let guard = 0;
  while (near.length < 150 && guard < 5000) {
    guard += 1;
    const angle = rng() * Math.PI * 2;
    const radius = 13 + rng() * 38;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.hypot(x, z + 8) < 8.5) continue;
    if (Math.hypot(x, z) < 12) continue;
    if (z > 7.5 && Math.abs(x) < 13) continue;
    near.push({
      x,
      z,
      scale: 0.7 + rng() * 1.05,
      rot: rng() * Math.PI * 2,
      tint: 0.82 + rng() * 0.36,
    });
  }

  const nearMesh = new THREE.InstancedMesh(geometry, material, near.length);
  nearMesh.castShadow = false;
  nearMesh.receiveShadow = false;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  near.forEach((tree, index) => {
    dummy.position.set(tree.x, 0, tree.z);
    dummy.rotation.y = tree.rot;
    dummy.scale.setScalar(tree.scale);
    dummy.updateMatrix();
    nearMesh.setMatrixAt(index, dummy.matrix);
    color.setRGB(tree.tint, tree.tint, tree.tint * 0.98);
    nearMesh.setColorAt(index, color);
  });
  nearMesh.instanceMatrix.needsUpdate = true;
  if (nearMesh.instanceColor) nearMesh.instanceColor.needsUpdate = true;

  const farMesh = new THREE.InstancedMesh(geometry, material, 90);
  for (let i = 0; i < 90; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = 52 + rng() * 32;
    dummy.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    dummy.rotation.y = rng() * Math.PI * 2;
    dummy.scale.setScalar(1.8 + rng() * 1.9);
    dummy.updateMatrix();
    farMesh.setMatrixAt(i, dummy.matrix);
    const tint = 0.5 + rng() * 0.25;
    color.setRGB(tint, tint, tint);
    farMesh.setColorAt(i, color);
  }
  farMesh.instanceMatrix.needsUpdate = true;
  if (farMesh.instanceColor) farMesh.instanceColor.needsUpdate = true;

  return [nearMesh, farMesh];
}

function buildFirePit(): { group: THREE.Group; flames: THREE.Sprite[]; light: THREE.PointLight } {
  const group = new THREE.Group();
  group.position.set(-6.9, 0, 3.4);
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 1 });
  const rng = mulberry32(123);
  for (let i = 0; i < 11; i += 1) {
    const angle = (i / 11) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + rng() * 0.14, 0), stoneMat);
    rock.position.set(Math.cos(angle) * 0.95, 0.12, Math.sin(angle) * 0.95);
    rock.rotation.set(rng(), rng(), rng());
    rock.scale.y = 0.7;
    rock.castShadow = true;
    group.add(rock);
  }
  const logMat = new THREE.MeshStandardMaterial({ color: '#3b2a1c', roughness: 1 });
  for (let i = 0; i < 5; i += 1) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.0, 6), logMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i / 5) * Math.PI + 0.2;
    log.position.set(0, 0.18 + (i % 2) * 0.08, 0);
    group.add(log);
  }
  const flameTex = flameTexture();
  const flames: THREE.Sprite[] = [];
  for (let i = 0; i < 4; i += 1) {
    const flame = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: flameTex,
        color: i === 1 ? '#ffd39a' : '#ff9d54',
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    flame.scale.set(0.9, 1.7, 1);
    flame.position.set((rng() - 0.5) * 0.4, 0.95, (rng() - 0.5) * 0.4);
    flame.userData.baseY = 0.95;
    group.add(flame);
    flames.push(flame);
  }
  const light = new THREE.PointLight('#ff8f45', 7, 12, 2);
  light.position.set(0, 1.3, 0);
  group.add(light);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('255,140,68'),
      color: '#ff9b52',
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  glow.scale.setScalar(3.4);
  glow.position.y = 0.7;
  group.add(glow);
  return { group, flames, light };
}

export function buildEnvironment(): EnvironmentRefs {
  const skyUniforms: Record<string, THREE.IUniform> = {
    uDay: { value: 0 },
    uNightTop: { value: new THREE.Color('#040a12') },
    uNightHorizon: { value: new THREE.Color('#21332c') },
    uDayTop: { value: new THREE.Color('#718da2') },
    uDayHorizon: { value: new THREE.Color('#d7b88b') },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(130, 36, 24),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  sky.renderOrder = -10;

  const moonTex = moonTexture();
  const moon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: moonTex,
      color: '#fff2cf',
      transparent: true,
      opacity: 1,
      depthWrite: false,
      fog: false,
    }),
  );
  moon.position.set(16, 29, -50);
  moon.scale.setScalar(13);
  moon.renderOrder = -8;

  const moonHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('255,231,180'),
      color: '#ffe7b0',
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  moonHalo.position.copy(moon.position);
  moonHalo.scale.setScalar(28);
  moonHalo.renderOrder = -9;

  const starCount = 650;
  const starPositions = new Float32Array(starCount * 3);
  const rng = mulberry32(7788);
  for (let i = 0; i < starCount; i += 1) {
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(0.03 + rng() * 0.92);
    const radius = 105;
    starPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    starPositions[i * 3 + 1] = Math.cos(phi) * radius;
    starPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: '#f4e7c7',
    size: 0.42,
    map: softParticleTexture(),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    fog: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.renderOrder = -7;

  const clouds: THREE.Sprite[] = [];
  const cloudTex = smokeTexture();
  for (let i = 0; i < 5; i += 1) {
    const cloud = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: cloudTex,
        color: '#7d9297',
        transparent: true,
        opacity: 0.075,
        depthWrite: false,
        fog: false,
      }),
    );
    cloud.position.set(-38 + i * 19, 22 + rng() * 10, -52 - rng() * 18);
    cloud.scale.set(38 + rng() * 20, 10 + rng() * 5, 1);
    cloud.userData.drift = 0.06 + rng() * 0.08;
    clouds.push(cloud);
  }

  const ground = buildGround();
  const pines = buildTrees();

  // path of flat stones from the clearing to the cabin door
  const scatter = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 1 });
  for (let i = 0; i < 42; i += 1) {
    const t = i / 41;
    const z = 16.8 - t * 22.6;
    const spread = 0.34 + t * 0.35;
    const x = Math.sin(i * 2.3) * spread + Math.sin(i * 0.37) * 0.12;
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.3 + (i % 3) * 0.075, 0.36, 0.065, 7), stoneMat);
    stone.position.set(x, 0.045, z);
    stone.rotation.y = i * 0.9;
    stone.scale.z = 0.85 + (i % 4) * 0.06;
    stone.receiveShadow = true;
    scatter.add(stone);
  }

  // grass tufts
  const grassGeo = new THREE.ConeGeometry(0.045, 0.38, 3);
  const grassMat = new THREE.MeshStandardMaterial({ color: '#3c4f39', roughness: 1, flatShading: true });
  const grass = new THREE.InstancedMesh(grassGeo, grassMat, 320);
  const dummy = new THREE.Object3D();
  const grassRng = mulberry32(913);
  for (let i = 0; i < 320; i += 1) {
    const angle = grassRng() * Math.PI * 2;
    const radius = 7.4 + grassRng() * 16;
    dummy.position.set(Math.cos(angle) * radius, 0.16, Math.sin(angle) * radius);
    dummy.rotation.set((grassRng() - 0.5) * 0.4, grassRng() * Math.PI, (grassRng() - 0.5) * 0.4);
    dummy.scale.set(0.7 + grassRng() * 0.7, 0.6 + grassRng() * 1.1, 0.7 + grassRng() * 0.7);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
  }
  scatter.add(grass);

  // A few near-black pines frame the clearing like the edges of a film frame.
  const framingMat = new THREE.MeshStandardMaterial({
    color: '#0c1711',
    roughness: 1,
    flatShading: true,
  });
  for (const [x, z, scale] of [
    [-14.5, 13.5, 2.8],
    [15.5, 10.5, 2.3],
    [-18.5, 21, 3.1],
  ] as const) {
    const tree = new THREE.Mesh(buildPineGeometry(), framingMat);
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    tree.rotation.y = x * 0.17;
    scatter.add(tree);
  }

  // scattered boulders at the edge of the clearing
  const boulderMat = new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 1 });
  const boulderRng = mulberry32(441);
  for (let i = 0; i < 14; i += 1) {
    const angle = boulderRng() * Math.PI * 2;
    const radius = 8.5 + boulderRng() * 9;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + boulderRng() * 0.5, 0), boulderMat);
    rock.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius);
    rock.rotation.set(boulderRng() * 2, boulderRng() * 2, boulderRng() * 2);
    rock.scale.y = 0.6 + boulderRng() * 0.4;
    rock.receiveShadow = true;
    scatter.add(rock);
  }

  // fireflies
  const fireflyCount = 90;
  const fireflyBase = new Float32Array(fireflyCount * 3);
  const fireflyPositions = new Float32Array(fireflyCount * 3);
  const fireflyPhase = new Float32Array(fireflyCount);
  const flyRng = mulberry32(661);
  for (let i = 0; i < fireflyCount; i += 1) {
    const angle = flyRng() * Math.PI * 2;
    const radius = 6 + flyRng() * 16;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 0.5 + flyRng() * 3.4;
    fireflyBase[i * 3] = x;
    fireflyBase[i * 3 + 1] = y;
    fireflyBase[i * 3 + 2] = z;
    fireflyPositions[i * 3] = x;
    fireflyPositions[i * 3 + 1] = y;
    fireflyPositions[i * 3 + 2] = z;
    fireflyPhase[i] = flyRng() * Math.PI * 2;
  }
  const fireflyGeometry = new THREE.BufferGeometry();
  fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
  const fireflyMaterial = new THREE.PointsMaterial({
    color: '#ffdd9e',
    size: 0.2,
    map: softParticleTexture(),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    fog: false,
  });
  const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);

  // low ground mist
  const mist: THREE.Sprite[] = [];
  for (let i = 0; i < 9; i += 1) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: cloudTex,
        color: '#b9cbc0',
        transparent: true,
        opacity: 0.055,
        depthWrite: false,
        fog: false,
      }),
    );
    const angle = (i / 9) * Math.PI * 2;
    sprite.position.set(Math.cos(angle) * 18, 1.0 + (i % 3) * 0.6, Math.sin(angle) * 18);
    sprite.scale.set(26 + (i % 4) * 6, 6 + (i % 3) * 2, 1);
    sprite.userData.phase = i * 0.8;
    mist.push(sprite);
  }

  const fire = buildFirePit();

  return {
    sky,
    skyUniforms,
    moon,
    moonHalo,
    stars,
    starMaterial,
    clouds,
    ground,
    pines,
    fireflies,
    fireflyMaterial,
    fireflyBase,
    fireflyPhase,
    mist,
    fireGroup: fire.group,
    fireFlames: fire.flames,
    fireLight: fire.light,
    firefliesCount: fireflyCount,
    scatter,
  };
}
