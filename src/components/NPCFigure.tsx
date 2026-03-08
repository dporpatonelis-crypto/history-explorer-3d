import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { NPCData } from '@/data/npcData';

interface NPCFigureProps {
  npc: NPCData;
  isVisited: boolean;
  onInteract: () => void;
}

export function NPCFigure({ npc, isVisited, onInteract }: NPCFigureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Gentle hover animation
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.y =
      npc.position[1] + Math.sin(Date.now() * 0.002) * 0.04;
  });

  const skinColor = npc.color;
  const robeColor = npc.robeColor;

  return (
    <group
      ref={groupRef}
      position={npc.position}
      rotation={[0, npc.rotation, 0]}
      onClick={(e) => { e.stopPropagation(); onInteract(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
    >
      {/* Feet */}
      <mesh position={[-0.12, 0.08, 0]} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.28]} />
        <meshStandardMaterial color="hsl(25, 30%, 45%)" />
      </mesh>
      <mesh position={[0.12, 0.08, 0]} castShadow>
        <boxGeometry args={[0.14, 0.08, 0.28]} />
        <meshStandardMaterial color="hsl(25, 30%, 45%)" />
      </mesh>

      {/* Robe / body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.32, 1.1, 8]} />
        <meshStandardMaterial color={robeColor} roughness={0.7} />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.35, 0.75, 0]} rotation={[0, 0, 0.15]} castShadow>
        <capsuleGeometry args={[0.06, 0.45, 4, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>
      <mesh position={[0.35, 0.75, 0]} rotation={[0, 0, -0.15]} castShadow>
        <capsuleGeometry args={[0.06, 0.45, 4, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.12, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Hair / beard accent */}
      <mesh position={[0, 1.68, -0.02]}>
        <sphereGeometry args={[0.17, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="hsl(30, 15%, 35%)" roughness={0.8} />
      </mesh>

      {/* ── HTML label floating above ── */}
      <Html position={[0, 2.1, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            pointerEvents: 'auto',
          }}
          onClick={(e) => { e.stopPropagation(); onInteract(); }}
        >
          {/* Name plate */}
          <div
            style={{
              background: isVisited
                ? 'hsla(var(--primary), 0.9)'
                : 'hsla(0, 0%, 0%, 0.7)',
              color: isVisited ? 'hsl(var(--primary-foreground))' : 'white',
              padding: '3px 10px',
              borderRadius: 6,
              fontFamily: 'Cinzel, serif',
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              border: isVisited ? '1px solid hsl(var(--primary))' : '1px solid hsla(0,0%,100%,0.3)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {npc.name}
            {isVisited && ' ✓'}
          </div>

          {/* Interact hint on hover */}
          {hovered && !isVisited && (
            <div
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 10,
                fontFamily: 'Cinzel, serif',
                animation: 'pulse 1.5s infinite',
              }}
            >
              Πάτησε για συνομιλία
            </div>
          )}
        </div>
      </Html>

      {/* Glow ring under NPC when hovered */}
      {hovered && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.55, 24]} />
          <meshBasicMaterial color="hsl(45, 90%, 55%)" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
