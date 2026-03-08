import { useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { NPCData } from '@/data/npcData';

interface SketchfabNPCProps {
  npc: NPCData;
  isVisited: boolean;
  onInteract: () => void;
}

export function SketchfabNPC({ npc, isVisited, onInteract }: SketchfabNPCProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={npc.position} rotation={[0, npc.rotation, 0]}>
      {/* Sketchfab 3D model embedded via Html */}
      <Html
        position={[0, 1.2, 0]}
        center
        transform
        distanceFactor={6}
        occlude={false}
        zIndexRange={[10, 0]}
      >
        <div
          style={{
            width: 200,
            height: 220,
            borderRadius: 12,
            overflow: 'hidden',
            border: hovered
              ? '2px solid hsl(45, 90%, 55%)'
              : '2px solid hsla(40, 60%, 50%, 0.3)',
            boxShadow: hovered
              ? '0 0 20px hsla(45, 90%, 55%, 0.4)'
              : '0 4px 16px rgba(0,0,0,0.25)',
            transition: 'border 0.2s, box-shadow 0.2s',
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
          onMouseEnter={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
          onMouseLeave={() => { setHovered(false); document.body.style.cursor = 'default'; }}
          onClick={(e) => { e.stopPropagation(); onInteract(); }}
        >
          <iframe
            title={npc.name}
            src={npc.sketchfabUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              pointerEvents: 'none',
            }}
            allow="autoplay; fullscreen; xr-spatial-tracking"
          />
        </div>
      </Html>

      {/* Name label above */}
      <Html position={[0, 2.9, 0]} center distanceFactor={8}>
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
          }}
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
            {npc.name}
            {isVisited && ' ✓'}
          </div>
          {hovered && !isVisited && (
            <div
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 10,
                fontFamily: 'Cinzel, serif',
              }}
            >
              Πάτησε για συνομιλία
            </div>
          )}
        </div>
      </Html>

      {/* Glow ring on hover */}
      {hovered && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.9, 24]} />
          <meshBasicMaterial color="hsl(45, 90%, 55%)" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
