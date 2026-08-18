import { useRef, useState } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useXR, Interactive } from '@react-three/xr';
import * as THREE from 'three';

interface VRWristPanelProps {
  visitedCount: number;
  totalCount: number;
  onRespawn: () => void;
  onCloseDialog: () => void;
}

function Button({
  position,
  width,
  label,
  color,
  onSelect,
}: {
  position: [number, number, number];
  width: number;
  label: string;
  color: string;
  onSelect: () => void;
}) {
  return (
    <Interactive onSelect={onSelect}>
      <group position={position} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <mesh>
          <planeGeometry args={[width, 0.035]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <Text position={[0, 0, 0.002]} fontSize={0.017} color="#f3ead8" anchorX="center" anchorY="middle">
          {label}
        </Text>
      </group>
    </Interactive>
  );
}

/** Small wrist-mounted menu attached to the left controller. */
export function VRWristPanel({ visitedCount, totalCount, onRespawn, onCloseDialog }: VRWristPanelProps) {
  const { controllers, isPresenting } = useXR();
  const groupRef = useRef<THREE.Group>(null);
  const [open, setOpen] = useState(true);

  const left = controllers.find((c) => c.inputSource?.handedness === 'left');

  useFrame(() => {
    if (groupRef.current) groupRef.current.visible = open;
  });

  if (!isPresenting || !left) return null;

  return createPortal(
    <group position={[0, 0.06, -0.02]} rotation={[-Math.PI / 3, 0, 0]}>
      <Interactive onSelect={() => setOpen((o) => !o)}>
        <group position={[0, 0.075, 0]} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
          <mesh>
            <circleGeometry args={[0.014, 16]} />
            <meshBasicMaterial color="#e8c877" />
          </mesh>
        </group>
      </Interactive>

      <group ref={groupRef}>
        <mesh>
          <planeGeometry args={[0.2, 0.13]} />
          <meshBasicMaterial color="#161009" transparent opacity={0.9} />
        </mesh>

        <Text position={[0, 0.045, 0.002]} fontSize={0.018} color="#e8c877" anchorX="center">
          Μενού
        </Text>
        <Text position={[0, 0.02, 0.002]} fontSize={0.014} color="#f3ead8" anchorX="center">
          {`Γνωριμίες: ${visitedCount}/${totalCount}`}
        </Text>

        <Button position={[0, -0.012, 0.002]} width={0.17} label="Επαναφορά θέσης" color="#3c2f18" onSelect={onRespawn} />
        <Button position={[0, -0.053, 0.002]} width={0.17} label="Κλείσιμο διαλόγου" color="#5a2020" onSelect={onCloseDialog} />
      </group>
    </group>,
    left.controller,
  );
}
