import { forwardRef, useMemo, useEffect, useState, useRef, useImperativeHandle, useCallback } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg');
}

function slideshowUrlsFromMediaUrl(mediaUrl: string): string[] {
  try {
    const parsed = new URL(mediaUrl, window.location.origin);
    const encodedSlides = new URLSearchParams(parsed.hash.slice(1)).get('sb-slides');
    if (!encodedSlides) return [];
    return encodedSlides
      .split('|')
      .map((url) => url.trim())
      .filter((url) => /^(https?:\/\/|\/)/.test(url));
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
      video.pause();
      video.src = '';
      videoTexture.dispose();
      if (videoRef.current === video) videoRef.current = null;
    };
  }, [url, autoplay, loop, muted]);

  // Keep texture updated
  useFrame(() => {
    if (texture) texture.needsUpdate = true;
  });

  return { texture, videoRef };
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
  onInteractiveEnded?: (event: InteractivePlaybackEvent) => void;
}

export const EnvironmentScreens = forwardRef<EnvironmentScreensHandle, EnvironmentScreensProps>(
function EnvironmentScreens({ config = DEFAULT_SCREENS, interactive, onInteractiveEnded }, ref) {
  const [interactiveActive, setInteractiveActive] = useState(false);
  const [activeInteractive, setActiveInteractive] = useState<InteractiveMediaConfig>();
  const [interactiveTexture, setInteractiveTexture] = useState<THREE.VideoTexture | null>(null);
  const interactiveVideoRef = useRef<HTMLVideoElement | null>(null);
  const interactiveTextureRef = useRef<THREE.VideoTexture | null>(null);
  const onInteractiveEndedRef = useRef(onInteractiveEnded);
  const leftSlides = useMemo(
    () => slideshowUrlsFromMediaUrl(config.left_image_url),
    [config.left_image_url]
  );
  const [leftSlideIndex, setLeftSlideIndex] = useState(0);

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
    onInteractiveEndedRef.current = onInteractiveEnded;
  }, [onInteractiveEnded]);

  const stopInteractive = useCallback(() => {
    const video = interactiveVideoRef.current;
    interactiveVideoRef.current = null;
    if (video) {
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
    video.loop = false;
    video.muted = false;
    video.defaultMuted = false;
    video.playsInline = true;
    video.volume = 1;
    video.src = media.video_url;
    video.dataset.lessonVideoPurpose = purpose;
    video.setAttribute('aria-hidden', 'true');
    video.style.display = 'none';
    document.body.appendChild(video);

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
      console.error('[EnvironmentScreens] Interactive video playback failed:', error);
      if (interactiveVideoRef.current === video) stopInteractive();
      return false;
    }
  }, [interactive, stopInteractive]);

  useEffect(() => {
    stopInteractive();
  }, [config.left_image_url, config.right_image_url, interactive?.video_url, stopInteractive]);

  useEffect(() => () => {
    const video = interactiveVideoRef.current;
    if (video) {
      video.onended = null;
      video.onerror = null;
      video.pause();
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
    : config.right_image_url;
  const hasLeft = leftMediaUrl.length > 0;
  const hasRight = rightMediaUrl.length > 0;

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
          mediaUrl={leftMediaUrl}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          radius={screenRadius}
          thetaStart={Math.PI}
          thetaLength={halfArc}
          height={10.5}
          curveSegments={16}
          textureOverride={showInteractiveLeft ? interactiveTexture : undefined}
        />
      )}
      {/* Right screen: covers from PI - halfArc to PI (right side) */}
      {hasRight && (
        <CurvedScreenMesh
          mediaUrl={rightMediaUrl}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          radius={screenRadius}
          thetaStart={Math.PI - halfArc}
          thetaLength={halfArc}
          height={10.5}
          curveSegments={16}
          textureOverride={showInteractiveRight ? interactiveTexture : undefined}
        />
      )}
    </group>
  );
});
