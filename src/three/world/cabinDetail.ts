import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture, makeCanvas, shingleTexture, stoneTexture, toTexture, woodTexture } from '../textures';

/**
 * Extra layers of cabin detail. The base cabin is intentionally simple so the
 * silhouette can be read from across the clearing; these pieces add the
 * close-up material story: stone footing, notched log ends, layered shingles,
 * shutters, ironwork, porch boards and a little lived-in clutter.
 */
export function addCabinDetails(group: THREE.Group): void {
  const trim = new THREE.MeshStandardMaterial({
    map: woodTexture('#4b3424', '#21140d'),
    color: '#b6a184',
    roughness: 0.96,
  });
  const trimDark = new THREE.MeshStandardMaterial({
    color: '#211711',
    roughness: 0.94,
  });
  const chink = new THREE.MeshStandardMaterial({ color: '#746a56', roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({
    color: '#27231e',
    metalness: 0.58,
    roughness: 0.42,
  });
  const stoneMap = stoneTexture();
  stoneMap.repeat.set(2.4, 1.6);
  const stone = new THREE.MeshStandardMaterial({ map: stoneMap, roughness: 1 });
  const moss = new THREE.MeshStandardMaterial({
    color: '#3b4a31',
    roughness: 1,
    flatShading: true,
  });
  const mossDeep = new THREE.MeshStandardMaterial({
    color: '#2a3828',
    roughness: 1,
    flatShading: true,
  });
  const cloth = new THREE.MeshStandardMaterial({
    color: '#4a2d26',
    roughness: 0.98,
    side: THREE.DoubleSide,
  });

  const add = (mesh: THREE.Mesh, cast = false, receive = true): THREE.Mesh => {
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    group.add(mesh);
    return mesh;
  };

  const box = (
    width: number,
    height: number,
    depth: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0,
    ry = 0,
    rz = 0,
    cast = false,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    return add(mesh, cast);
  };

  // ---- stone footing ----------------------------------------------------
  box(6.45, 0.42, 0.42, stone, 0, 0.15, 2.03, 0, 0, 0, true);
  box(6.45, 0.42, 0.42, stone, 0, 0.15, -2.03, 0, 0, 0, true);
  box(0.42, 0.42, 4.2, stone, -3.03, 0.15, 0, 0, 0, 0, true);
  box(0.42, 0.42, 4.2, stone, 3.03, 0.15, 0, 0, 0, 0, true);

  // Hand-laid stones give the footing an irregular, weathered edge.
  const footing: THREE.BufferGeometry[] = [];
  const stoneGeo = new THREE.BoxGeometry(0.38, 0.2, 0.2);
  for (let i = 0; i < 17; i += 1) {
    const x = -2.92 + i * 0.365;
    const geo = stoneGeo.clone();
    geo.scale(0.82 + (i % 3) * 0.08, 0.82 + (i % 4) * 0.05, 1);
    geo.rotateY((i % 2 === 0 ? 1 : -1) * 0.04);
    geo.translate(x, 0.18 + (i % 2) * 0.035, 2.28);
    footing.push(geo);
  }
  for (let i = 0; i < 12; i += 1) {
    const z = -1.9 + i * 0.35;
    const geo = stoneGeo.clone();
    geo.scale(0.85, 0.8, 0.95);
    geo.translate(i % 2 === 0 ? 3.26 : -3.26, 0.17 + (i % 3) * 0.02, z);
    footing.push(geo);
  }
  const footingMesh = new THREE.Mesh(mergeGeometries(footing, false)!, stone);
  footingMesh.castShadow = true;
  footingMesh.receiveShadow = true;
  group.add(footingMesh);
  footing.forEach((geo) => geo.dispose());

  // ---- chinking + log ends ---------------------------------------------
  const chinkStrips: THREE.BufferGeometry[] = [];
  for (let row = 0; row < 8; row += 1) {
    const y = 0.56 + row * 0.29;
    for (const z of [-2.19, 2.19]) {
      const geo = new THREE.BoxGeometry(6.08, 0.035, 0.02);
      geo.translate(0, y, z);
      chinkStrips.push(geo);
    }
    for (const x of [-2.99, 2.99]) {
      const geo = new THREE.BoxGeometry(0.02, 0.035, 4.35);
      geo.translate(x, y, 0);
      chinkStrips.push(geo);
    }
  }
  const chinkMesh = new THREE.Mesh(mergeGeometries(chinkStrips, false)!, chink);
  group.add(chinkMesh);
  chinkStrips.forEach((geo) => geo.dispose());

  const endGeo = new THREE.CylinderGeometry(0.175, 0.175, 0.24, 8, 1);
  const ends: THREE.BufferGeometry[] = [];
  for (let row = 0; row < 9; row += 1) {
    const y = 0.42 + row * 0.29;
    for (const z of [-2.18, 2.18]) {
      for (const x of [-3.11, 3.11]) {
        const geo = endGeo.clone();
        geo.rotateZ(Math.PI / 2);
        geo.translate(x, y, z);
        ends.push(geo);
      }
    }
    for (const x of [-2.96, 2.96]) {
      for (const z of [-2.3, 2.3]) {
        const geo = endGeo.clone();
        geo.rotateX(Math.PI / 2);
        geo.translate(x, y, z);
        ends.push(geo);
      }
    }
  }
  const endMesh = new THREE.Mesh(mergeGeometries(ends, false)!, trimDark);
  endMesh.castShadow = true;
  group.add(endMesh);
  ends.forEach((geo) => geo.dispose());
  endGeo.dispose();

  // ---- gable timber + attic vent ---------------------------------------
  for (const x of [-2.72, -1.82, -0.91, 0.91, 1.82, 2.72]) {
    const height = 1.3 - Math.abs(x) * 0.24;
    box(0.09, height, 0.06, trim, x, 3.22 + height * 0.2, 2.33, 0, 0, 0, true);
  }
  box(0.15, 1.5, 0.08, trimDark, 0, 3.68, 2.36, 0, 0, 0, true);
  for (const side of [-1, 1]) {
    const length = 2.8;
    const angle = side * 0.52;
    const brace = box(length, 0.1, 0.07, trim, side * 1.15, 3.42, 2.34, 0, 0, angle, true);
    brace.position.y = 3.37;
  }

  const vent = new THREE.Mesh(new THREE.CircleGeometry(0.29, 24), trimDark);
  vent.position.set(0, 4.02, 2.35);
  group.add(vent);
  for (let i = 0; i < 4; i += 1) {
    box(0.035, 0.54, 0.02, trim, 0, 4.02, 2.37, 0, 0, (i / 4) * Math.PI);
  }
  // ---- layered roof courses --------------------------------------------
  const slope = Math.atan2(1.18, 2.62);
  const courses: THREE.BufferGeometry[] = [];
  const courseGeo = new THREE.BoxGeometry(7.34, 0.045, 0.24);
  for (const dir of [1, -1]) {
    for (let i = 0; i < 9; i += 1) {
      const z = dir * (0.22 + i * 0.34);
      const y = 4.4 - Math.abs(z) * 0.45 + 0.05;
      const geo = courseGeo.clone();
      geo.rotateX(dir * slope);
      geo.translate(0, y, z);
      courses.push(geo);
    }
  }
  const courseMesh = new THREE.Mesh(
    mergeGeometries(courses, false)!,
    new THREE.MeshStandardMaterial({
      map: shingleTexture(),
      roughness: 1,
      color: '#a99a83',
    }),
  );
  courseMesh.castShadow = true;
  courseMesh.receiveShadow = true;
  group.add(courseMesh);
  courses.forEach((geo) => geo.dispose());
  courseGeo.dispose();

  const bargeGeo = new THREE.BoxGeometry(0.13, 0.2, 3.46);
  for (const x of [-3.7, 3.7]) {
    for (const dir of [1, -1]) {
      const barge = new THREE.Mesh(bargeGeo, trimDark);
      barge.position.set(x, 3.83, dir * 1.28);
      barge.rotation.x = dir * slope;
      barge.castShadow = true;
      group.add(barge);
    }
  }
  bargeGeo.dispose();

  const ridgeCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 7.55, 8, 1, true, 0, Math.PI),
    trimDark,
  );
  ridgeCap.rotation.z = Math.PI / 2;
  ridgeCap.position.y = 4.46;
  ridgeCap.castShadow = true;
  group.add(ridgeCap);

  // Exposed rafter tails under the front and back eaves.
  for (const dir of [1, -1]) {
    for (let i = 0; i < 9; i += 1) {
      const x = -3.3 + i * 0.82;
      box(0.085, 0.11, 0.7, trim, x, 3.18, dir * 2.44, 0, 0, 0, true);
    }
  }

  // Moss has begun to take the roof back.
  const roofMoss: THREE.BufferGeometry[] = [];
  const mossGeo = new THREE.DodecahedronGeometry(0.2, 0);
  for (let i = 0; i < 15; i += 1) {
    const x = -3.1 + ((i * 0.73) % 6.2);
    const dir = i % 2 === 0 ? 1 : -1;
    const z = dir * (0.35 + ((i * 0.41) % 2.5));
    const y = 4.4 - Math.abs(z) * 0.45 + 0.08;
    const geo = mossGeo.clone();
    geo.scale(1.2 + (i % 4) * 0.18, 0.13, 0.58 + (i % 3) * 0.15);
    geo.rotateY(i * 0.7);
    geo.translate(x, y, z);
    roofMoss.push(geo);
  }
  const roofMossMesh = new THREE.Mesh(mergeGeometries(roofMoss, false)!, moss);
  group.add(roofMossMesh);
  roofMoss.forEach((geo) => geo.dispose());
  mossGeo.dispose();

  // ---- chimney courses + cap --------------------------------------------
  for (let i = 0; i < 7; i += 1) {
    box(0.72 + (i % 2) * 0.035, 0.035, 0.72 + (i % 3) * 0.02, chink, 1.95, 3.22 + i * 0.28, -0.9);
  }
  box(0.9, 0.06, 0.9, iron, 1.95, 5.12, -0.9);
  box(0.5, 0.12, 0.5, trimDark, 1.95, 5.2, -0.9);

  // ---- door: jambs, planks, ironwork, wreath ---------------------------
  box(0.15, 2.18, 0.12, trimDark, -0.69, 1.46, 2.36, 0, 0, 0, true);
  box(0.15, 2.18, 0.12, trimDark, 0.69, 1.46, 2.36, 0, 0, 0, true);
  box(1.54, 0.17, 0.16, trimDark, 0, 2.55, 2.37, 0, 0, 0, true);
  box(1.18, 1.96, 0.07, trim, 0, 1.43, 2.405);
  for (let i = 0; i < 4; i += 1) {
    const x = -0.37 + i * 0.245;
    box(0.018, 1.78, 0.02, trimDark, x, 1.43, 2.45);
  }
  for (const y of [1.05, 1.82]) {
    box(0.62, 0.045, 0.025, iron, 0.12, y, 2.455);
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 8), iron);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(-0.23, y, 2.46);
    group.add(hinge);
  }
  for (const [x, y] of [
    [-0.38, 1.3],
    [-0.38, 1.56],
    [0.38, 1.3],
    [0.38, 1.56],
    [0.38, 1.08],
  ]) {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.027, 6, 5), iron);
    stud.position.set(x, y, 2.465);
    group.add(stud);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 7, 14), iron);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0.37, 1.34, 2.47);
  group.add(ring);

  // A small evergreen wreath keeps the door from feeling like a prop.
  const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 7, 18), mossDeep);
  wreath.position.set(0, 1.55, 2.48);
  wreath.castShadow = true;
  group.add(wreath);
  for (let i = 0; i < 7; i += 1) {
    const berry = new THREE.Mesh(
      new THREE.SphereGeometry(0.026, 6, 5),
      new THREE.MeshStandardMaterial({ color: '#8d3f32', roughness: 0.7 }),
    );
    const angle = (i / 7) * Math.PI * 2;
    berry.position.set(Math.cos(angle) * 0.23, 1.55 + Math.sin(angle) * 0.23, 2.52);
    group.add(berry);
  }
  box(0.38, 0.11, 0.1, stone, 0, 0.38, 2.47, 0, 0, 0, true);

  // Door plaque
  const signTexture = (() => {
    const [canvas, ctx] = makeCanvas(512, 160);
    ctx.fillStyle = '#231812';
    ctx.fillRect(0, 0, 512, 160);
    for (let i = 0; i < 28; i += 1) {
      ctx.strokeStyle = `rgba(190,155,110,${0.03 + (i % 5) * 0.01})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, (i / 28) * 160);
      ctx.bezierCurveTo(170, (i / 28) * 160 + 7, 320, (i / 28) * 160 - 5, 512, (i / 28) * 160);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(205,174,119,0.58)';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, 488, 136);
    ctx.fillStyle = 'rgba(236,214,174,0.92)';
    ctx.font = '500 54px "Songti SC", "STSong", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暮 林 山 舍', 256, 72);
    ctx.fillStyle = 'rgba(216,187,135,0.62)';
    ctx.font = '500 17px "Avenir Next", sans-serif';
    ctx.fillText('MULIN · NIGHTFALL', 256, 120);
    return toTexture(canvas, false);
  })();
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.2),
    new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.8, emissive: '#1a1008', emissiveIntensity: 0.3 }),
  );
  sign.position.set(0, 2.56, 2.47);
  group.add(sign);
  box(0.92, 0.28, 0.04, trimDark, 0, 2.56, 2.45);
  sign.position.z = 2.48;

  // ---- shutters, sills and flower boxes --------------------------------
  for (const x of [-1.72, 1.72]) {
    box(1.28, 0.08, 0.22, trimDark, x, 1.46, 2.34);
    for (const side of [-1, 1]) {
      const sx = x + side * 0.77;
      box(0.33, 0.96, 0.055, trim, sx, 2.02, 2.35, 0, 0, side * 0.02, true);
      for (let i = 0; i < 4; i += 1) {
        box(0.26, 0.025, 0.025, trimDark, sx, 1.72 + i * 0.18, 2.385);
      }
    }
    box(1.0, 0.22, 0.27, trim, x, 1.35, 2.47, 0, 0, 0, true);
    for (let i = 0; i < 5; i += 1) {
      const sprig = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28 + (i % 3) * 0.08, 5), moss);
      sprig.position.set(x - 0.32 + i * 0.16, 1.58, 2.48);
      sprig.rotation.z = (i - 2) * 0.16;
      group.add(sprig);
    }
    // A dim curtain behind each pane.
    for (const side of [-1, 1]) {
      const curtain = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.72), cloth);
      curtain.position.set(x + side * 0.34, 2.0, 2.325);
      group.add(curtain);
    }
  }

  // ---- porch boards, rails and bench -----------------------------------
  const plankMats = [
    new THREE.MeshStandardMaterial({ map: woodTexture('#62442f', '#2d1c12'), roughness: 0.96 }),
    new THREE.MeshStandardMaterial({ map: woodTexture('#543b29', '#281910'), roughness: 1 }),
  ];
  for (let i = 0; i < 8; i += 1) {
    const material = plankMats[i % 2];
    box(0.46, 0.07, 1.62, material, -1.86 + i * 0.53, 0.255, 3.0);
  }
  for (const side of [-1, 1]) {
    box(0.08, 0.08, 1.56, trimDark, side * 2.06, 1.02, 3.04, 0, 0, 0, true);
    box(0.08, 0.08, 1.56, trimDark, side * 2.06, 0.43, 3.04);
    for (let i = 0; i < 5; i += 1) {
      box(0.045, 0.56, 0.045, trim, side * 2.06, 0.72, 2.38 + i * 0.34);
    }
  }
  // Header beam across the porch posts.
  box(4.25, 0.12, 0.14, trimDark, 0, 2.56, 3.62, 0, 0, 0, true);
  for (const side of [-1, 1]) {
    box(0.09, 0.09, 1.34, trim, side * 1.79, 2.13, 3.55, 0, 0, 0.72, true);
  }
  // Bench under the right-hand window.
  box(1.2, 0.09, 0.36, trim, 1.24, 0.58, 2.67, 0, 0, 0, true);
  for (const x of [0.72, 1.76]) {
    box(0.08, 0.46, 0.3, trimDark, x, 0.36, 2.67);
  }
  for (let i = 0; i < 3; i += 1) {
    box(1.05, 0.055, 0.07, trim, 1.24, 0.95 + i * 0.16, 2.86, -0.12, 0, 0, true);
  }
  // A barrel and a pair of boots make the porch feel used.
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.52, 12), plankMats[1]);
  barrel.position.set(-2.55, 0.27, 2.82);
  barrel.castShadow = true;
  group.add(barrel);
  for (const y of [0.08, 0.3, 0.46]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.014, 5, 14), iron);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(-2.55, y, 2.82);
    group.add(hoop);
  }
  box(0.22, 0.2, 0.3, trimDark, -0.72, 0.36, 2.58, 0, 0.22, 0, true);
  box(0.22, 0.2, 0.3, trimDark, -0.48, 0.36, 2.61, 0, -0.12, 0, true);

  // ---- firewood rack ----------------------------------------------------
  box(0.08, 1.1, 0.08, trimDark, 3.02, 0.62, 1.92, 0, 0, 0, true);
  box(0.08, 1.1, 0.08, trimDark, 3.02, 0.62, 2.8, 0, 0, 0, true);
  box(0.38, 0.08, 1.02, trimDark, 3.02, 1.14, 2.36, 0, 0, 0, true);
  const logMat = new THREE.MeshStandardMaterial({ color: '#4e3624', roughness: 1 });
  for (let row = 0; row < 3; row += 1) {
    for (let i = 0; i < 5; i += 1) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.8, 6), logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = Math.PI / 2;
      log.position.set(3.25, 0.18 + row * 0.18, 1.98 + i * 0.17);
      log.castShadow = true;
      group.add(log);
    }
  }

  // ---- path lanterns ----------------------------------------------------
  for (const side of [-1, 1]) {
    const x = side * 2.55;
    box(0.1, 1.5, 0.1, trimDark, x, 0.75, 4.8, 0, 0, 0, true);
    box(0.28, 0.06, 0.28, iron, x, 1.52, 4.8);
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.25, 0.2),
      new THREE.MeshBasicMaterial({ color: '#ffc77d', fog: false }),
    );
    lamp.position.set(x, 1.38, 4.8);
    group.add(lamp);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.12, 4), iron);
    cap.position.set(x, 1.56, 4.8);
    cap.rotation.y = Math.PI / 4;
    group.add(cap);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture('255,180,94'),
        color: '#ffb45e',
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    glow.scale.setScalar(1.35);
    glow.position.set(x, 1.38, 4.8);
    group.add(glow);
  }

  // A left-hand porch lantern to balance the existing right-hand one.
  const leftLantern = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.3, 0.22),
    new THREE.MeshBasicMaterial({ color: '#ffd18a', fog: false }),
  );
  leftLantern.position.set(-1.18, 2.42, 2.72);
  group.add(leftLantern);
  const leftCap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.14, 4), trimDark);
  leftCap.position.set(-1.18, 2.64, 2.72);
  leftCap.rotation.y = Math.PI / 4;
  group.add(leftCap);
  const leftGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture('255,181,96'),
      color: '#ffb45e',
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  leftGlow.scale.setScalar(1.25);
  leftGlow.position.set(-1.18, 2.42, 2.74);
  group.add(leftGlow);

  // A little moss at the base of the walls.
  const baseMoss: THREE.BufferGeometry[] = [];
  const baseMossGeo = new THREE.DodecahedronGeometry(0.17, 0);
  for (let i = 0; i < 18; i += 1) {
    const x = -2.8 + ((i * 0.67) % 5.6);
    const z = i % 2 === 0 ? 2.26 : -2.26;
    const geo = baseMossGeo.clone();
    geo.scale(1.1 + (i % 4) * 0.2, 0.24, 0.7);
    geo.rotateY(i * 0.8);
    geo.translate(x, 0.3, z);
    baseMoss.push(geo);
  }
  const baseMossMesh = new THREE.Mesh(mergeGeometries(baseMoss, false)!, mossDeep);
  group.add(baseMossMesh);
  baseMoss.forEach((geo) => geo.dispose());
  baseMossGeo.dispose();
  stoneGeo.dispose();
}
