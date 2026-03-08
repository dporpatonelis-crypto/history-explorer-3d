import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

function CurvedScreenMesh({
  imageUrl,
  position,
  rotation,
  radius = 8,
  height = 7,
  curveSegments = 16,
  thetaStart = 0,
  thetaLength = Math.PI,
}: {
  imageUrl: string;
  position: [number, number, number];
  rotation: [number, number, number];
  radius?: number;
  height?: number;
  curveSegments?: number;
  thetaStart?: number;
  thetaLength?: number;
}) {
  const texture = useTexture(imageUrl);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }, [texture]);

  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(
      radius, radius, height,
      curveSegments, 1,
      true,
      thetaStart,
      thetaLength
    );

    // Flip UVs so image isn't mirrored on inside
    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      uvs.setX(i, 1 - uvs.getX(i));
    }
    return geo;
  }, [radius, height, thetaStart, thetaLength, curveSegments]);

  useEffect(() => {
    return () => { geometry.dispose(); };
  }, [geometry]);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          map={texture}
          side={THREE.BackSide}
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

  // Both screens share center, radius=10, split into left/right halves
  // thetaStart in CylinderGeometry: 0 = +X axis, goes counter-clockwise from top view
  // Camera is at z=12 looking at z=0, so the "back" of the cylinder (facing camera) is around theta=PI
  const screenRadius = 10;
  const halfArc = Math.PI * 0.48; // Almost touching, small gap at seams

  return (
    <group position={[0, 5.5, 0]}>
      {/* Left screen: covers from PI to PI + halfArc (left side when facing center) */}
      {hasLeft && (
        <CurvedScreenMesh
          imageUrl={config.left_image_url}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          radius={screenRadius}
          thetaStart={Math.PI}
          thetaLength={halfArc}
          height={10.5}
          curveSegments={16}
        />
      )}
      {/* Right screen: covers from PI - halfArc to PI (right side) */}
      {hasRight && (
        <CurvedScreenMesh
          imageUrl={config.right_image_url}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          radius={screenRadius}
          thetaStart={Math.PI - halfArc}
          thetaLength={halfArc}
          height={10.5}
          curveSegments={16}
        />
      )}
    </group>
  );
}
