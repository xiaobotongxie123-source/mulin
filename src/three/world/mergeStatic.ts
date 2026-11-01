import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

interface Bucket {
  material: THREE.Material;
  geometries: THREE.BufferGeometry[];
  meshes: THREE.Mesh[];
  castShadow: boolean;
  receiveShadow: boolean;
  renderOrder: number;
}

interface MergeOptions {
  /** Entire subtrees that move independently and must keep their own meshes. */
  exclude?: Iterable<THREE.Object3D>;
}

function attributeKey(geometry: THREE.BufferGeometry): string {
  const attributes = Object.keys(geometry.attributes).sort().join(',');
  const index = geometry.index ? geometry.index.array.constructor.name : 'none';
  return `${attributes}|${index}`;
}

/**
 * Collapse static meshes into one mesh per material/attribute layout.
 *
 * The procedural cabin, table furniture and traveler bodies are built from
 * hundreds of tiny primitives. Each mesh is a draw call; merging them keeps the
 * silhouette and all shared materials, but cuts the per-frame draw-call count
 * dramatically. Anything that is animated as a whole must be passed in
 * `exclude`, and transparent meshes are left alone so blending/sorting is not
 * changed.
 */
export function mergeStaticMeshes(root: THREE.Object3D, options: MergeOptions = {}): number {
  const excluded = new Set<THREE.Object3D>();
  for (const object of options.exclude ?? []) {
    object.traverse((child) => excluded.add(child));
  }

  root.updateWorldMatrix(true, true);
  const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, Bucket>();

  root.traverse((object) => {
    if (object === root || excluded.has(object)) return;

    const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
    if (!mesh.isMesh) return;
    if ((object as THREE.InstancedMesh).isInstancedMesh) return;
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) return;
    if (Array.isArray(mesh.material) || !mesh.material) return;
    if (!mesh.visible || mesh.material.transparent || mesh.material.opacity < 1) return;
    if (mesh.material.depthWrite === false) return;
    if (mesh.morphTargetInfluences?.length) return;

    const geometry = mesh.geometry.clone();
    if (!geometry.getAttribute('position')) return;
    const matrix = new THREE.Matrix4().copy(rootInverse).multiply(mesh.matrixWorld);
    geometry.applyMatrix4(matrix);

    const material = mesh.material;
    const key = `${material.uuid}|${attributeKey(geometry)}|${mesh.renderOrder}`;
    const bucket: Bucket = buckets.get(key) ?? {
      material,
      geometries: [],
      meshes: [],
      castShadow: false,
      receiveShadow: false,
      renderOrder: mesh.renderOrder,
    };
    bucket.geometries.push(geometry);
    bucket.meshes.push(mesh);
    bucket.castShadow ||= mesh.castShadow;
    bucket.receiveShadow ||= mesh.receiveShadow;
    buckets.set(key, bucket);
  });

  let mergedCount = 0;
  for (const bucket of buckets.values()) {
    if (bucket.geometries.length < 2) {
      for (const geometry of bucket.geometries) geometry.dispose();
      continue;
    }
    const geometry = mergeGeometries(bucket.geometries, false);
    for (const item of bucket.geometries) item.dispose();
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, bucket.material);
    mesh.name = 'merged-static';
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = bucket.receiveShadow;
    mesh.renderOrder = bucket.renderOrder;
    root.add(mesh);
    mergedCount += bucket.geometries.length;
    for (const original of bucket.meshes) original.parent?.remove(original);
  }
  return mergedCount;
}
