import { Component, Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { resolveAssetUrl } from '@/lib/assetUrl';

const HOUSE_URL = resolveAssetUrl('/models/jerusalem/Jerusalem_House_compact_2k.glb')!;
const MARKET_URL = resolveAssetUrl('/models/jerusalem/Jerusalem_Market_compact_2k.glb')!;
const TEMPLE_URL = resolveAssetUrl('/models/jerusalem/Jerusalem_Temple_compact_2k.glb')!;

interface OptionalAssetBoundaryProps {
  assetUrl: string;
  children: ReactNode;
}

interface OptionalAssetBoundaryState {
  failed: boolean;
}

/** A missing decorative GLB should leave the shared lesson interactions usable. */
class OptionalAssetBoundary extends Component<OptionalAssetBoundaryProps, OptionalAssetBoundaryState> {
  state: OptionalAssetBoundaryState = { failed: false };

  static getDerivedStateFromError(): OptionalAssetBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[JerusalemEnvironment] Could not load optional scenery: ${this.props.assetUrl}`, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface SharedGLBModelProps {
  url: string;
  position: [number, number, number];
  scale: number;
  rotationY?: number;
}

function SharedGLBModel({ url, position, scale, rotationY = 0 }: SharedGLBModelProps) {
  const { scene } = useGLTF(url);
  // Object3D.clone copies transforms while retaining the GLTF's shared geometry and materials.
  const clone = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return copy;
  }, [scene]);

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={clone} dispose={null} />
    </group>
  );
}

function OptionalGLB({ url, ...props }: SharedGLBModelProps) {
  return (
    <OptionalAssetBoundary key={url} assetUrl={url}>
      <Suspense fallback={null}>
        <SharedGLBModel url={url} {...props} />
      </Suspense>
    </OptionalAssetBoundary>
  );
}

const TILE_COLUMNS = 18;
const TILE_ROWS = 24;
const TILE_COUNT = TILE_COLUMNS * TILE_ROWS;

function JerusalemStreet() {
  const tilesRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1.02, 0.025, 1.38), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c7b18f', roughness: 0.95 }),
    [],
  );
  const matrices = useMemo(() => {
    const helper = new THREE.Object3D();
    return Array.from({ length: TILE_COUNT }, (_, index) => {
      const row = Math.floor(index / TILE_COLUMNS);
      const column = index % TILE_COLUMNS;
      const rowOffset = row % 2 ? 0.16 : 0;
      helper.position.set(
        (column - (TILE_COLUMNS - 1) / 2) * 1.1 + rowOffset,
        0.01,
        7.2 - row * 1.48,
      );
      helper.scale.set(0.94, 1, 0.95);
      helper.rotation.set(0, 0, 0);
      helper.updateMatrix();
      return helper.matrix.clone();
    });
  }, []);

  useLayoutEffect(() => {
    const mesh = tilesRef.current;
    if (!mesh) return;
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#b6a07c" roughness={1} />
      </mesh>
      <instancedMesh
        ref={tilesRef}
        args={[geometry, material, TILE_COUNT]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
    </group>
  );
}

function DistantLimestoneHills() {
  return (
    <group>
      <mesh position={[-22, 4, -55]} scale={[1.6, 0.8, 0.8]}>
        <coneGeometry args={[13, 15, 9]} />
        <meshStandardMaterial color="#cdbd9e" roughness={1} />
      </mesh>
      <mesh position={[22, 5, -57]} scale={[1.8, 0.95, 0.8]}>
        <coneGeometry args={[13, 17, 9]} />
        <meshStandardMaterial color="#d4c4a6" roughness={1} />
      </mesh>
      <mesh position={[0, 3, -68]} scale={[1.8, 0.7, 0.8]}>
        <coneGeometry args={[16, 12, 9]} />
        <meshStandardMaterial color="#ded0b7" roughness={1} />
      </mesh>
    </group>
  );
}

/** Artistic Jerusalem setting, composed around the existing flat NPC and screen area. */
export function JerusalemEnvironment() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[160, 24, 16]} />
        <meshBasicMaterial color="#d8e1df" side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <JerusalemStreet />
      <DistantLimestoneHills />

      <OptionalGLB url={HOUSE_URL} position={[-15.8, 0, -13]} scale={0.6} rotationY={Math.PI / 2} />
      <OptionalGLB url={HOUSE_URL} position={[15.8, 0, -13]} scale={0.6} rotationY={-Math.PI / 2} />

      <OptionalGLB url={MARKET_URL} position={[-11.3, 0, -3.2]} scale={0.9} />
      <OptionalGLB url={MARKET_URL} position={[11.3, 0, -3.2]} scale={0.9} rotationY={Math.PI} />
      <OptionalGLB url={MARKET_URL} position={[11.3, 0, -8.5]} scale={0.9} rotationY={Math.PI} />

      <OptionalGLB url={TEMPLE_URL} position={[0, 0, -33]} scale={0.32} rotationY={Math.PI} />
    </group>
  );
}
