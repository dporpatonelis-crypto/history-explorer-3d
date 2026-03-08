import { useRef, useState, useMemo, Suspense, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { NPCData } from '@/data/npcData';

interface GLBModelNPCProps {
  npc: NPCData;
  isVisited: boolean;
  onInteract: () => void;
}

function GLBModel({ url, rotation }: { url: string; rotation: number }) {
  const { scene } = useGLTF(url);

  const { cloned, normalizedScale, offset } = useMemo(() => {
    const clonedScene = scene.clone(true);
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(clonedScene);
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray());
    const s = 1.8 / maxDim;

    return {
      cloned: clonedScene,
      normalizedScale: s,
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene]);

  return (
    <group scale={[normalizedScale, normalizedScale, normalizedScale]} rotation={[0, rotation, 0]}>
      <primitive object={cloned} position={offset} />
    </group>
  );
}

export const GLBModelNPC = memo(function GLBModelNPC({ npc, isVisited, onInteract }: GLBModelNPCProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = npc.position[1] + Math.sin(clock.elapsedTime * 1.5) * 0.03;
  });

  return (
    <group
      ref={groupRef}
      position={npc.position}
      onClick={(e) => { e.stopPropagation(); onInteract(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      <Suspense fallback={
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[0.5, 1.6, 0.5]} />
          <meshStandardMaterial color={npc.color} wireframe />
        </mesh>
      }>
        <GLBModel url={npc.glbModel!} rotation={npc.rotation} />
      </Suspense>

      {/* Name label */}
      <Html position={[0, 2.3, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div
          style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
          onClick={(e) => { e.stopPropagation(); onInteract(); }}
        >
          <div
            style={{
              background: isVisited ? 'hsla(var(--primary), 0.9)' : 'hsla(0, 0%, 0%, 0.75)',
              color: isVisited ? 'hsl(var(--primary-foreground))' : 'white',
              padding: '4px 12px',
              borderRadius: 6,
              fontFamily: 'Cinzel, serif',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              border: isVisited ? '1px solid hsl(var(--primary))' : '1px solid hsla(0,0%,100%,0.3)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {npc.name}{isVisited && ' ✓'}
          </div>
          {hovered && !isVisited && (
            <div style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 10,
              fontFamily: 'Cinzel, serif',
            }}>
              Πάτησε για συνομιλία
            </div>
          )}
        </div>
      </Html>

      {hovered && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.7, 24]} />
          <meshBasicMaterial color="hsl(45, 90%, 55%)" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
