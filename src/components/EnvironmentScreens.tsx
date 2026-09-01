import { forwardRef, useMemo, useEffect, useState, useRef, useImperativeHandle } from 'react';
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

export interface EnvironmentScreensHandle {
  playInteractive: () => Promise<boolean>;
}

const DEFAULT_SCREENS: ScreenConfig = {
  left_image_url: '',
  right_image_url: '',
};

interface EnvironmentScreensProps {
  config?: ScreenConfig;
  interactive?: InteractiveMediaConfig;
  onInteractiveEnded?: () => void;
}

export const EnvironmentScreens = forwardRef<EnvironmentScreensHandle, EnvironmentScreensProps>(
function EnvironmentScreens({ config = DEFAULT_SCREENS, interactive, onInteractiveEnded }, ref) {
  const [interactiveActive, setInteractiveActive] = useState(false);
  const {
    texture: interactiveTexture,
    videoRef: interactiveVideoRef,
  } = useVideoTexture(interactive?.video_url ?? '', false, false, true);
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
    setInteractiveActive(false);
    const video = interactiveVideoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    video.muted = true;
  }, [config.left_image_url, config.right_image_url, interactive?.video_url, interactiveVideoRef]);

  useEffect(() => {
    const video = interactiveVideoRef.current;
    if (!video) return;

    const handleEnded = () => {
      setInteractiveActive(false);
      onInteractiveEnded?.();
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [interactive?.video_url, interactiveVideoRef, onInteractiveEnded]);

  useImperativeHandle(ref, () => ({
    playInteractive: async () => {
      const video = interactiveVideoRef.current;
      if (!video || !interactive?.video_url) return false;

      video.pause();
      video.currentTime = 0;
      video.loop = false;
      video.muted = false;
      video.defaultMuted = false;
      video.volume = 1;
      setInteractiveActive(true);

      try {
        await video.play();
        return true;
      } catch (error) {
        console.error('[EnvironmentScreens] Interactive video playback failed:', error);
        return false;
      }
    },
  }), [interactive?.video_url, interactiveVideoRef]);

  const interactiveTarget = interactive?.target_screen ?? 'right';
  const showInteractiveLeft = interactiveActive && interactiveTarget === 'left';
  const showInteractiveRight = interactiveActive && interactiveTarget === 'right';
  const leftMediaUrl = showInteractiveLeft
    ? interactive?.video_url ?? ''
    : leftSlides[leftSlideIndex] ?? config.left_image_url;
  const rightMediaUrl = showInteractiveRight
    ? interactive?.video_url ?? ''
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
