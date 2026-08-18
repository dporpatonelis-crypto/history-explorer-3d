import { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas, createPortal } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { XR, VRButton, Controllers, Hands, useXR } from '@react-three/xr';
import { TempleScene, MarbleFloor, SceneLighting } from '@/components/TempleScene';
import { NPCFigure } from '@/components/NPCFigure';
import { GLBModelNPC } from '@/components/GLBModelNPC';
import { DialogPanel } from '@/components/DialogPanel';
import { ProgressTracker } from '@/components/ProgressTracker';
import { EnvironmentScreens } from '@/components/EnvironmentScreens';
import { LibraryPanel } from '@/components/LibraryPanel';
import { VRLocomotion } from '@/components/VRLocomotion';
import { VRDialogBoard } from '@/components/VRDialogBoard';
import { VRWristPanel } from '@/components/VRWristPanel';
import { ScenarioProps } from '@/components/ScenarioProps';
import { useProgress } from '@/hooks/useProgress';
import { NPCData } from '@/data/npcData';
import { useScenario } from '@/hooks/useScenario';

function StableOrbitControls() {
  const controlsRef = useRef<any>(null);
  const initialized = useRef(false);
  const { isPresenting } = useXR();

  useEffect(() => {
    if (controlsRef.current && !initialized.current) {
      controlsRef.current.target.set(0, 1.5, 0);
      controlsRef.current.update();
      initialized.current = true;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!isPresenting}
      enablePan={true}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={20}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.2}
    />
  );
}

/** Renders the VR dialog board inside the player rig so it follows the viewer. */
function VRDialogLayer({ npc, onClose }: { npc: NPCData | null; onClose: () => void }) {
  const { player, isPresenting } = useXR();
  if (!isPresenting || !npc || !player) return null;
  return createPortal(<VRDialogBoard npc={npc} onClose={onClose} />, player);
}

/** Spawn point: in front of the NPC line, opposite the temple, clear of the colonnade. */
const SPAWN: [number, number, number] = [0, 0, 9];

function VRSpawn({ register }: { register: (fn: () => void) => void }) {
  const { player, isPresenting } = useXR();

  const respawn = useCallback(() => {
    if (!player) return;
    player.position.set(SPAWN[0], SPAWN[1], SPAWN[2]);
    player.rotation.set(0, 0, 0);
  }, [player]);

  useEffect(() => { register(respawn); }, [register, respawn]);
  useEffect(() => { if (isPresenting) respawn(); }, [isPresenting, respawn]);

  return null;
}

const Index = () => {
  const [activeNPC, setActiveNPC] = useState<NPCData | null>(null);
  const [inVR, setInVR] = useState(false);
  const { visited, markVisited, resetProgress } = useProgress();
  const { npcs, screens, props: scenarioProps, rawScenario, applyScenario } = useScenario();
  const respawnRef = useRef<() => void>(() => {});
  const registerRespawn = useCallback((fn: () => void) => { respawnRef.current = fn; }, []);

  const handleNPCInteract = useCallback((npc: NPCData) => {
    setActiveNPC(npc);
    markVisited(npc.id);
  }, [markVisited]);


  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <VRButton className="vr-button" />

      <Canvas
        shadows
        camera={{ position: [0, 5, 12], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%' }}
      >
        <XR
          referenceSpace="local-floor"
          onSessionStart={() => setInVR(true)}
          onSessionEnd={() => setInVR(false)}
        >
          <Controllers rayMaterial={{ color: 'hsl(45, 90%, 60%)' }} />
          <Hands />
          <VRLocomotion />

          <SceneLighting />
          <MarbleFloor />
          <TempleScene />
          <EnvironmentScreens config={screens} />

          {npcs.map((npc) =>
            npc.glbModel ? (
              <GLBModelNPC
                key={npc.id}
                npc={npc}
                isVisited={visited.has(npc.id)}
                onInteract={() => handleNPCInteract(npc)}
              />
            ) : (
              <NPCFigure
                key={npc.id}
                npc={npc}
                isVisited={visited.has(npc.id)}
                onInteract={() => handleNPCInteract(npc)}
              />
            )
          )}

          <VRDialogLayer npc={activeNPC} onClose={() => setActiveNPC(null)} />
          <StableOrbitControls />
        </XR>
      </Canvas>

      {!inVR && (
        <>
          <ProgressTracker visited={visited} onReset={resetProgress} />
          <LibraryPanel currentScenario={rawScenario} onLoadScenario={applyScenario} />

          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
            <div className="progress-badge rounded-xl px-6 py-2 backdrop-blur-md text-center">
              <h1 className="font-cinzel text-sm font-bold text-foreground tracking-wider">
                Αρχαία Αγορά — Εκπαιδευτική Εξερεύνηση
              </h1>
              <p className="font-cormorant text-xs text-muted-foreground">
                Κάνε κλικ σε έναν φιλόσοφο για να μάθεις περισσότερα
              </p>
            </div>
          </div>

          {activeNPC && <DialogPanel npc={activeNPC} onClose={() => setActiveNPC(null)} />}
        </>
      )}
    </div>
  );
};

export default Index;
