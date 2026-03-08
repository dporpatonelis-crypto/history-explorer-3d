import { useRef, useMemo } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface EnvironmentScreenProps {
  imageUrl: string;
  position: [number, number, number];
  rotation: [number, number, number];
  width?: number;
  height?: number;
  curveSegments?: number;
  arc?: number;
  label?: string;
}

function CurvedScreenMesh({
  imageUrl,
  position,
  rotation,
  width = 12,
  height = 7,
  curveSegments = 32,
  arc = 0.6,
  label,
}: EnvironmentScreenProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(imageUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, [imageUrl]);

  // Curved geometry: cylinder segment as screen
  const geometry = useMemo(() => {
    const radius = width / arc;
    const geo = new THREE.CylinderGeometry(
      radius, radius, height,
      curveSegments, 1,
      true,
      Math.PI / 2 - arc / 2,
      arc
    );
    // Flip UVs so image isn't mirrored on inside
    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      uvs.setX(i, 1 - uvs.getX(i));
    }
    return geo;
  }, [width, height, arc, curveSegments]);

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          map={texture}
          side={THREE.BackSide}
          emissive="#ffffff"
          emissiveMap={texture}
          emissiveIntensity={0.15}
          toneMapped={false}
        />
      </mesh>
      {/* Subtle frame */}
      <mesh geometry={geometry} scale={[1.02, 1.02, 1.02]}>
        <meshStandardMaterial
          color="#8b7355"
          side={THREE.BackSide}
          transparent
          opacity={0.6}
        />
      </mesh>
      {label && (
        <Html position={[0, -height / 2 - 0.5, 0]} center>
          <div className="font-cinzel text-xs text-muted-foreground bg-background/70 px-2 py-1 rounded backdrop-blur-sm whitespace-nowrap">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

export interface ScreenConfig {
  left_image_url: string;
  right_image_url: string;
  left_label?: string;
  right_label?: string;
}

const DEFAULT_SCREENS: ScreenConfig = {
  left_image_url: '',
  right_image_url: '',
};

interface EnvironmentScreensProps {
  config?: ScreenConfig;
}

export function EnvironmentScreens({ config = DEFAULT_SCREENS }: EnvironmentScreensProps) {
  const hasLeft = config.left_image_url?.length > 0;
  const hasRight = config.right_image_url?.length > 0;

  if (!hasLeft && !hasRight) return null;

  return (
    <group>
      {hasLeft && (
        <CurvedScreenMesh
          imageUrl={config.left_image_url}
          position={[-16, 4, -5]}
          rotation={[0, 0.5, 0]}
          width={12}
          height={7}
          label={config.left_label}
        />
      )}
      {hasRight && (
        <CurvedScreenMesh
          imageUrl={config.right_image_url}
          position={[16, 4, -5]}
          rotation={[0, -0.5, 0]}
          width={12}
          height={7}
          label={config.right_label}
        />
      )}
    </group>
  );
}
