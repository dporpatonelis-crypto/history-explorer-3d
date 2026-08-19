import { Suspense, useCallback, useEffect, useMemo, memo, useRef, useState } from 'react';
import { useGLTF, useAnimations, Html, Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useLipSync } from '@/hooks/useLipSync';
import { speak } from '@/lib/lipsync';

type WelcomeTrigger = 'time' | 'proximity' | 'both';

export interface ScenarioProp {
  id?: string;
  glbModel: string;
  position_x?: number;
  position_y?: number;
  position_z?: number;
  rotation?: number;
  scale?: number;
  idle?: boolean;
  /** Text spoken and shown when this prop's welcome trigger fires. */
  welcome?: string;
  /** Fire welcome when the viewer is within this many metres (default 2.5). */
  welcome_radius?: number;
  /** Fire welcome after a delay, when `time` or `both` is selected. */
  welcome_delay_ms?: number;
  /** Choose an automatic welcome trigger. Defaults to `proximity`. */
  welcome_trigger?: WelcomeTrigger;
}

const PropModel = memo(function PropModel({ prop }: { prop: ScenarioProp }) {
  const groupRef = useRef<THREE.Group>(null);
  const welcomeTriggered = useRef(false);
  const modelPosition = useRef(new THREE.Vector3());
  const viewerPosition = useRef(new THREE.Vector3());
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const { isPresenting } = useXR();
  const { scene, animations } = useGLTF(prop.glbModel);

  const { cloned, normalizedScale, offset } = useMemo(() => {
    const clonedScene = cloneSkeleton(scene);
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    clonedScene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const center = box.getCenter(new THREE.Vector3());
    return {
      cloned: clonedScene,
      normalizedScale: (1.8 / maxDim) * (prop.scale || 1),
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, prop.scale]);

  const { actions } = useAnimations(animations, cloned);
  const speakerId = prop.id ?? prop.glbModel;
  const welcomeText = prop.welcome?.trim() ?? '';
  const welcomeTrigger = prop.welcome_trigger ?? 'proximity';
  const welcomeRadius = Math.max(0.25, prop.welcome_radius ?? 2.5);

  // The prop uses the same viseme clock as the NPC dialog panel.
  useLipSync(cloned, speakerId);

  const triggerWelcome = useCallback((force = false) => {
    if (!welcomeText || (!force && welcomeTriggered.current)) return;
    welcomeTriggered.current = true;
    setWelcomeVisible(true);
    speak(speakerId, welcomeText);
  }, [speakerId, welcomeText]);

  useEffect(() => {
    welcomeTriggered.current = false;
    setWelcomeVisible(false);
  }, [speakerId, welcomeText, welcomeTrigger]);

  useEffect(() => {
    if (!welcomeText || (welcomeTrigger !== 'time' && welcomeTrigger !== 'both')) return;
    const delay = Math.max(0, prop.welcome_delay_ms ?? 2500);
    const timer = window.setTimeout(() => triggerWelcome(), delay);
    return () => window.clearTimeout(timer);
  }, [prop.welcome_delay_ms, triggerWelcome, welcomeText, welcomeTrigger]);

  useEffect(() => {
    const first = Object.values(actions)[0];
    if (!first || prop.idle === false) return;

    first.reset().fadeIn(0.3).play();
    return () => {
      first.fadeOut(0.2);
      first.stop();
    };
  }, [actions, prop.idle]);

  const baseY = prop.position_y ?? 0;
  useFrame(({ clock, camera }) => {
    if (!groupRef.current) return;

    if (prop.idle !== false && !animations.length) {
      groupRef.current.position.y = baseY + Math.sin(clock.elapsedTime * 1.2) * 0.02;
    }

    if (
      !welcomeText ||
      welcomeTriggered.current ||
      (welcomeTrigger !== 'proximity' && welcomeTrigger !== 'both')
    ) return;

    groupRef.current.getWorldPosition(modelPosition.current);
    camera.getWorldPosition(viewerPosition.current);
    if (modelPosition.current.distanceToSquared(viewerPosition.current) <= welcomeRadius ** 2) {
      triggerWelcome();
    }
  });

  return (
    <group
      ref={groupRef}
      position={[prop.position_x ?? 0, baseY, prop.position_z ?? 0]}
      rotation={[0, ((prop.rotation ?? 0) * Math.PI) / 180, 0]}
    >
      <group scale={[normalizedScale, normalizedScale, normalizedScale]}>
        <primitive object={cloned} position={offset} />
      </group>

      {welcomeVisible && welcomeText && (isPresenting ? (
        <Billboard position={[0, 2.35, 0]}>
          <Text
            color="#f3ead8"
            fontSize={0.16}
            maxWidth={2.5}
            lineHeight={1.15}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
          >
            {welcomeText}
          </Text>
        </Billboard>
      ) : (
        <Html position={[0, 2.35, 0]} center distanceFactor={8}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              width: 230,
              padding: '8px 10px',
              borderRadius: 8,
              color: '#f3ead8',
              background: 'hsla(0, 0%, 0%, 0.78)',
              border: '1px solid hsla(45, 90%, 70%, 0.55)',
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: 14,
              lineHeight: 1.2,
              textAlign: 'center',
              pointerEvents: 'auto',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <span>{welcomeText}</span>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); triggerWelcome(true); }}
              style={{
                border: 0,
                borderRadius: 5,
                padding: '4px 9px',
                color: '#1a1409',
                background: '#e7c66a',
                fontFamily: 'Cinzel, serif',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              🔊 Επανάληψη
            </button>
          </div>
        </Html>
      ))}
    </group>
  );
});

export const ScenarioProps = memo(function ScenarioProps({ props: items }: { props?: ScenarioProp[] }) {
  if (!items?.length) return null;
  return (
    <Suspense fallback={null}>
      {items
        .filter((p) => p.glbModel?.trim())
        .map((p, i) => (
          <PropModel key={p.id ?? `${p.glbModel}-${i}`} prop={p} />
        ))}
    </Suspense>
  );
});
