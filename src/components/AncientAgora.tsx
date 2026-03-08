import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Ground, Columns, Lighting, Sky } from './Environment3D';
import { NPCCharacter } from './NPCCharacter';
import { npcData, NPCData } from '@/data/npcData';

interface AncientAgoraProps {
  visited: Set<string>;
  onNPCInteract: (npc: NPCData) => void;
}

export function AncientAgora({ visited, onNPCInteract }: AncientAgoraProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 5, 8], fov: 55 }}
      style={{ width: '100%', height: '100vh' }}
    >
      <Sky />
      <Lighting />
      <Ground />
      <Columns />
      {npcData.map(npc => (
        <NPCCharacter
          key={npc.id}
          npc={npc}
          isVisited={visited.has(npc.id)}
          onInteract={onNPCInteract}
        />
      ))}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={3}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 1, -4]}
      />
    </Canvas>
  );
}
