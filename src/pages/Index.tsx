import { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TempleScene, MarbleFloor, SceneLighting } from '@/components/TempleScene';
import { NPCFigure } from '@/components/NPCFigure';
import { GLBModelNPC } from '@/components/GLBModelNPC';
import { DialogPanel } from '@/components/DialogPanel';
import { ProgressTracker } from '@/components/ProgressTracker';
import { EnvironmentScreens } from '@/components/EnvironmentScreens';
import { useProgress } from '@/hooks/useProgress';
import { NPCData } from '@/data/npcData';
import { useScenario } from '@/hooks/useScenario';

function StableOrbitControls() {
  const controlsRef = useRef<any>(null);
  const initialized = useRef(false);

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

const Index = () => {
  const [activeNPC, setActiveNPC] = useState<NPCData | null>(null);
  const { visited, markVisited, resetProgress } = useProgress();
  const { npcs, screens } = useScenario();

  const handleNPCInteract = useCallback((npc: NPCData) => {
    setActiveNPC(npc);
    markVisited(npc.id);
  }, [markVisited]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <Canvas
        shadows
        camera={{ position: [0, 5, 12], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%' }}
      >
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

        <StableOrbitControls />
      </Canvas>

      <ProgressTracker visited={visited} onReset={resetProgress} />

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
    </div>
  );
};

export default Index;
