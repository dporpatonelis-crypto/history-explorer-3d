import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { diagnosticMessage, getVRDiagnostics, videoDiagnosticDetails } from '@/lib/vrDiagnostics';

export function VRDiagnosticsProbe({ environment }: { environment: string }) {
  const gl = useThree(state => state.gl);
  const elapsed = useRef(0);
  const frames = useRef(0);

  useEffect(() => {
    const report = getVRDiagnostics();
    const canvas = gl.domElement;
    report.record('renderer-ready', {
      environment, webgl2: gl.capabilities.isWebGL2,
      maxTextureSize: gl.capabilities.maxTextureSize,
    });
    const lost = () => {
      report.record('webgl-context-lost');
      window.dispatchEvent(new Event('lesson-graphics-lost'));
    };
    const restored = () => {
      report.record('webgl-context-restored');
      window.dispatchEvent(new Event('lesson-graphics-restored'));
    };
    let removeVisibility = () => {};
    const start = () => {
      elapsed.current = 0;
      frames.current = 0;
      const session = gl.xr.getSession();
      report.record('xr-start', { environment, visibility: session?.visibilityState ?? 'unknown' });
      if (session) {
        const visibility = () => report.record('xr-visibility', { visibility: session.visibilityState });
        session.addEventListener('visibilitychange', visibility);
        removeVisibility = () => session.removeEventListener('visibilitychange', visibility);
      }
    };
    const end = () => { removeVisibility(); report.record('xr-end'); };
    const error = (event: ErrorEvent) => report.record('javascript-error', { message: diagnosticMessage(event.error ?? event.message) });
    const rejection = (event: PromiseRejectionEvent) => report.record('promise-rejection', { message: diagnosticMessage(event.reason) });
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    gl.xr.addEventListener('sessionstart', start);
    gl.xr.addEventListener('sessionend', end);
    if (gl.xr.isPresenting) start();
    window.addEventListener('error', error);
    window.addEventListener('unhandledrejection', rejection);
    return () => {
      removeVisibility();
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      gl.xr.removeEventListener('sessionstart', start);
      gl.xr.removeEventListener('sessionend', end);
      window.removeEventListener('error', error);
      window.removeEventListener('unhandledrejection', rejection);
    };
  }, [gl, environment]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    frames.current += 1;
    if (elapsed.current < 10) return;
    const video = document.querySelector<HTMLVideoElement>('video[data-lesson-video-purpose]');
    getVRDiagnostics().record('render-sample', {
      environment, inVR: gl.xr.isPresenting,
      fps: Math.round(frames.current / elapsed.current),
      drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
      ...(video ? videoDiagnosticDetails(video) : {}),
    });
    elapsed.current = 0;
    frames.current = 0;
  });
  return null;
}
