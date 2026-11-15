# MICROCOSMOS

A single-screen React and Three.js album teaser built as a blue CRT. The opening interference is generated in real time. The transmission uses the supplied `micro.mp4`, encoded for web playback.

Run `npm ci` and `npm run dev`, then open the address printed by Vite. Run `npm run build` for a production bundle.

The rotating reveal uses a frame of the supplied video as a temporary mark. Access Transmission plays the film. Use the wheel, a vertical swipe, or the arrow keys to tune between the film and the album concept.

Set `VITE_PRESAVE_URL` in `.env.local` or in the build environment to enable the pre-save link under the disc. Use the HTTPS URL from your release provider.
