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
      {/* Sketchfab iframe embedded in 3D space */}
      <Html
        position={[0, 1.2, 0]}
        center
        transform
        distanceFactor={6}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            width: 180,
            height: 200,
            borderRadius: 12,
            overflow: 'hidden',
            border: '2px solid hsla(40, 60%, 50%, 0.4)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            pointerEvents: 'auto',
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

      {/* Name label */}
      <Html position={[0, 2.8, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
          onClick={(e) => { e.stopPropagation(); onInteract(); }}
        >
          <div
            style={{
              background: isVisited ? 'hsla(var(--primary), 0.9)' : 'hsla(0, 0%, 0%, 0.7)',
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
          <ringGeometry args={[0.6, 0.8, 24]} />
          <meshBasicMaterial color="hsl(45, 90%, 55%)" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
