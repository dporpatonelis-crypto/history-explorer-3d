# Jerusalem exploration reward and quiz

The Jerusalem scenario unlocks the reward after any three distinct characters
are selected. All six characters qualify; props and repeated selections do not
advance the count. Desktop and VR progress display the same 3-character target.
Scenarios without `completion.required_count` still require every listed id.

The completion video plays once. Its natural end opens the existing quiz UI.
The quiz covers the tablets, ark, manna, Aaron's rod, bronze serpent and paschal
lamb, using the Greek lesson material supplied by the user. Every answer has
feedback and an explanation. Four of six correct answers pass; unsuccessful
attempts can retry. A successful quiz plays a separate 22-second reward once, then restores
the screen. Reset progress starts a new exploration cycle.

## Video provenance

- User-supplied artifact: https://notebooklm.link.google/DepUa2P2L9eV
- NotebookLM title: Από τη Σκιά στην Αλήθεια: 4 Αρχαία Σύμβολα
- Artifact id: 654d0633-12cb-4927-b311-44f66e2ab1ee
- Downloaded through the NotebookLM Studio's native Download menu.
- Public file: `/media/jerusalem-shadow-to-truth.mp4`
- Duration: 76.556 seconds; H.264/AAC, fast start, 1280×720, 2,660,278 bytes.
- The original portrait image is scaled proportionally and centered with black
  side margins for the landscape curved screen; narration and content retained.
- SHA-256: `d67e71da0b10616d4957106be7bc623c433caf2c10a56b5462481b2e0d3fa32b`

The original Divine Economy scenario JSON is unchanged. Its five-character
completion target and original quiz continue to use their existing media.

## Quiz-success video

- User-supplied Google Vids: https://docs.google.com/videos/d/1vv0Dt1_ZLH2DceiIUnZEYTpkMw5zl2EBVSLwT-Hf7mg/play
- Title: Σκιά και αλήθεια. Downloaded through the connected Google Drive.
- File: `/media/jerusalem-quiz-success.mp4`, H.264/AAC, 1280×720, fast start.
- Exported source duration: 10.048 seconds. Playback rate is `10.048 / 22`,
  giving 22 seconds of playback with audio pitch preserved.
- Explicit `loop: false` makes this reward play once. Legacy scenarios retain
  their playback speed and looping behavior.

The existing right-screen Timeline image is bundled as
`/media/jerusalem-timeline.png`, preserving the content from
https://i.ibb.co/5h8N13sp/image.png. The external image host failed during
preview validation and caused the scene to unmount. Jerusalem now loads the
image locally; Divine Economy retains its existing configuration.
