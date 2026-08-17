import { useState, useMemo } from 'react';
import { Text } from '@react-three/drei';
import { Interactive } from '@react-three/xr';
import { NPCData } from '@/data/npcData';

interface VRDialogBoardProps {
  npc: NPCData;
  onClose: () => void;
}

/**
 * In-VR replacement for the HTML dialog panel — DOM overlays are invisible
 * inside an immersive session, so the content is rendered as 3D text.
 * The board is attached to the player rig, floating in front of the viewer.
 */
export function VRDialogBoard({ npc, onClose }: VRDialogBoardProps) {
  const [index, setIndex] = useState(0);
  const dialogs = npc.dialogs ?? [];
  const current = dialogs[index];

  const body = useMemo(() => {
    if (!current) return npc.description || '';
    return `${current.question}\n\n«${current.answer}»`;
  }, [current, npc.description]);

  return (
    <group position={[0, 1.5, -1.6]}>
      <mesh>
        <planeGeometry args={[1.6, 1.0]} />
        <meshBasicMaterial color="#161009" transparent opacity={0.88} />
      </mesh>

      <Text
        position={[0, 0.4, 0.01]}
        fontSize={0.075}
        color="#e8c877"
        anchorX="center"
        maxWidth={1.4}
      >
        {npc.name}
      </Text>

      <Text
        position={[0, 0.05, 0.01]}
        fontSize={0.05}
        color="#f3ead8"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.4}
        lineHeight={1.35}
      >
        {body}
      </Text>

      {dialogs.length > 1 && (
        <Interactive onSelect={() => setIndex((i) => (i + 1) % dialogs.length)}>
          <group
            position={[-0.4, -0.38, 0.01]}
            onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % dialogs.length); }}
          >
            <mesh>
              <planeGeometry args={[0.6, 0.13]} />
              <meshBasicMaterial color="#3c2f18" />
            </mesh>
            <Text position={[0, 0, 0.01]} fontSize={0.048} color="#f3ead8" anchorX="center">
              Επόμενη ερώτηση →
            </Text>
          </group>
        </Interactive>
      )}

      <Interactive onSelect={onClose}>
        <group
          position={[0.45, -0.38, 0.01]}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
          <mesh>
            <planeGeometry args={[0.4, 0.13]} />
            <meshBasicMaterial color="#5a2020" />
          </mesh>
          <Text position={[0, 0, 0.01]} fontSize={0.048} color="#ffffff" anchorX="center">
            Κλείσιμο
          </Text>
        </group>
      </Interactive>
    </group>
  );
}
