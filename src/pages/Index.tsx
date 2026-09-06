import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Canvas, createPortal } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { XR, VRButton, Controllers, Hands, useXR } from '@react-three/xr';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { TempleScene, MarbleFloor, SceneLighting } from '@/components/TempleScene';
import { NPCFigure } from '@/components/NPCFigure';
import { GLBModelNPC } from '@/components/GLBModelNPC';
import { DialogPanel } from '@/components/DialogPanel';
import { ProgressTracker } from '@/components/ProgressTracker';
import {
  EnvironmentScreens,
  type EnvironmentScreensHandle,
  type InteractivePlaybackEvent,
} from '@/components/EnvironmentScreens';
import { LibraryPanel } from '@/components/LibraryPanel';
import { VRLocomotion } from '@/components/VRLocomotion';
import { VRDialogBoard } from '@/components/VRDialogBoard';
import { VRWristPanel } from '@/components/VRWristPanel';
import { ScenarioProps, type ScenarioProp } from '@/components/ScenarioProps';
import { ExtraModelsPanel, type ExtraModel } from '@/components/ExtraModelsPanel';
import { useProgress } from '@/hooks/useProgress';
import { NPCData, npcData } from '@/data/npcData';
import { QuizResult } from '@/data/quizData';
import { useScenario } from '@/hooks/useScenario';
import { narrate, stopSpeaking } from '@/lib/lipsync';

function StableOrbitControls() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
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
function VRDialogLayer({
  npc,
  onClose,
  onPlayInteractive,
}: {
  npc: NPCData | null;
  onClose: () => void;
  onPlayInteractive?: () => void;
}) {
  const { player, isPresenting } = useXR();
  if (!isPresenting || !npc || !player) return null;
  return createPortal(
    <VRDialogBoard npc={npc} onClose={onClose} onPlayInteractive={onPlayInteractive} />,
    player
  );
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
  const [activePropDialog, setActivePropDialog] = useState<ScenarioProp | null>(null);
  const [inVR, setInVR] = useState(false);
  const [extraModels, setExtraModels] = useState<ExtraModel[]>([]);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const { visited, markVisited, resetProgress } = useProgress();
  const {
    npcs,
    screens,
    interactive,
    characterInteractives,
    props: scenarioProps,
    completionIds,
    completionInteractive,
    quiz,
    loading,
    rawScenario,
    applyScenario,
  } = useScenario();
  const environmentScreensRef = useRef<EnvironmentScreensHandle>(null);
  const respawnRef = useRef<() => void>(() => {});
  const completionArmedRef = useRef(false);
  const autoVideoStartedRef = useRef(false);
  const rewardPlayedRef = useRef(false);
  const workflowKeyRef = useRef('');
  const registerRespawn = useCallback((fn: () => void) => { respawnRef.current = fn; }, []);

  const requiredCompletionIds = useMemo(
    () => completionIds?.length
      ? completionIds
      : npcs
        .filter((npc) => npc.name !== 'tree' && npc.dialogs.length > 0)
        .slice(0, npcData.length)
        .map((npc) => npc.id),
    [completionIds, npcs],
  );
  const requiredCompletionIdSet = useMemo(
    () => new Set(requiredCompletionIds),
    [requiredCompletionIds],
  );
  const completionCount = requiredCompletionIds.filter((id) => visited.has(id)).length;
  const completionWorkflowConfigured = Boolean(completionIds?.length);
  const completionReached = completionWorkflowConfigured
    && completionCount >= requiredCompletionIds.length;
  const workflowKey = [
    interactive?.video_url ?? '',
    completionInteractive?.video_url ?? '',
    quiz?.id ?? '',
    quiz?.rewardInteractive?.video_url ?? '',
    requiredCompletionIds.join('|'),
  ].join('|');

  const activeNPCInteractive = useMemo(
    () => activeNPC
      ? characterInteractives?.[activeNPC.id] ?? interactive
      : undefined,
    [activeNPC, characterInteractives, interactive],
  );

  const quizHostNPC = useMemo<NPCData | null>(() => quiz ? ({
    id: quiz.hostPropId,
    name: quiz.hostName,
    title: quiz.hostTitle,
    position: [0, 0, 3],
    rotation: 0,
    color: '#d4a574',
    robeColor: '#4a6fa5',
    description: quiz.intro,
    dialogs: [],
    historicalFacts: [],
    glbModel: scenarioProps?.find((prop) => prop.id === quiz.hostPropId)?.glbModel,
  }) : null, [quiz, scenarioProps]);

  const activePropNPC = useMemo<NPCData | null>(() => {
    if (!activePropDialog) return null;
    const text = activePropDialog.dialog_text?.trim() || activePropDialog.welcome?.trim();
    if (!text) return null;
    const id = activePropDialog.id ?? activePropDialog.glbModel;
    return {
      id,
      name: activePropDialog.dialog_title?.trim() || 'Bishop',
      title: activePropDialog.dialog_subtitle?.trim() || 'Δοκιμή animation και lipsync',
      position: [
        activePropDialog.position_x ?? 0,
        activePropDialog.position_y ?? 0,
        activePropDialog.position_z ?? 0,
      ],
      rotation: activePropDialog.rotation ?? 0,
      color: '#d4a574',
      robeColor: '#4a6fa5',
      description: text,
      dialogs: [{
        question: activePropDialog.dialog_prompt?.trim() || 'Μήνυμα υποδοχής',
        answer: text,
      }],
      historicalFacts: [],
      glbModel: activePropDialog.glbModel,
      scale: activePropDialog.scale,
    };
  }, [activePropDialog]);

  useEffect(() => {
    if (loading || !workflowKey || workflowKeyRef.current === workflowKey) return;
    workflowKeyRef.current = workflowKey;
    completionArmedRef.current = completionWorkflowConfigured && !completionReached;
    autoVideoStartedRef.current = false;
    rewardPlayedRef.current = false;
    setQuizOpen(false);
    setQuizUnlocked(false);
    setQuizResult(null);
  }, [completionReached, completionWorkflowConfigured, loading, workflowKey]);

  const handleNPCInteract = useCallback((npc: NPCData) => {
    const isNewRequiredVisit = requiredCompletionIdSet.has(npc.id) && !visited.has(npc.id);
    const completesNow = completionWorkflowConfigured
      && completionArmedRef.current
      && !autoVideoStartedRef.current
      && isNewRequiredVisit
      && completionCount + 1 >= requiredCompletionIds.length;

    markVisited(npc.id);

    if (completesNow) {
      completionArmedRef.current = false;
      setActiveNPC(null);
      setQuizOpen(false);

      const completionReward = completionInteractive ?? interactive;
      if (completionReward) {
        autoVideoStartedRef.current = true;
        const playback = environmentScreensRef.current?.playInteractive(
          completionReward,
          'completion-reward',
        );
        const handlePlaybackFailure = () => {
          autoVideoStartedRef.current = false;
          if (quiz) {
            setQuizUnlocked(true);
            setQuizOpen(true);
          }
        };
        if (!playback) {
          handlePlaybackFailure();
          return;
        }
        void playback.then((started) => {
          if (started) return;
          handlePlaybackFailure();
        });
      } else if (quiz) {
        setQuizUnlocked(true);
        setQuizOpen(true);
      }
      return;
    }

    setQuizOpen(false);
    setActivePropDialog(null);
    setActiveNPC(npc);
  }, [
    completionCount,
    completionInteractive,
    completionWorkflowConfigured,
    interactive,
    markVisited,
    quiz,
    requiredCompletionIdSet,
    requiredCompletionIds.length,
    visited,
  ]);

  const handleInteractivePlayback = useCallback(() => {
    if (!activeNPCInteractive) return;
    stopSpeaking();
    setActiveNPC(null);
    setActivePropDialog(null);
    setQuizOpen(false);
    void environmentScreensRef.current?.playInteractive(activeNPCInteractive, 'model');
  }, [activeNPCInteractive]);

  const handleInteractiveEnded = useCallback((event: InteractivePlaybackEvent) => {
    if (event.purpose !== 'completion-reward') return;
    if (!completionReached || !quiz || quizResult?.passed) return;
    setActiveNPC(null);
    setQuizUnlocked(true);
    setQuizOpen(true);
  }, [completionReached, quiz, quizResult?.passed]);

  const handleQuizComplete = useCallback((result: QuizResult) => {
    setQuizResult(result);
    if (!result.passed || !quiz || rewardPlayedRef.current) return;
    rewardPlayedRef.current = true;
    const rewardMedia = quiz.rewardInteractive;
    if (!rewardMedia) {
      void narrate(quiz.hostPropId, quiz.rewardText, quiz.rewardAudioUrl);
      return;
    }

    stopSpeaking();
    setQuizOpen(false);
    const playback = environmentScreensRef.current?.playInteractive(rewardMedia, 'quiz-reward');
    const narrateFallback = () => {
      void narrate(quiz.hostPropId, quiz.rewardText, quiz.rewardAudioUrl);
    };
    if (!playback) {
      narrateFallback();
      return;
    }
    void playback.then((started) => {
      if (!started) narrateFallback();
    });
  }, [quiz]);

  const handleQuizRetry = useCallback(() => {
    setQuizResult(null);
  }, []);

  const handleQuizHostInteract = useCallback(() => {
    if (!quizUnlocked || !quiz) return;
    stopSpeaking();
    setActiveNPC(null);
    setActivePropDialog(null);
    setQuizOpen(true);
  }, [quiz, quizUnlocked]);

  const handlePropInteract = useCallback((prop: ScenarioProp) => {
    if (prop.id === quiz?.hostPropId) {
      handleQuizHostInteract();
      return;
    }
    if (!prop.dialog_enabled) return;
    stopSpeaking();
    setActiveNPC(null);
    setQuizOpen(false);
    setActivePropDialog(prop);
  }, [handleQuizHostInteract, quiz?.hostPropId]);

  const handleResetProgress = useCallback(() => {
    stopSpeaking();
    environmentScreensRef.current?.stopInteractive();
    resetProgress();
    completionArmedRef.current = completionWorkflowConfigured;
    autoVideoStartedRef.current = false;
    rewardPlayedRef.current = false;
    setActiveNPC(null);
    setActivePropDialog(null);
    setQuizOpen(false);
    setQuizUnlocked(false);
    setQuizResult(null);
  }, [completionWorkflowConfigured, resetProgress]);


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
          <VRSpawn register={registerRespawn} />
          <VRWristPanel
            visitedCount={completionCount}
            totalCount={requiredCompletionIds.length}
            onRespawn={() => respawnRef.current()}
            onCloseDialog={() => setActiveNPC(null)}
          />

          <SceneLighting />
          <MarbleFloor />
          <TempleScene />
          <EnvironmentScreens
            ref={environmentScreensRef}
            config={screens}
            interactive={interactive}
            onInteractiveEnded={handleInteractiveEnded}
          />
          <ScenarioProps
            props={[...(scenarioProps ?? []), ...extraModels]}
            interactivePropId={quizUnlocked ? quiz?.hostPropId : undefined}
            onPropInteract={handlePropInteract}
          />

          {npcs.map((npc, index) =>
            npc.glbModel ? (
              <GLBModelNPC
                key={`${npc.id}-${index}`}
                npc={npc}
                isVisited={visited.has(npc.id)}
                onInteract={() => handleNPCInteract(npc)}
              />
            ) : (
              <NPCFigure
                key={`${npc.id}-${index}`}
                npc={npc}
                isVisited={visited.has(npc.id)}
                onInteract={() => handleNPCInteract(npc)}
              />
            )
          )}

          <VRDialogLayer
            npc={activeNPC}
            onClose={() => setActiveNPC(null)}
            onPlayInteractive={activeNPCInteractive ? handleInteractivePlayback : undefined}
          />
          <StableOrbitControls />
        </XR>
      </Canvas>

      {!inVR && (
        <>
          <ProgressTracker
            visited={visited}
            requiredIds={requiredCompletionIds}
            onReset={handleResetProgress}
          />
          <LibraryPanel currentScenario={rawScenario} onLoadScenario={applyScenario} />
          <ExtraModelsPanel models={extraModels} onChange={setExtraModels} />

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

          {quizOpen && quiz && quizHostNPC ? (
            <DialogPanel
              key={`quiz-${quiz.id}`}
              npc={quizHostNPC}
              quiz={quiz}
              quizResult={quizResult}
              onQuizComplete={handleQuizComplete}
              onQuizRetry={handleQuizRetry}
              onClose={() => { stopSpeaking(); setQuizOpen(false); }}
            />
          ) : activeNPC ? (
            <DialogPanel
              npc={activeNPC}
              onClose={() => setActiveNPC(null)}
              onPlayInteractive={activeNPCInteractive ? handleInteractivePlayback : undefined}
            />
          ) : activePropDialog && activePropNPC ? (
            <DialogPanel
              key={`prop-${activePropNPC.id}`}
              npc={activePropNPC}
              speechAudioUrl={activePropDialog.dialog_audio ?? activePropDialog.welcome_audio}
              speechEnabled={activePropDialog.dialog_speech_enabled !== false}
              onClose={() => { stopSpeaking(); setActivePropDialog(null); }}
            />
          ) : null}
        </>
      )}
    </div>
  );
};

export default Index;
