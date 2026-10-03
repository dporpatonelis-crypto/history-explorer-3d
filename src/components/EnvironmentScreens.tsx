import { forwardRef, useMemo, useEffect, useState, useRef, useImperativeHandle, useCallback } from 'react';
import * as THREE from 'three';
import { resolveInteractivePlaybackRate, shouldLoopInteractiveVideo } from '@/lib/interactivePlayback';
import { Html, useTexture } from '@react-three/drei';
import { diagnosticMessage, getVRDiagnostics, observeVideoDiagnostics, videoDiagnosticDetails } from '@/lib/vrDiagnostics';
import { JERUSALEM_ENVIRONMENT, type SceneEnvironmentId } from '@/lib/sceneEnvironment';
import { resolveAssetUrl } from '@/lib/assetUrl';

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg');
}

function isGoogleSlidesUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.hostname === 'docs.google.com' &&
      /^\/presentation\/d\/[^/]+(?:\/|$)/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function slideshowUrlsFromMediaUrl(mediaUrl: string): string[] {
  try {
    const parsed = new URL(mediaUrl, window.location.origin);
    const encodedSlides = new URLSearchParams(parsed.hash.slice(1)).get('sb-slides');
    if (!encodedSlides) return [];
    return encodedSlides
      .split('|')
      .map((url) => url.trim())
      .filter((url) => /^(https?:\/\/|\/)/.test(url))
      .map((url) => resolveAssetUrl(url)!);
  } catch {
    return [];
  }
}

function useVideoTexture(url: string, autoplay = true, loop = true, muted = true) {
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setTexture(null);
    if (!url) {
      videoRef.current = null;
      return;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.loop = loop;
    video.muted = muted;
    video.defaultMuted = muted;
    video.playsInline = true;
    video.autoplay = autoplay;
    video.src = url;
    videoRef.current = video;
    const stopObserving = observeVideoDiagnostics(video);

    if (autoplay) {
      video.play().catch(() => {
        // Muted environment videos may still require a user gesture on some devices.
      });
    } else {
      video.load();
    }

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    setTexture(videoTexture);

    return () => {
      stopObserving();
      video.pause();
      video.removeAttribute('src');
      video.load();
      videoTexture.dispose();
      if (videoRef.current === video) videoRef.current = null;
    };
  }, [url, autoplay, loop, muted]);

  // VideoTexture already updates when a decoded video frame is available.

  return { texture, videoRef };
}

function GoogleSlidesCurvedScreen({
  mediaUrl,
  side,
  thetaStart,
  screenArc,
}: {
  mediaUrl: string;
  side: 'left' | 'right';
  thetaStart: number;
  screenArc: number;
}) {
  const screenRadius = 10;
  const screenHeight = 10.5;
  const segmentCount = 5;
  const slideWidth = 1000;
  const slideHeight = 562.5;
  const segmentWidth = slideWidth / segmentCount;
  const backingGeometry = useMemo(() => (
    new THREE.CylinderGeometry(
      screenRadius,
      screenRadius,
      screenHeight,
      16,
      1,
      true,
      thetaStart,
      screenArc,
    )
  ), [screenArc, screenHeight, screenRadius, thetaStart]);

  useEffect(() => () => {
    backingGeometry.dispose();
  }, [backingGeometry]);

  return (
    <group>
      <mesh geometry={backingGeometry}>
        <meshBasicMaterial
          color="#111"
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>
      {Array.from({ length: segmentCount }, (_, index) => {
        const theta = thetaStart + ((index + 0.5) / segmentCount) * screenArc;
        const position: [number, number, number] = [
          (screenRadius + 0.04) * Math.sin(theta),
          0,
          (screenRadius + 0.04) * Math.cos(theta),
        ];
        const rotation: [number, number, number] = [0, theta + Math.PI, 0];
        // The inward-facing plane reverses its local horizontal axis. Match the
        // same UV flip used by CurvedScreenMesh so the slide reads left-to-right.
        const sourceIndex = segmentCount - 1 - index;

        return (
          <Html
            key={`google-slides-${side}-segment-${index}`}
            transform
            center
            position={position}
            rotation={rotation}
            distanceFactor={6}
            pointerEvents="none"
            zIndexRange={[100, 0]}
          >
            <div
              style={{
                width: `${segmentWidth}px`,
                height: `${slideHeight}px`,
                overflow: 'hidden',
                background: '#111',
                pointerEvents: 'none',
              }}
            >
              <iframe
                src={mediaUrl}
                title={`Google Slides ${side} screen segment ${index + 1}`}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                loading="eager"
                style={{
                  display: 'block',
                  width: `${slideWidth}px`,
                  height: `${slideHeight}px`,
                  maxWidth: 'none',
                  border: 0,
                  margin: 0,
                  padding: 0,
                  transform: `translateX(-${sourceIndex * segmentWidth}px)`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </Html>
        );
      })}
    </group>
  );
}

function CurvedScreenMesh({
  mediaUrl,
  position,
  rotation,
  radius = 8,
  height = 7,
  curveSegments = 8,
  thetaStart = 0,
  thetaLength = Math.PI,
  textureOverride,
}: {
  mediaUrl: string;
  position: [number, number, number];
  rotation: [number, number, number];
  radius?: number;
  height?: number;
  curveSegments?: number;
  thetaStart?: number;
  thetaLength?: number;
  textureOverride?: THREE.Texture | null;
}) {
  const isVideo = isVideoUrl(mediaUrl);
  const hasTextureOverride = textureOverride !== undefined;
  const [loadError, setLoadError] = useState(false);
  const imageTexture = useTexture(isVideo || hasTextureOverride ? '/placeholder.svg' : mediaUrl, (tex) => {
    // loaded ok
  });
  
  // Listen for load errors via onError on the texture loader
  useEffect(() => {
    if (!isVideo && !hasTextureOverride && mediaUrl) {
      const img = new Image();
      img.onerror = () => setLoadError(true);
      img.src = mediaUrl;
    }
  }, [mediaUrl, isVideo, hasTextureOverride]);
  const { texture: videoTexture } = useVideoTexture(isVideo && !hasTextureOverride ? mediaUrl : '');
  
  const texture = hasTextureOverride ? textureOverride : isVideo ? videoTexture : imageTexture;

  useEffect(() => {
    if (!isVideo && imageTexture) {
      imageTexture.colorSpace = THREE.SRGBColorSpace;
      imageTexture.minFilter = THREE.LinearFilter;
      imageTexture.magFilter = THREE.LinearFilter;
      imageTexture.generateMipmaps = false;
      imageTexture.anisotropy = 1;
      imageTexture.needsUpdate = true;
    }
  }, [imageTexture, isVideo]);

  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(
      radius, radius, height,
      curveSegments, 1,
      true,
      thetaStart,
      thetaLength
    );

    const uvs = geo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      uvs.setX(i, 1 - uvs.getX(i));
    }
    return geo;
  }, [radius, height, thetaStart, thetaLength, curveSegments]);

  useEffect(() => {
    return () => { geometry.dispose(); };
  }, [geometry]);

  if (loadError || !texture) return null;

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

export interface InteractiveMediaConfig {
  video_url: string;
  target_screen?: 'left' | 'right';
  label?: string;
  playback_rate?: number;
  loop?: boolean;
}

export type InteractivePlaybackPurpose = 'model' | 'completion-reward' | 'quiz-reward';

export interface InteractivePlaybackEvent {
  media: InteractiveMediaConfig;
  purpose: InteractivePlaybackPurpose;
}

export interface EnvironmentScreensHandle {
  playInteractive: (
    media?: InteractiveMediaConfig,
    purpose?: InteractivePlaybackPurpose,
  ) => Promise<boolean>;
  stopInteractive: () => void;
}

const DEFAULT_SCREENS: ScreenConfig = {
  left_image_url: '',
  right_image_url: '',
};

interface EnvironmentScreensProps {
  config?: ScreenConfig;
  interactive?: InteractiveMediaConfig;
  environment?: SceneEnvironmentId;
  onInteractiveEnded?: (event: InteractivePlaybackEvent) => void;
}

export const EnvironmentScreens = forwardRef<EnvironmentScreensHandle, EnvironmentScreensProps>(
function EnvironmentScreens({ config = DEFAULT_SCREENS, interactive, environment = 'agora', onInteractiveEnded }, ref) {
  const [interactiveActive, setInteractiveActive] = useState(false);
  const [activeInteractive, setActiveInteractive] = useState<InteractiveMediaConfig>();
  const [interactiveTexture, setInteractiveTexture] = useState<THREE.VideoTexture | null>(null);
  const interactiveVideoRef = useRef<HTMLVideoElement | null>(null);
  const interactiveTextureRef = useRef<THREE.VideoTexture | null>(null);
  const stopVideoObservationRef = useRef<(() => void) | null>(null);
  const onInteractiveEndedRef = useRef(onInteractiveEnded);
  const leftSlides = useMemo(
    () => slideshowUrlsFromMediaUrl(config.left_image_url),
    [config.left_image_url]
  );
  const rightSlides = useMemo(
    () => slideshowUrlsFromMediaUrl(config.right_image_url),
    [config.right_image_url]
  );
  const [leftSlideIndex, setLeftSlideIndex] = useState(0);
  // Start the presentation on the timeline (slide 2); if a timer is
  // temporarily throttled, this remains the stable fallback frame.
  const [rightSlideIndex, setRightSlideIndex] = useState(1);

  useEffect(() => {
    setLeftSlideIndex(0);
    leftSlides.forEach((url) => useTexture.preload(url));
    if (leftSlides.length < 2) return;
    const interval = window.setInterval(() => {
      setLeftSlideIndex((current) => (current + 1) % leftSlides.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [leftSlides]);

  useEffect(() => {
    setRightSlideIndex(rightSlides.length > 1 ? 1 : 0);
    rightSlides.forEach((url) => useTexture.preload(url));
    if (rightSlides.length < 2) return;
    const interval = window.setInterval(() => {
      setRightSlideIndex((current) => (current + 1) % rightSlides.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [rightSlides]);

  useEffect(() => {
    onInteractiveEndedRef.current = onInteractiveEnded;
  }, [onInteractiveEnded]);

  const stopInteractive = useCallback(() => {
    const video = interactiveVideoRef.current;
    interactiveVideoRef.current = null;
    stopVideoObservationRef.current?.();
    stopVideoObservationRef.current = null;
    if (video) {
      getVRDiagnostics().record('video-stopped', videoDiagnosticDetails(video));
      video.onended = null;
      video.onerror = null;
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    }

    const texture = interactiveTextureRef.current;
    interactiveTextureRef.current = null;
    texture?.dispose();

    setInteractiveTexture(null);
    setInteractiveActive(false);
    setActiveInteractive(undefined);
  }, []);

  const playInteractive = useCallback(async (
    requestedMedia?: InteractiveMediaConfig,
    purpose: InteractivePlaybackPurpose = 'model',
  ) => {
    const media = requestedMedia ?? interactive;
    if (!media?.video_url?.trim()) return false;

    stopInteractive();

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.loop = shouldLoopInteractiveVideo(purpose, media.loop);
    const playbackRate = resolveInteractivePlaybackRate(media.playback_rate);
    // Loading a new source restores the default rate, so set both rates.
    video.defaultPlaybackRate = playbackRate;
    video.playbackRate = playbackRate;
    video.preservesPitch = true;
    video.muted = false;
    video.defaultMuted = false;
    video.playsInline = true;
    video.volume = 1;
    video.src = media.video_url;
    video.dataset.lessonVideoPurpose = purpose;
    stopVideoObservationRef.current = observeVideoDiagnostics(video);
    video.setAttribute('aria-hidden', 'true');
    video.style.display = 'none';
    document.body.appendChild(video);
    getVRDiagnostics().record('video-requested', videoDiagnosticDetails(video));

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    interactiveVideoRef.current = video;
    interactiveTextureRef.current = texture;
    setActiveInteractive(media);
    setInteractiveTexture(texture);
    setInteractiveActive(true);

    video.onended = () => {
      if (interactiveVideoRef.current !== video) return;
      console.info(`[EnvironmentScreens] Playback ended (${purpose}): ${media.video_url}`);
      stopInteractive();
      onInteractiveEndedRef.current?.({ media, purpose });
    };
    video.onerror = () => {
      if (interactiveVideoRef.current !== video) return;
      console.error('[EnvironmentScreens] Interactive video failed while playing:', media.video_url);
      stopInteractive();
    };

    try {
      await video.play();
      console.info(`[EnvironmentScreens] Playback started (${purpose}): ${media.video_url}`);
      return true;
    } catch (error) {
      getVRDiagnostics().record('video-play-rejected', { purpose, message: diagnosticMessage(error) });
      console.error('[EnvironmentScreens] Interactive video playback failed:', error);
      if (interactiveVideoRef.current === video) stopInteractive();
      return false;
    }
  }, [interactive, stopInteractive]);

  useEffect(() => {
    stopInteractive();
  }, [config.left_image_url, config.right_image_url, interactive?.video_url, stopInteractive]);

  useEffect(() => () => {
    stopVideoObservationRef.current?.();
    const video = interactiveVideoRef.current;
    if (video) {
      video.onended = null;
      video.onerror = null;
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    }
    interactiveTextureRef.current?.dispose();
  }, []);

  useImperativeHandle(ref, () => ({
    playInteractive,
    stopInteractive,
  }), [playInteractive, stopInteractive]);

  const interactiveTarget = activeInteractive?.target_screen ?? 'right';
  const showInteractiveLeft = interactiveActive && interactiveTarget === 'left';
  const showInteractiveRight = interactiveActive && interactiveTarget === 'right';
  const leftMediaUrl = showInteractiveLeft
    ? activeInteractive?.video_url ?? ''
    : leftSlides[leftSlideIndex] ?? config.left_image_url;
  const rightMediaUrl = showInteractiveRight
    ? activeInteractive?.video_url ?? ''
    : rightSlides[rightSlideIndex] ?? config.right_image_url;
  const hasLeft = leftMediaUrl.length > 0;
  const hasRight = rightMediaUrl.length > 0;

  if (!hasLeft && !hasRight) return null;

  // Both screens share center, radius=10, split into left/right halves
  // thetaStart in CylinderGeometry: 0 = +X axis, goes counter-clockwise from top view
  // Camera is at z=12 looking at z=0, so the "back" of the cylinder (facing camera) is around theta=PI
  const screenRadius = 10;
  // Leave the temple axis clear in the Jerusalem scene while preserving both media screens.
  const isJerusalem = environment === JERUSALEM_ENVIRONMENT;
  const halfArc = Math.PI * (isJerusalem ? 0.34 : 0.48);
  const centerGapHalf = isJerusalem ? Math.PI * 0.12 : 0;
  const leftThetaStart = Math.PI + centerGapHalf;
  const rightThetaStart = Math.PI - centerGapHalf - halfArc;
  // Keep the Jerusalem pair behind the temple and move it forward with the
  // compact environment. Scale meshes and Slides together, preserving the arc/gap.
  const screenScale = isJerusalem ? 2 : 1;
  const screenCenter: [number, number, number] = [0, 5.5 * screenScale, isJerusalem ? -19 : 0];

  return (
    <group position={screenCenter} scale={screenScale}>
      {/* Left screen: covers from PI to PI + halfArc (left side when facing center) */}
      {hasLeft && (
        isGoogleSlidesUrl(leftMediaUrl) ? (
          <GoogleSlidesCurvedScreen
            mediaUrl={leftMediaUrl}
            side="left"
            thetaStart={leftThetaStart}
            screenArc={halfArc}
          />
        ) : (
          <CurvedScreenMesh
            key={`left-screen-${leftMediaUrl}`}
            mediaUrl={leftMediaUrl}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            radius={screenRadius}
            thetaStart={leftThetaStart}
            thetaLength={halfArc}
            height={10.5}
            curveSegments={16}
            textureOverride={showInteractiveLeft ? interactiveTexture : undefined}
          />
        )
      )}
      {/* Right screen: covers from PI - halfArc to PI (right side) */}
      {hasRight && (
        isGoogleSlidesUrl(rightMediaUrl) ? (
          <GoogleSlidesCurvedScreen
            mediaUrl={rightMediaUrl}
            side="right"
            thetaStart={rightThetaStart}
            screenArc={halfArc}
          />
        ) : (
          <CurvedScreenMesh
            key={`right-screen-${rightMediaUrl}`}
            mediaUrl={rightMediaUrl}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            radius={screenRadius}
            thetaStart={rightThetaStart}
            thetaLength={halfArc}
            height={10.5}
            curveSegments={16}
            textureOverride={showInteractiveRight ? interactiveTexture : undefined}
          />
        )
      )}
    </group>
  );
});
