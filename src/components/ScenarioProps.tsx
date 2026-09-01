import { Suspense, useCallback, useEffect, useMemo, memo, useRef, useState } from 'react';
import { useFBX, useGLTF, useAnimations, Html, Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Interactive, useXR } from '@react-three/xr';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useLipSync } from '@/hooks/useLipSync';
import { playAudio, speak } from '@/lib/lipsync';

type WelcomeTrigger = 'time' | 'proximity' | 'both';
type ModelFormat = 'glb' | 'gltf' | 'fbx';

export interface ScenarioProp {
  id?: string;
  glbModel: string;
  /** File format for the model source. GLB/GLTF remain the default for legacy JSON. */
  model_format?: ModelFormat;
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

interface LoadedPropModelProps {
  prop: ScenarioProp;
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
  onInteract?: () => void;
}

const LoadedPropModel = memo(function LoadedPropModel({
  prop,
  scene,
  animations,
  onInteract,
}: LoadedPropModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const welcomeTriggered = useRef(false);
  const modelPosition = useRef(new THREE.Vector3());
  const viewerPosition = useRef(new THREE.Vector3());
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { isPresenting, player } = useXR();
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

  const content = (
    <group
      ref={groupRef}
      position={[prop.position_x ?? 0, baseY, prop.position_z ?? 0]}
      rotation={[0, ((prop.rotation ?? 0) * Math.PI) / 180, 0]}
      onClick={onInteract ? (event) => { event.stopPropagation(); onInteract(); } : undefined}
      onPointerOver={onInteract ? (event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      } : undefined}
      onPointerOut={onInteract ? () => {
        setHovered(false);
        document.body.style.cursor = 'default';
      } : undefined}
    >
      <group scale={[normalizedScale, normalizedScale, normalizedScale]}>
        <primitive object={cloned} position={offset} />
      </group>

      {!onInteract && welcomeVisible && hasWelcome && (isPresenting ? (
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
        <Html position={[0, 2.35, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
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

      {onInteract && isPresenting && (
        <Billboard position={[0, 2.35, 0]} renderOrder={1000}>
          <mesh renderOrder={999}>
            <planeGeometry args={[1.45, 0.34]} />
            <meshBasicMaterial
              color={hovered ? '#e7c66a' : '#161009'}
              transparent
              opacity={0.92}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
          <Text
            position={[0, 0, 0.02]}
            color={hovered ? '#1a1409' : '#f3ead8'}
            fontSize={0.1}
            anchorX="center"
            anchorY="middle"
            depthOffset={-10}
          >
            Δημήτρης · Quiz
          </Text>
        </Billboard>
      )}

      {onInteract && !isPresenting && (
        <Html
          position={[0, 2.35, 0]}
          center
          distanceFactor={8}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onInteract(); }}
            style={{
              pointerEvents: 'auto',
              border: '1px solid hsla(45, 90%, 70%, 0.65)',
              borderRadius: 6,
              padding: '5px 12px',
              color: hovered ? '#1a1409' : '#f3ead8',
              background: hovered ? '#e7c66a' : 'hsla(0, 0%, 0%, 0.78)',
              fontFamily: 'Cinzel, serif',
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            Δημήτρης · Quiz
          </button>
        </Html>
      )}

      {onInteract && hovered && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.7, 24]} />
          <meshBasicMaterial
            color="hsl(45, 90%, 55%)"
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );

  if (!onInteract) return content;

  return (
    <Interactive
      onSelect={onInteract}
      onHover={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {content}
    </Interactive>
  );
});

interface PropModelProps {
  prop: ScenarioProp;
  onInteract?: () => void;
}

const GLBPropModel = memo(function GLBPropModel({ prop, onInteract }: PropModelProps) {
  const { scene, animations } = useGLTF(prop.glbModel);
  return <LoadedPropModel prop={prop} scene={scene} animations={animations} onInteract={onInteract} />;
});

const FBXPropModel = memo(function FBXPropModel({ prop, onInteract }: PropModelProps) {
  const scene = useFBX(prop.glbModel);
  const animations = (scene as THREE.Group & { animations?: THREE.AnimationClip[] }).animations ?? [];
  return <LoadedPropModel prop={prop} scene={scene} animations={animations} onInteract={onInteract} />;
});

const PropModel = memo(function PropModel({ prop, onInteract }: PropModelProps) {
  const isFbx = prop.model_format === 'fbx' || /\.fbx(?:$|[?#])/i.test(prop.glbModel);
  return isFbx
    ? <FBXPropModel prop={prop} onInteract={onInteract} />
    : <GLBPropModel prop={prop} onInteract={onInteract} />;
});

interface ScenarioPropsProps {
  props?: ScenarioProp[];
  interactivePropId?: string;
  onPropInteract?: (prop: ScenarioProp) => void;
}

export const ScenarioProps = memo(function ScenarioProps({
  props: items,
  interactivePropId,
  onPropInteract,
}: ScenarioPropsProps) {
  if (!items?.length) return null;
  return (
    <Suspense fallback={null}>
      {items
        .filter((p) => p.glbModel?.trim())
        .map((p, i) => (
          <PropModel
            key={p.id ?? `${p.glbModel}-${i}`}
            prop={p}
            onInteract={p.id === interactivePropId && onPropInteract
              ? () => onPropInteract(p)
              : undefined}
          />
        ))}
    </Suspense>
  );
});
