import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { startSignal } from './signal';
import Disc from './Disc';
import Intro from './Intro';
import transmission from './media/micro.mp4';
import soundtrack from './media/dwdekainstru.mp3';
import emblem from './media/emblem.png';
import SessionComparison from './SessionComparison';
import PixelCursor, { trackPixelCursor } from './PixelCursor';
import './style.css';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const presaveUrl = import.meta.env.VITE_PRESAVE_URL?.trim();
const presaveAvailable = /^https:\/\/[^\s]+$/i.test(presaveUrl ?? '');

function App() {
  const [phase, setPhase] = useState(reducedMotion ? 'ready' : 'boot');
  const [error, setError] = useState(false);
  const [channel, setChannel] = useState('film');
  const [discAngle, setDiscAngle] = useState(0);
  const [interference, setInterference] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const music = useRef(null);
  const musicDisabled = useRef(false);
  const grain = useRef(null);
  const cursorRoot = useRef(null);
  const intensity = useRef(1);
  const video = useRef(null);
  const audioContext = useRef(null);
  const archive = useRef(null);
  const briefing = useRef(null);
  const discStage = useRef(null);
  const extraTurn = useRef(0);
  const swipe = useRef(null);
  const wheel = useRef({ last: -Infinity, distance: 0, changed: false });
  const access = useRef(null);
  const reveal = useRef(null);
  const drag = useRef(null);

  useEffect(() => startSignal(grain.current, intensity, reducedMotion), []);
  useEffect(() => trackPixelCursor(cursorRoot.current), []);
  useEffect(() => () => { audioContext.current?.close().catch(() => {}); }, []);
  useEffect(() => {
    music.current.volume = .42;
    startMusic();
  }, []);

  function startMusic() {
    if (!musicDisabled.current) music.current.play().catch(() => {});
  }

  function toggleMusic() {
    musicDisabled.current = !music.current.paused;
    if (musicDisabled.current) music.current.pause();
    else startMusic();
  }

  const setRecallLevel = useCallback(active => {
    if (music.current) music.current.volume = active ? .075 : .42;
  }, []);

  useEffect(() => {
    if (reducedMotion || phase === 'boot') return;
    let next;
    let clear;
    function schedule() {
      next = window.setTimeout(() => {
        setInterference(true);
        clear = window.setTimeout(() => {
          setInterference(false);
          schedule();
        }, 410);
      }, 4800 + Math.random() * 7000);
    }
    setInterference(false);
    schedule();
    return () => {
      window.clearTimeout(next);
      window.clearTimeout(clear);
    };
  }, [phase]);

  useEffect(() => {
    intensity.current = phase === 'boot' ? 1 : phase === 'ready' ? .66 : .54;
  }, [phase]);

  const finishIntro = useCallback(() => setPhase('ready'), []);

  useEffect(() => {
    if (phase === 'playback') archive.current.focus({ preventScroll: true });
  }, [phase]);

  function begin() {
    startMusic();
    setError(false);
    setChannel('film');
    wheel.current = { last: -Infinity, distance: 0, changed: false };
    if (window.AudioContext) {
      try {
        audioContext.current ??= new AudioContext();
        audioContext.current.resume().catch(() => {});
      } catch {
        // The optical disc can still be inspected if audio is unavailable.
      }
    }
    video.current.play().catch(() => {});
    setPhase('playback');
  }

  function leave() {
    setPhase('ready');
    requestAnimationFrame(() => access.current?.focus());
  }

  function tune(next) {
    if (next === channel) return;
    setChannel(next);
    if (next === 'concept') {
      briefing.current.scrollTop = 0;
      extraTurn.current = 0;
      setDiscAngle(0);
    }
    requestAnimationFrame(() => archive.current?.focus({ preventScroll: true }));
  }

  function moveBriefing(delta) {
    const panel = briefing.current;
    if (channel !== 'concept' || (delta < 0 && panel.scrollTop <= 1)) return false;
    const limit = panel.scrollHeight - panel.clientHeight;
    if (delta > 0 && panel.scrollTop >= limit - 1) {
      extraTurn.current += delta;
      setDiscAngle(150 + extraTurn.current);
    } else {
      panel.scrollTop += delta;
    }
    return true;
  }

  useEffect(() => {
    if (phase !== 'playback') return;
    const receiver = archive.current;
    function onWheel(event) {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      const gesture = wheel.current;
      if (event.timeStamp - gesture.last > 320) {
        gesture.distance = 0;
        gesture.changed = false;
      }
      gesture.last = event.timeStamp;
      if (gesture.changed) return;
      const delta = event.deltaY * (event.deltaMode ? 36 : 1);
      if (!delta || moveBriefing(delta)) return;
      gesture.distance += delta;
      if (Math.abs(gesture.distance) < 28) return;
      gesture.changed = true;
      tune(gesture.distance > 0 ? 'concept' : 'film');
    }
    receiver.addEventListener('wheel', onWheel, { passive: false });
    return () => receiver.removeEventListener('wheel', onWheel);
  }, [phase, channel]);

  useEffect(() => {
    function onKey(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape' && phase === 'playback') {
        leave();
        return;
      }
      if (phase === 'playback' && ['ArrowDown', 'PageDown', 'ArrowUp', 'PageUp'].includes(event.key)) {
        event.preventDefault();
        const direction = ['ArrowDown', 'PageDown'].includes(event.key) ? 1 : -1;
        const amount = event.key.startsWith('Page') ? archive.current.clientHeight * .8 : 115;
        if (!moveBriefing(direction * amount)) tune(direction > 0 ? 'concept' : 'film');
        return;
      }
      if (event.target.closest?.('button, input, video')) return;
      if (event.key === 'Enter' && phase === 'ready') begin();
      else return;
      event.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, channel]);

  function rotate(event) {
    if (!drag.current) return;
    const angle = drag.current.angle + (event.clientX - drag.current.x) * .85;
    reveal.current.style.setProperty('--angle', `${angle}deg`);
  }

  function stopRotation() {
    drag.current = null;
    reveal.current?.classList.remove('dragging');
  }

  return (
    <main ref={cursorRoot} className={`crt ${phase}${interference && phase !== 'boot' ? ' drifting' : ''}`} aria-label="MICROCOSMOS Co. VR Systems">
      <audio ref={music} src={soundtrack} loop preload="auto" onPlay={() => setSoundOn(true)} onPause={() => setSoundOn(false)} />
      <div className="glass">
        <canvas className="signal" ref={grain} aria-hidden="true" />
        <video ref={video} className={`transmission${phase === 'playback' && channel === 'film' ? ' transmission-primary' : ''}`}
          autoPlay loop muted playsInline preload="auto" src={transmission}
          onError={() => setError(true)} aria-hidden="true" />
        <div className="network-trace" aria-hidden="true" />
        {phase !== 'playback' && <span className="terminal-status"><i aria-hidden="true" />{phase === 'boot' ? 'ESTABLISHING LINK' : 'RECALL TERMINAL ONLINE'}</span>}
        {phase === 'boot' && <Intro reducedMotion={reducedMotion} signal={intensity} onExit={finishIntro} onInteract={startMusic} />}
        {phase === 'ready' && <section className="reveal" aria-labelledby="title">
          <div className="emblem" ref={reveal} aria-hidden="true"
            onPointerDown={event => {
              if (reducedMotion) return;
              const angle = Number.parseFloat(reveal.current.style.getPropertyValue('--angle')) || 0;
              drag.current = { x: event.clientX, angle };
              event.currentTarget.setPointerCapture(event.pointerId);
              reveal.current.classList.add('dragging');
            }}
            onPointerMove={rotate} onPointerUp={stopRotation} onPointerCancel={stopRotation}>
            <div className="emblem-spin">
              <img src={emblem} alt="" draggable="false" />
              <img src={emblem} alt="" draggable="false" />
            </div>
          </div>
          <h1 id="title">MICROCOSMOS <span>Co. VR Systems</span></h1>
          <p className="premise">Return to a moment that still feels like home.</p>
          <p className="whisper">Personal memory reconstruction in virtual reality.</p>
          <button ref={access} className="command access" onClick={begin}><span aria-hidden="true">▸</span> ACCESS TRANSMISSION</button>
        </section>}
        {phase === 'ready' && <button className="command rewind" onClick={() => setPhase('boot')}>↺ REPLAY INTRO</button>}
        <div ref={archive} className="channels" hidden={phase !== 'playback'} tabIndex={0} role="region" aria-label="Transmission and concept"
          onTouchStart={event => { swipe.current = event.touches.length === 1 ? event.touches[0].clientY : null; }}
          onTouchCancel={() => { swipe.current = null; }}
          onTouchEnd={event => {
            if (swipe.current === null) return;
            const distance = swipe.current - event.changedTouches[0].clientY;
            swipe.current = null;
            if (Math.abs(distance) > 45 && !moveBriefing(distance * 2)) tune(distance > 0 ? 'concept' : 'film');
          }}>
          <section className="transmission-frame channel-pane" data-active={channel === 'film'} inert={channel !== 'film'} aria-label="Company transmission">
            <span className="terminal-status playback-status"><i aria-hidden="true" /> CH 01 / TRANSMISSION</span>
            {error && <p className="video-error" role="status">SIGNAL LOST</p>}
            <button className="command descend" onClick={() => tune('concept')}>↓ CH 02 / SYSTEM BRIEFING</button>
          </section>
          <section ref={briefing} className="concept channel-pane" data-active={channel === 'concept'} inert={channel !== 'concept'}
            aria-labelledby="concept-title" onScroll={event => {
              const panel = event.currentTarget;
              const progress = panel.scrollTop / Math.max(1, panel.scrollHeight - panel.clientHeight);
              setDiscAngle(progress * 150 + extraTurn.current);
            }}>
            <div className="concept-copy">
            <p className="concept-label terminal-path">CH 02 / CLIENT BRIEFING</p>
            <h2 id="concept-title">Your return session.</h2>
            <div className="concept-columns">
              <div>
                <h3>Session overview</h3>
                <p>Select a moment from your past. The system uses fragments you can still recall to reconstruct it as a VR session.</p>
                <p>When two details conflict, the system selects the one you’re most likely to recognize.</p>
              </div>
              <div>
                <h3>Known effects</h3>
                <p>Some clients report remembering details first encountered during a session. Repeated visits may make the reconstructed version easier to recall.</p>
                <p>If you find yourself missing a place you can only remember in the headset, wait until the feeling passes before scheduling another visit.</p>
              </div>
            </div>
              <SessionComparison />
              <div className="briefing-actions">
                <button className="command" onClick={() => tune('film')}>↑ CH 01 / TRANSMISSION</button>
                <button className="command" onClick={() => discStage.current.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' })}>↓ INSPECT DISC</button>
              </div>
            </div>
            <div ref={discStage} className="disc-stage">
              <p className="concept-label terminal-path">CH 02 / OPTICAL MEDIA</p>
              {phase === 'playback' && channel === 'concept' && <Disc position={discAngle} audioContext={audioContext.current} onRecallActive={setRecallLevel} />}
              {presaveAvailable
                ? <a className="command presave" href={presaveUrl} target="_blank" rel="noopener noreferrer">ACCESS PRE-SAVE ↗</a>
                : <div className="presave-pending">
                    <button type="button" className="command presave" disabled>ACCESS PRE-SAVE</button>
                    <span>PRE-SAVE NOT YET OPEN</span>
                  </div>}
              <button className="command" onClick={() => briefing.current.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' })}>↑ BACK TO BRIEFING</button>
            </div>
          </section>
          <div key={channel} className="channel-switch" aria-hidden="true" />
          <span className="sr-only" aria-live="polite">{channel === 'film' ? 'Channel one. Transmission.' : 'Channel two. System briefing.'}</span>
        </div>
        {phase === 'playback' && <button className="command return" onClick={leave}>← RETURN</button>}
        <button className="command sound-toggle" onClick={toggleMusic} aria-label="Soundtrack" aria-pressed={soundOn}>
          <span className="sound-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          SOUND {soundOn ? 'ON' : 'OFF'}
        </button>
        {phase !== 'boot' && <img className="channel-mark" src={emblem} alt="" draggable="false" />}
        <div className="phosphor" aria-hidden="true" />
        <div className="glass-gloss" aria-hidden="true" />
        <div className="signal-drift" aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />
      </div>
      <PixelCursor />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
