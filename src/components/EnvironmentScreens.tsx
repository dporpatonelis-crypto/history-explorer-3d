import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Html, useTexture } from '@react-three/drei';

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

  const texture = useTexture(imageUrl);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }, [texture]);

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
      <mesh geometry={geometry}>
        <meshBasicMaterial
          map={texture}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
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
          position={[-3, 5.5, 0]}
          rotation={[0, 0, 0]}
          width={20.5}
          arc={2.4}
          height={10.5}
          curveSegments={16}
          label={config.left_label}
        />
      )}
      {hasRight && (
        <CurvedScreenMesh
          imageUrl={config.right_image_url}
          position={[3, 5.5, 0]}
          rotation={[0, Math.PI, 0]}
          width={20.5}
          arc={2.4}
          height={10.5}
          curveSegments={16}
          label={config.right_label}
        />
      )}
    </group>
  );
}
