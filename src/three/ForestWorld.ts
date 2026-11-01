import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Player, Phase, Faction } from '@/game/types';
import { buildCabin, type CabinRefs } from './world/cabin';
import { buildTable, type SeatFigureRefs, type TableRefs } from './world/table';
import { buildEnvironment, type EnvironmentRefs } from './world/environment';
import { buildWalkers, type WalkerRefs } from './world/walkers';
import { clearSeatPoints, setSeatPoints, type SeatPoint } from './projection';

export type WorldMode = 'home' | 'lobby' | 'reveal' | 'table' | 'result';
type SceneFamily = 'cabin' | 'table';

interface CameraPreset {
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
  orbit: boolean;
  minDistance: number;
  maxDistance: number;
  minPolar: number;
  maxPolar: number;
  azSwing: number;
}

const PRESETS: Record<WorldMode, CameraPreset> = {
  home: {
    pos: [1.0, 4.3, 27.5],
    target: [-3.2, 2.55, -8],
    fov: 36,
    orbit: true,
    minDistance: 17,
    maxDistance: 36,
    minPolar: 1.12,
    maxPolar: 1.5,
    azSwing: 0.3,
  },
  lobby: {
    pos: [1.6, 4.0, 27],
    target: [-4.8, 3.1, -8],
    fov: 38,
    orbit: true,
    minDistance: 16,
    maxDistance: 34,
    minPolar: 1.12,
    maxPolar: 1.5,
    azSwing: 0.26,
  },
  reveal: {
    pos: [0, 7.1, 11.2],
    target: [0, 1.45, 0],
    fov: 40,
    orbit: false,
    minDistance: 10,
    maxDistance: 18,
    minPolar: 1.0,
    maxPolar: 1.35,
    azSwing: 0.1,
  },
  table: {
    pos: [0, 10.4, 18.4],
    target: [0, 0.7, 0],
    fov: 42,
    orbit: true,
    minDistance: 16,
    maxDistance: 26,
    minPolar: 0.92,
    maxPolar: 1.22,
    azSwing: 0.4,
  },
  result: {
    pos: [0, 9.3, 18.2],
    target: [0, 0.7, 0],
    fov: 42,
    orbit: false,
    minDistance: 16,
    maxDistance: 26,
    minPolar: 0.92,
    maxPolar: 1.22,
    azSwing: 0.2,
  },
};

const NIGHT_FOG = new THREE.Color('#0a1411');
const DAY_FOG = new THREE.Color('#e1e6dc');
const NIGHT_HEMI_SKY = new THREE.Color('#7f9db3');
const DAY_HEMI_SKY = new THREE.Color('#e2f0f2');
const NIGHT_HEMI_GROUND = new THREE.Color('#211a12');
const DAY_HEMI_GROUND = new THREE.Color('#aaa085');
const NIGHT_AMBIENT = new THREE.Color('#2a3a33');
const DAY_AMBIENT = new THREE.Color('#c7d2cf');
const WINDOW_NIGHT = new THREE.Color('#ffc06a');
const WINDOW_DAY = new THREE.Color('#d8c9a8');
const DEATH_GREY = new THREE.Color('#4a4a42');
const DIAL_NIGHT = new THREE.Color('#f0d3a0');
const DIAL_VOTE = new THREE.Color('#cf8274');
const DIAL_WOLF = new THREE.Color('#b08a7c');

interface CamTween {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  fromFov: number;
  toFov: number;
  elapsed: number;
  duration: number;
  preset: CameraPreset;
  intro?: boolean;
}

interface SeatDeathState {
  dead: boolean;
  t: number;
  baseBody: THREE.Color;
  baseHood: THREE.Color;
  baseFace: THREE.Color;
  baseLantern: THREE.Color;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class ForestWorld {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private clock = new THREE.Clock();
  private raf = 0;
  private elapsed = 0;
  private disposed = false;

  private env: EnvironmentRefs;
  private cabin: CabinRefs;
  private walkers: WalkerRefs;
  private table: TableRefs;
  private tableGroup: THREE.Group;
  private tableKey: THREE.PointLight;
  private tableRim: THREE.PointLight;
  private tableHalo: THREE.PointLight;
  private anchors = new Map<number, THREE.Object3D>();
  private deathStates = new Map<number, SeatDeathState>();

  private family: SceneFamily = 'cabin';
  private mode: WorldMode = 'home';
  private camTween: CamTween | null = null;
  private introActive = true;
  private introStartedAt = 0;
  private introDuration = 4.8;

  private hemi: THREE.HemisphereLight;
  private ambient: THREE.AmbientLight;
  private moonLight: THREE.DirectionalLight;
  private sunLight: THREE.DirectionalLight;
  private pathFill: THREE.DirectionalLight;
  private eyesClosed = false;

  private dayMix = 0.08;
  private dayTarget = 0.08;
  private dialColor = DIAL_NIGHT.clone();
  private dialTarget = DIAL_NIGHT.clone();
  private speaker: number | null = null;
  private selected: number | null = null;
  private lastProjection = 0;
  private onFirstFrame?: () => void;
  private firstFrameDone = false;
  private isMobile = false;
  private mobileView = false;
  private reducedMotion = false;

  constructor(canvas: HTMLCanvasElement, players: Player[], onFirstFrame?: () => void) {
    this.canvas = canvas;
    this.introStartedAt = performance.now();
    this.onFirstFrame = onFirstFrame;
    this.isMobile = window.matchMedia('(max-width: 780px)').matches || navigator.maxTouchPoints > 1;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.isMobile,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.6 : 1.9));
    this.renderer.setClearColor('#070d0a', 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isMobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(NIGHT_FOG, 0.018);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220);
    this.camera.position.set(0, 14, 52);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.34;
    this.controls.zoomSpeed = 0.6;
    this.controls.enabled = false;
    this.controls.target.set(0, 7.0, -10);

    // ---- lights ---------------------------------------------------------
    this.hemi = new THREE.HemisphereLight(NIGHT_HEMI_SKY, NIGHT_HEMI_GROUND, 0.56);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(NIGHT_AMBIENT, 0.38);
    this.scene.add(this.ambient);

    this.moonLight = new THREE.DirectionalLight('#b7cde2', 1.3);
    this.moonLight.position.set(16, 22, 20);
    this.moonLight.target.position.set(0, 1.5, -8);
    this.scene.add(this.moonLight, this.moonLight.target);
    if (!this.isMobile) {
      this.moonLight.castShadow = true;
      this.moonLight.shadow.mapSize.set(1024, 1024);
      this.moonLight.shadow.camera.left = -16;
      this.moonLight.shadow.camera.right = 16;
      this.moonLight.shadow.camera.top = 16;
      this.moonLight.shadow.camera.bottom = -16;
      this.moonLight.shadow.camera.near = 1;
      this.moonLight.shadow.camera.far = 70;
      this.moonLight.shadow.bias = -0.0006;
      this.moonLight.shadow.normalBias = 0.04;
    }

    this.sunLight = new THREE.DirectionalLight('#f0c48b', 0);
    this.sunLight.position.set(-14, 22, 12);
    this.scene.add(this.sunLight);

    // A cool rim separates the cabin roof from the tree line.
    const rim = new THREE.DirectionalLight('#6d8fa0', 0.55);
    rim.position.set(-16, 14, -22);
    rim.target.position.set(0, 3, -8);
    this.scene.add(rim, rim.target);

    // A soft warm bounce from the cabin side lifts the backs of the travellers.
    // Shadowless and low-contrast: porch spill rather than a second key light.
    this.pathFill = new THREE.DirectionalLight('#e3c6a6', 1.35);
    this.pathFill.position.set(-7, 7, 20);
    this.pathFill.target.position.set(0, 1.1, 0);
    this.scene.add(this.pathFill, this.pathFill.target);

    // ---- world ----------------------------------------------------------
    this.env = buildEnvironment();
    this.scene.add(this.env.sky, this.env.moonHalo, this.env.moon, this.env.stars);
    this.env.clouds.forEach((cloud) => this.scene.add(cloud));
    this.scene.add(this.env.ground, ...this.env.pines, this.env.fireflies, ...this.env.mist, this.env.fireGroup, this.env.scatter);

    this.cabin = buildCabin(1.12);
    this.cabin.group.position.set(0, 0, -8);
    this.scene.add(this.cabin.group);

    this.walkers = buildWalkers();
    this.scene.add(this.walkers.group);
    this.walkers.reset(performance.now() / 1000);
    this.walkers.update(performance.now() / 1000);

    this.table = buildTable(players.map((player) => ({ seat: player.seat, character: player.character })));
    this.tableGroup = this.table.group;
    this.tableGroup.visible = false;
    this.scene.add(this.tableGroup);

    // Dedicated table lighting: the candle pool alone leaves the seated figures in shadow.
    this.tableKey = new THREE.PointLight('#ffd7ad', 58, 26, 2);
    this.tableKey.position.set(0.4, 8.2, 7.4);
    this.tableGroup.add(this.tableKey);
    this.tableRim = new THREE.PointLight('#a7bfd0', 26, 28, 2);
    this.tableRim.position.set(-4.5, 6.4, -7.2);
    this.tableGroup.add(this.tableRim);
    this.tableHalo = new THREE.PointLight('#ffcf9c', 38, 17, 2);
    this.tableHalo.position.set(0, 5.3, 0);
    this.tableGroup.add(this.tableHalo);

    for (const [seat, refs] of this.table.seats) {
      const seatAnchor = new THREE.Object3D();
      seatAnchor.position.set(0, 2.85, 0);
      refs.group.add(seatAnchor);
      this.anchors.set(seat, seatAnchor);
      this.deathStates.set(seat, {
        dead: false,
        t: 0,
        baseBody: refs.bodyMat.color.clone(),
        baseHood: refs.hoodMat.color.clone(),
        baseFace: refs.faceMat.color.clone(),
        baseLantern: refs.lanternMat.color.clone(),
      });
    }

    this.setupComposer();
    this.resize();
    this.bindEvents();
    this.updateCamera(0.016);
    this.render();
    this.startLoop();
  }

  private setupComposer(): void {
    if (this.reducedMotion) return;
    try {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(
        new THREE.Vector2(1, 1),
        this.isMobile ? 0.28 : 0.42,
        0.62,
        0.82,
      );
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
    } catch (error) {
      console.warn('[mulin-night] postprocessing unavailable, falling back to direct render', error);
      this.composer = null;
      this.bloom = null;
    }
  }

  private onResize = (): void => {
    this.resize();
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    const parent = this.canvas.parentElement;
    if (parent && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(parent);
    }
  }

  private resizeObserver: ResizeObserver | null = null;

  resize(): void {
    const parent = this.canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || window.innerHeight;
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height);
    this.lastProjection = 0;

    const narrow = width <= 780;
    const mobileAware =
      this.mode === 'home' || this.mode === 'lobby' || this.mode === 'table' || this.mode === 'result';
    if (mobileAware && narrow !== this.mobileView) {
      this.mobileView = narrow;
      const preset = this.presetFor(this.mode);
      this.camTween = null;
      this.camera.position.set(...preset.pos);
      this.camera.fov = preset.fov;
      this.camera.updateProjectionMatrix();
      this.configureControls(preset, true);
    }
  }

  setMode(mode: WorldMode): void {
    if (mode === this.mode) return;
    const nextFamily: SceneFamily = mode === 'home' || mode === 'lobby' ? 'cabin' : 'table';
    const preset = this.presetFor(mode);
    const familyChange = nextFamily !== this.family;

    this.mode = mode;
    this.family = nextFamily;
    this.introActive = false;
    this.tableGroup.visible = nextFamily === 'table';
    this.walkers.group.visible = nextFamily === 'cabin';
    if (nextFamily === 'cabin' && familyChange) this.walkers.reset(performance.now() / 1000);
    this.renderer.toneMappingExposure = nextFamily === 'table' ? 1.2 : 1.08;

    if (nextFamily === 'table') {
      this.cabin.group.position.z = -23;
      this.cabin.group.scale.setScalar(1.3);
    } else {
      this.cabin.group.position.z = -8;
      this.cabin.group.scale.setScalar(1.12);
    }

    if (familyChange) {
      clearSeatPoints();
      this.camera.position.set(...preset.pos);
      this.controls.target.set(...preset.target);
      this.camera.fov = preset.fov;
      this.camera.updateProjectionMatrix();
      this.camTween = null;
      this.configureControls(preset, true);
    } else {
      this.tweenTo(preset, mode === 'result' ? 3.2 : 2.3);
    }

    if (mode === 'home' || mode === 'lobby') {
      this.setDayTarget(0.06);
    } else if (mode !== 'result') {
      this.setDayTarget(0);
    }

    if (mode === 'reveal') {
      for (const state of this.deathStates.values()) {
        state.dead = false;
        state.t = 0;
      }
      this.speaker = null;
      this.selected = null;
    }
  }

  private presetFor(mode: WorldMode): CameraPreset {
    const base = PRESETS[mode];
    const narrow = typeof window !== 'undefined' && window.innerWidth <= 780;
    if (!this.isMobile && !narrow) return base;
    if (mode === 'home' || mode === 'lobby') {
      return {
        ...base,
        pos: [base.pos[0], base.pos[1] + 0.2, base.pos[2] + 6],
        fov: 50,
        minDistance: 22,
        maxDistance: 44,
      };
    }
    if (mode !== 'table' && mode !== 'result') return base;
    return {
      ...base,
      pos: [0, 12.6, 25.8],
      fov: 62,
      minDistance: 20,
      maxDistance: 34,
    };
  }

  private tweenTo(preset: CameraPreset, duration: number): void {
    this.camTween = {
      fromPos: this.camera.position.clone(),
      toPos: new THREE.Vector3(...preset.pos),
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(...preset.target),
      fromFov: this.camera.fov,
      toFov: preset.fov,
      elapsed: 0,
      duration,
      preset,
    };
    this.controls.enabled = false;
  }

  private configureControls(preset: CameraPreset, allowOrbit: boolean): void {
    this.controls.target.set(...preset.target);
    this.controls.minDistance = preset.minDistance;
    this.controls.maxDistance = preset.maxDistance;
    this.controls.minPolarAngle = preset.minPolar;
    this.controls.maxPolarAngle = preset.maxPolar;
    const azimuth = Math.atan2(this.camera.position.x - preset.target[0], this.camera.position.z - preset.target[2]);
    this.controls.minAzimuthAngle = azimuth - preset.azSwing;
    this.controls.maxAzimuthAngle = azimuth + preset.azSwing;
    this.controls.enabled = preset.orbit && allowOrbit;
    this.controls.update();
  }

  setPhase(phase: Phase, winner: Faction | null): void {
    // Night is the only phase where the whole table closes their eyes.
    this.eyesClosed = phase === 'night';
    switch (phase) {
      case 'night':
        this.setDayTarget(0);
        this.setDial(DIAL_NIGHT);
        break;
      case 'dawn':
        this.setDayTarget(0.88);
        this.setDial(DIAL_NIGHT);
        break;
      case 'discussion':
        this.setDayTarget(0.94);
        this.setDial(DIAL_NIGHT);
        break;
      case 'vote':
        this.setDayTarget(0.9);
        this.setDial(DIAL_VOTE);
        break;
      case 'result':
        this.setDayTarget(winner === 'good' ? 1 : 0.04);
        this.setDial(winner === 'good' ? DIAL_NIGHT : DIAL_WOLF);
        break;
      default:
        this.setDayTarget(0.08);
    }
  }

  private setDayTarget(target: number): void {
    this.dayTarget = target;
  }

  private setDial(color: THREE.Color): void {
    this.dialTarget.copy(color);
  }

  setSpeaker(seat: number | null): void {
    this.speaker = seat;
  }

  setSelected(seat: number | null): void {
    this.selected = seat;
  }

  resetView(): void {
    const preset = this.presetFor(this.mode);
    if (!preset.orbit) return;
    this.camTween = null;
    this.tweenTo(preset, 1.6);
  }

  setSeatAlive(seat: number, alive: boolean): void {
    const state = this.deathStates.get(seat);
    if (state) state.dead = !alive;
  }

  private startLoop(): void {
    const loop = (): void => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.elapsed += dt;
      this.updateCamera(dt);
      this.updateAtmosphere(dt);
      this.walkers.update(performance.now() / 1000);
      this.updateSeats(dt);
      this.controls.update();
      if (!this.firstFrameDone) {
        this.firstFrameDone = true;
        this.onFirstFrame?.();
      }
      this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }

  private updateCamera(dt: number): void {
    if (this.introActive) {
      const p = THREE.MathUtils.clamp((performance.now() - this.introStartedAt) / (this.introDuration * 1000), 0, 1);
      const e = easeInOutCubic(p);
      const home = this.presetFor('home');
      this.camera.position.lerpVectors(new THREE.Vector3(1.2, 6.8, 36), new THREE.Vector3(...home.pos), e);
      this.controls.target.lerpVectors(new THREE.Vector3(-2.4, 3.4, -8), new THREE.Vector3(...home.target), e);
      this.camera.fov = THREE.MathUtils.lerp(39, home.fov, e);
      this.camera.updateProjectionMatrix();
      if (p >= 1) {
        this.introActive = false;
        this.configureControls(home, true);
        this.setDayTarget(0.06);
      }
      return;
    }

    if (this.camTween) {
      this.camTween.elapsed += dt;
      const p = THREE.MathUtils.clamp(this.camTween.elapsed / this.camTween.duration, 0, 1);
      const e = easeInOutCubic(p);
      this.camera.position.lerpVectors(this.camTween.fromPos, this.camTween.toPos, e);
      this.controls.target.lerpVectors(this.camTween.fromTarget, this.camTween.toTarget, e);
      this.camera.fov = THREE.MathUtils.lerp(this.camTween.fromFov, this.camTween.toFov, e);
      this.camera.updateProjectionMatrix();
      if (p >= 1) {
        const preset = this.camTween.preset;
        this.camTween = null;
        this.configureControls(preset, true);
      }
    }
  }

  private updateAtmosphere(dt: number): void {
    const t = this.elapsed;
    this.dayMix += (this.dayTarget - this.dayMix) * Math.min(1, dt * 1.1);
    const day = this.dayMix;

    this.env.skyUniforms.uDay.value = day;
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(NIGHT_FOG).lerp(DAY_FOG, day);
    fog.density = THREE.MathUtils.lerp(0.018, 0.0006, day);

    const tableLift = this.family === 'table' ? 1 : 0;
    const tableDay = tableLift * day;
    this.hemi.intensity = THREE.MathUtils.lerp(0.56, 1.16, day) + tableLift * 0.24 + tableDay * 0.82;
    this.hemi.color.copy(NIGHT_HEMI_SKY).lerp(DAY_HEMI_SKY, day);
    this.hemi.groundColor.copy(NIGHT_HEMI_GROUND).lerp(DAY_HEMI_GROUND, day);
    this.ambient.intensity = THREE.MathUtils.lerp(0.4, 0.78, day) + tableLift * 0.22 + tableDay * 0.58;
    this.ambient.color.copy(NIGHT_AMBIENT).lerp(DAY_AMBIENT, day);
    this.moonLight.intensity = THREE.MathUtils.lerp(1.3, 0.28, day);
    this.sunLight.intensity = day * (1.18 + tableDay * 2.4);
    this.renderer.toneMappingExposure = (this.family === 'table' ? 1.2 : 1.08) + day * 0.1 + tableDay * 0.5;
    if (this.bloom) this.bloom.strength = (this.isMobile ? 0.28 : 0.42) * (1 - day * 0.55);
    this.pathFill.intensity = this.family === 'cabin' ? 1.35 * (1 - day * 0.6) : 0;

    // Lift the forest out of its night palette as the table enters daylight.
    // Emissive tint is gentler than flooding the scene with another white light.
    const pineMat = this.env.pines[0]?.material as THREE.MeshStandardMaterial | undefined;
    if (pineMat) {
      pineMat.emissive.set('#b4cc9e');
      pineMat.emissiveIntensity = day * 0.86;
    }
    const groundMat = this.env.ground.material as THREE.MeshStandardMaterial;
    groundMat.emissive.set('#d8cba3');
    groundMat.emissiveIntensity = day * 0.74;

    this.env.starMaterial.opacity = 0.85 * (1 - day * 0.96);
    (this.env.moon.material as THREE.SpriteMaterial).opacity = 1 - day * 0.75;
    (this.env.moonHalo.material as THREE.SpriteMaterial).opacity = 0.35 * (1 - day * 0.8);
    this.env.fireflyMaterial.opacity = 0.85 * (1 - day * 0.95);

    for (const material of this.cabin.windowMaterials) {
      material.color.copy(WINDOW_NIGHT).lerp(WINDOW_DAY, day);
    }
    for (const glow of this.cabin.windowGlow) {
      (glow.material as THREE.SpriteMaterial).opacity = 0.5 * (1 - day * 0.7);
    }
    for (const light of this.cabin.windowLights) {
      light.intensity = 3.4 * (1 - day * 0.72);
    }
    this.cabin.lanternLight.intensity = 6.0 * (1 - day * 0.6);
    this.cabin.doorLight.intensity = 4.2 * (1 - day * 0.6);

    // candles and fire
    const flicker = 0.88 + Math.sin(t * 8.4) * 0.06 + Math.sin(t * 21.7) * 0.035;
    this.table.candleLight.intensity = 7 * flicker * (1 - day * 0.92);
    this.tableKey.intensity = 58 * (1 - day * 0.9) * (0.97 + Math.sin(t * 3.7) * 0.03);
    this.tableRim.intensity = 26 * (1 - day * 0.62);
    this.tableHalo.intensity = 38 * (1 - day * 0.9);
    for (let i = 0; i < this.table.flames.length; i += 1) {
      const flame = this.table.flames[i];
      const wobble = 1 + Math.sin(t * 11 + i * 2.1) * 0.12;
      flame.scale.set(0.25 * wobble, 0.55 * (1 + Math.sin(t * 9 + i) * 0.1), 1);
      flame.position.y = (flame.userData.baseY as number) + Math.sin(t * 7 + i) * 0.02;
    }
    this.env.fireLight.intensity = 8.5 * (0.9 + Math.sin(t * 6.2) * 0.06 + Math.sin(t * 13.1) * 0.04) * (1 - day * 0.82);
    for (let i = 0; i < this.env.fireFlames.length; i += 1) {
      const flame = this.env.fireFlames[i];
      const wobble = 1 + Math.sin(t * 9.5 + i * 1.7) * 0.16;
      flame.scale.set(0.9 * wobble, 1.7 * (1 + Math.sin(t * 7.3 + i) * 0.13), 1);
      flame.position.y = (flame.userData.baseY as number) + Math.sin(t * 5 + i) * 0.04;
    }

    // smoke drifting from the chimney
    for (const [index, sprite] of this.cabin.smoke.entries()) {
      const phase = ((t * 0.055 + index / this.cabin.smoke.length) % 1 + 1) % 1;
      sprite.position.y = 5.15 + phase * 4.6;
      sprite.position.x = 1.95 + Math.sin(phase * 5.2 + index) * 0.55 + phase * 0.5;
      const scale = 0.7 + phase * 2.2;
      sprite.scale.set(scale, scale, 1);
      (sprite.material as THREE.SpriteMaterial).opacity = Math.sin(phase * Math.PI) * 0.22;
    }

    // fireflies
    const positions = this.env.fireflies.geometry.attributes.position as THREE.BufferAttribute;
    const array = positions.array as Float32Array;
    for (let i = 0; i < this.env.firefliesCount; i += 1) {
      const phase = this.env.fireflyPhase[i];
      array[i * 3] = this.env.fireflyBase[i * 3] + Math.sin(t * 0.36 + phase) * 0.9;
      array[i * 3 + 1] = this.env.fireflyBase[i * 3 + 1] + Math.sin(t * 0.62 + phase * 1.7) * 0.35;
      array[i * 3 + 2] = this.env.fireflyBase[i * 3 + 2] + Math.cos(t * 0.29 + phase) * 0.9;
    }
    positions.needsUpdate = true;

    // mist & clouds
    for (const [index, sprite] of this.env.mist.entries()) {
      const phase = sprite.userData.phase as number;
      sprite.position.x += Math.sin(t * 0.05 + phase) * 0.004;
      (sprite.material as THREE.SpriteMaterial).opacity = 0.05 * (1 + Math.sin(t * 0.11 + index)) * (1 - day);
    }
    for (const cloud of this.env.clouds) {
      cloud.position.x += (cloud.userData.drift as number) * dt;
      if (cloud.position.x > 62) cloud.position.x = -62;
      (cloud.material as THREE.SpriteMaterial).opacity = 0.075 * (1 - day * 0.72);
    }

    this.dialColor.lerp(this.dialTarget, Math.min(1, dt * 1.5));
    this.table.dialMaterial.color.copy(this.dialColor);

    this.updateProjection();
  }

  private updateSeats(dt: number): void {
    const t = this.elapsed;
    for (const [seat, figure] of this.table.seats) {
      const state = this.deathStates.get(seat);
      if (!state) continue;
      if (state.dead) state.t = Math.min(1, state.t + dt * 0.9);
      else state.t = Math.max(0, state.t - dt * 2);

      const dead = state.t;
      if (dead > 0.001) {
        figure.bodyMat.color.copy(state.baseBody).lerp(DEATH_GREY, dead);
        figure.hoodMat.color.copy(state.baseHood).lerp(DEATH_GREY, dead);
        figure.faceMat.color.copy(state.baseFace).lerp(DEATH_GREY, dead * 0.9);
        figure.lanternMat.color.copy(state.baseLantern).lerp(new THREE.Color('#2f2b24'), dead);
        (figure.lanternGlow.material as THREE.SpriteMaterial).opacity = 0.75 * (1 - dead);
      } else {
        figure.bodyMat.color.copy(state.baseBody);
        figure.hoodMat.color.copy(state.baseHood);
        figure.faceMat.color.copy(state.baseFace);
        figure.lanternMat.color.copy(state.baseLantern);
        (figure.lanternGlow.material as THREE.SpriteMaterial).opacity = 0.75;
      }

      // Alive players stand in front of their chair. Eliminated players settle
      // onto the cushion, with their legs folded toward the table.
      const pose = THREE.MathUtils.smoothstep(dead, 0, 1);
      figure.bodyGroup.position.y = -0.44 * pose;
      figure.bodyGroup.position.z = 0.5 - 0.5 * pose;
      figure.bodyGroup.rotation.x = 0.12 * pose;
      figure.bodyGroup.rotation.z = 0.12 * pose;
      figure.leftLeg.rotation.x = -1.2 * pose;
      figure.rightLeg.rotation.x = -1.2 * pose;
      figure.group.position.y = figure.baseY;
      figure.group.rotation.z = state.dead ? 0.025 * pose : 0;

      const eyesShut = this.eyesClosed || dead > 0.4;
      figure.openEyes.visible = !eyesShut;
      figure.closedEyes.visible = eyesShut;

      const speaking = this.speaker === seat && !state.dead;
      const selected = this.selected === seat && !state.dead;
      const ringTarget = speaking ? 0.75 + Math.sin(t * 3.4) * 0.15 : 0;
      figure.ringMat.opacity += (ringTarget - figure.ringMat.opacity) * Math.min(1, dt * 7);
      figure.ring.scale.setScalar(1 + Math.sin(t * 3.2) * 0.04);
      const selectTarget = selected ? 0.95 : 0;
      figure.selectMat.opacity += (selectTarget - figure.selectMat.opacity) * Math.min(1, dt * 8);
      figure.selectedRing.scale.setScalar(1 + Math.sin(t * 4.3) * 0.05);

      if (!state.dead) {
        figure.group.rotation.z = Math.sin(t * 0.55 + seat) * 0.008;
      }
    }
  }

  private updateProjection(): void {
    if (this.family !== 'table') return;
    const now = performance.now();
    if (now - this.lastProjection < 33) return;
    this.lastProjection = now;
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const vector = new THREE.Vector3();
    const points: SeatPoint[] = [];
    for (const [seat, anchor] of this.anchors) {
      anchor.getWorldPosition(vector);
      vector.project(this.camera);
      points.push({
        seat,
        x: (vector.x * 0.5 + 0.5) * width,
        y: (-vector.y * 0.5 + 0.5) * height,
        visible: vector.z < 1 && vector.z > -1,
      });
    }
    setSeatPoints(points, width, height);
  }

  private render(): void {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.resizeObserver?.disconnect();
    this.controls.dispose();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = (mesh as THREE.Mesh).material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else if (material) (material as THREE.Material).dispose();
    });
    this.composer?.dispose();
    this.renderer.dispose();
    clearSeatPoints();
  }
}
