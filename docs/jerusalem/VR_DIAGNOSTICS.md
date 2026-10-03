# VR black-screen investigation

Reported on Meta Quest 3: sometimes blackens after a video starts or midway through it,
but also at other times. A separate flashlight-like mark follows pointing/viewing in
both desktop Chrome and VR. Neither issue has been reproduced on a headset here.

The **Έλεγχος VR** panel saves a local JSON report with the last 80 events. It records
WebGL context loss/restoration, XR start/end/visibility, JavaScript errors, rejected
promises, video metadata/playback/waiting/stalls/errors, and a render sample every
10 seconds. Samples include the current video's time, rate, ready state and dimensions;
renderer counters include geometries, textures, draw calls and triangles. These are
renderer counters, not measured GPU memory. Reports are never sent to a server.

After a failure, exit VR and save the report. If the page closes, reopen the **same
origin** in the same browser on the same device and save it there. Local storage keeps
the last events when permitted; blocked storage falls back to the current page's memory.
An unclosed XR session after reload is only a clue: refreshing or closing the browser
can produce the same event. A browser/OS termination may leave no explicit error.

Two temporary independent tests let the user disable hover circles or shadows before
entering VR. Test one at a time. Their settings and subsequent video/error events are
recorded. The hover circles are raised above the pavement and no longer write depth;
the old 0.02 m height overlapped the Jerusalem tiles (top 0.0225 m), while characters
also bob vertically. This fixes that overlap without claiming it explains every mark.
None of the scene's GLBs contain punctual lights. The active scene uses a fixed
directional light, ambient light and hemisphere light, with no mouse-following spotlight.

Asset audit found two retained legacy models with high geometry counts:
`monk.glb` has 499,360 triangles and `Alexander.glb` has 499,914. A desktop render
sample with shadows enabled reported approximately 1.95 million rendered triangles
(including render passes). This establishes a significant workload, not proof of
GPU exhaustion or the cause of a headset failure. The assets remain unchanged so
diagnostic comparisons preserve the current composition.

VideoTexture already schedules updates for decoded frames in the installed Three.js
version. Removed the extra per-render-frame update, which needlessly uploaded frames
at the VR rendering rate. Video cleanup now consistently clears the source and calls
load() after pausing to release decoding resources. Media content/rates remain unchanged.

This adds evidence collection and reduces redundant video work. A headset report is
still required to distinguish resource pressure, media decoding, a rendering error,
and normal XR visibility/session transitions.
