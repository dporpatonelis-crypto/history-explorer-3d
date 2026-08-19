import { Suspense, useCallback, useEffect, useMemo, memo, useRef, useState } from 'react';
import { useGLTF, useAnimations, Html, Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Interactive, useXR } from '@react-three/xr';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useLipSync } from '@/hooks/useLipSync';
import { playAudio, speak } from '@/lib/lipsync';

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
  /** Optional WAV/MP3/OGG URL or blob URL. `welcome` is used as its transcript. */
  welcome_audio?: string;
  /** Optional browser SpeechSynthesis voice name, e.g. `Melina`. */
  welcome_voice?: string;
}

const PropModel = memo(function PropModel({ prop }: { prop: ScenarioProp }) {
  const groupRef = useRef<THREE.Group>(null);
  const welcomeTriggered = useRef(false);
  const modelPosition = useRef(new THREE.Vector3());
  const viewerPosition = useRef(new THREE.Vector3());
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const { isPresenting, player } = useXR();
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
  const welcomeAudio = prop.welcome_audio?.trim() ?? '';
  const welcomeVoice = prop.welcome_voice?.trim() ?? '';
  const hasWelcome = Boolean(welcomeText || welcomeAudio);
  const welcomeTrigger = prop.welcome_trigger ?? 'proximity';
  const welcomeRadius = Math.max(0.25, prop.welcome_radius ?? 2.5);

  // The prop uses the same viseme clock as the NPC dialog panel.
  useLipSync(cloned, speakerId);

  const triggerWelcome = useCallback((force = false) => {
    if (!hasWelcome || (!force && welcomeTriggered.current)) return;
    welcomeTriggered.current = true;
    setWelcomeVisible(true);
    if (welcomeAudio) playAudio(speakerId, welcomeAudio, welcomeText);
    else speak(speakerId, welcomeText, welcomeVoice ? { voiceName: welcomeVoice } : undefined);
  }, [hasWelcome, speakerId, welcomeAudio, welcomeText, welcomeVoice]);

  useEffect(() => {
    welcomeTriggered.current = false;
    setWelcomeVisible(false);
  }, [speakerId, welcomeAudio, welcomeText, welcomeTrigger, welcomeVoice]);

  useEffect(() => {
    if (!hasWelcome || (welcomeTrigger !== 'time' && welcomeTrigger !== 'both')) return;
    const delay = Math.max(0, prop.welcome_delay_ms ?? 2500);
    const timer = window.setTimeout(() => triggerWelcome(), delay);
    return () => window.clearTimeout(timer);
  }, [hasWelcome, prop.welcome_delay_ms, triggerWelcome, welcomeTrigger, isPresenting]);

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
      !hasWelcome ||
      welcomeTriggered.current ||
      (welcomeTrigger !== 'proximity' && welcomeTrigger !== 'both')
    ) return;

    groupRef.current.getWorldPosition(modelPosition.current);
    // In immersive mode the render camera is the headset camera and may be
        // offset from the XR player rig. Use the rig for proximity triggers so
    // teleporting/locomotion is measured consistently on the floor plane.
    if (isPresenting && player) player.getWorldPosition(viewerPosition.current);
    else camera.getWorldPosition(viewerPosition.current);
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

      {welcomeVisible && hasWelcome && (isPresenting ? (
        <Billboard position={[0, 2.35, 0]} renderOrder={1000}>
          <mesh position={[0, 0, -0.02]} renderOrder={999}>
            <planeGeometry args={[1.9, 0.85]} />
            <meshBasicMaterial
              color="#161009"
              transparent
              opacity={0.9}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
          <Text
            position={[0, 0.12, 0.01]}
            color="#f3ead8"
            fontSize={0.075}
            maxWidth={1.7}
            lineHeight={1.15}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            depthOffset={-10}
          >
            {welcomeText || 'Ηχητικό μήνυμα'}
          </Text>
          <Interactive onSelect={() => triggerWelcome(true)}>
            <group
              position={[0, -0.29, 0.02]}
              onClick={(event) => { event.stopPropagation(); triggerWelcome(true); }}
            >
              <mesh renderOrder={1001}>
                <planeGeometry args={[0.8, 0.16]} />
                <meshBasicMaterial color="#e7c66a" depthTest={false} />
              </mesh>
              <Text
                position={[0, 0, 0.02]}
                color="#1a1409"
                fontSize={0.055}
                anchorX="center"
                anchorY="middle"
                depthOffset={-11}
              >
                {welcomeAudio ? '▶ Αναπαραγωγή' : '🔊 Επανάληψη'}
              </Text>
            </group>
          </Interactive>
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
            <span>{welcomeText || '🔊 Ηχητικό μήνυμα'}</span>
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
              {welcomeAudio ? '▶️ Αναπαραγωγή' : '🔊 Επανάληψη'}
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
