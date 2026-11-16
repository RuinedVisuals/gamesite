import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Lenis from 'lenis';
import { startSignal } from './signal';
import Disc from './Disc';
import Intro from './Intro';
import ReconstructText from './ReconstructText';
import hiddenSignal from './media/recall.mp3';
import hiddenSignalAltered from './media/recall-altered.mp3';
import transmission from './media/micro.mp4';
import interferenceFootage from './media/microbg.mp4';
import soundtrack from './media/dwdekainstru.mp3';
import emblem from './media/emblem.png';
import SessionComparison, { sessions } from './SessionComparison';
import PixelCursor, { trackPixelCursor } from './PixelCursor';
import './style.css';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const presaveUrl = import.meta.env.VITE_PRESAVE_URL?.trim();
const presaveAvailable = /^https:\/\/[^\s]+$/i.test(presaveUrl ?? '');

function App() {
  const [phase, setPhase] = useState('boot');
  const [error, setError] = useState(false);
  const [channel, setChannel] = useState('film');
  const [discAngle, setDiscAngle] = useState(0);
  const [recall, setRecall] = useState(null);
  const [retained, setRetained] = useState(false);
  const briefingActive = phase === 'playback' && channel === 'concept';
  const [interference, setInterference] = useState(false);
  const [preludeFinished, setPreludeFinished] = useState(reducedMotion);
  const [introStarted, setIntroStarted] = useState(false);
  const startScreen = phase === 'boot' && preludeFinished && !introStarted;
  const prelude = phase === 'boot' && !introStarted && !reducedMotion;
  const footage = useRef(null);
  const [soundOn, setSoundOn] = useState(false);
  const music = useRef(null);
  const musicDisabled = useRef(false);
  const grain = useRef(null);
  const cursorRoot = useRef(null);
  const intensity = useRef(1);
  const video = useRef(null);
  const audioContext = useRef(null);
  const tuningAudio = useRef(null);
  const tuningSource = useRef(null);
  const tuningRequest = useRef(0);
  const heardSignal = useRef(false);
  const archive = useRef(null);
  const briefing = useRef(null);
  const briefingScroll = useRef(null);
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

  useEffect(() => {
    const clip = footage.current;
    if (reducedMotion) return;
    if (prelude || clip.ended) clip.currentTime = 0;
    let cancelled = false;
    void clip.play().catch(() => {
      if (prelude && !cancelled) setPreludeFinished(true);
    });
    const fallback = prelude ? window.setTimeout(() => {
      if (clip.currentTime < .1) setPreludeFinished(true);
    }, 4000) : undefined;
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, [prelude]);

  function startMusic() {
    if (!musicDisabled.current) music.current.play().catch(() => {});
  }

  function startIntro() {
    startMusic();
    setIntroStarted(true);
  }

  useEffect(() => {
    if (!briefingActive) return;
    const wrapper = briefing.current;
    const smooth = new Lenis({
      wrapper,
      content: wrapper,
      autoRaf: true,
      virtualScroll: () => false,
      lerp: .14,
    });
    briefingScroll.current = smooth;
    return () => {
      smooth.destroy();
      briefingScroll.current = null;
    };
  }, [briefingActive]);

  function toggleMusic() {
    musicDisabled.current = !music.current.paused;
    if (musicDisabled.current) music.current.pause();
    else startMusic();
  }

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
    if (phase === 'starting') {
      const timeout = window.setTimeout(() => setPhase('playback'), 1550);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'closing') return;
    const timeout = window.setTimeout(() => {
      setPhase('ready');
      requestAnimationFrame(() => access.current?.focus());
    }, 2450);
    return () => clearTimeout(timeout);
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
        const context = audioContext.current;
        tuningAudio.current ??= Promise.all([hiddenSignal, hiddenSignalAltered].map(async url => {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Signal audio unavailable');
          return context.decodeAudioData(await response.arrayBuffer());
        })).catch(() => {
          tuningAudio.current = null;
          return null;
        });
      } catch {
        // The optical disc can still be inspected if audio is unavailable.
      }
    }
    video.current.play().catch(() => {});
    setPhase('starting');
  }

  function leave() {
    tuningRequest.current++;
    tuningSource.current?.stop();
    heardSignal.current = false;
    setRetained(true);
    setPhase('closing');
  }

  async function playTuningSignal(next) {
    const context = audioContext.current;
    if (musicDisabled.current || context?.state !== 'running' || !tuningAudio.current) return;
    const altered = next === 'film';
    if (altered && !heardSignal.current) return;
    const request = ++tuningRequest.current;
    const buffers = await tuningAudio.current;
    if (!buffers || request !== tuningRequest.current || musicDisabled.current) return;
    tuningSource.current?.stop();
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffers[Number(altered)];
    source.connect(gain);
    gain.connect(context.destination);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(.67, now + .10);
    gain.gain.setValueAtTime(.67, now + 1.4);
    gain.gain.linearRampToValueAtTime(0, now + 1.85);
    tuningSource.current = source;
    source.onended = () => {
      if (tuningSource.current === source) tuningSource.current = null;
      source.disconnect();
      gain.disconnect();
    };
    source.start(now, altered ? 3.8 : 2.4, 1.85);
    heardSignal.current = !altered;
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
    const smooth = briefingScroll.current;
    const target = smooth?.targetScroll ?? panel.scrollTop;
    if (channel !== 'concept' || (delta < 0 && panel.scrollTop <= 1 && target <= 1)) return false;
    const limit = panel.scrollHeight - panel.clientHeight;
    if (delta > 0 && panel.scrollTop >= limit - 1) {
      extraTurn.current += delta;
      setDiscAngle(150 + extraTurn.current);
    } else {
      scrollBriefing(target + delta);
    }
    return true;
  }

  function scrollBriefing(target) {
    if (briefingScroll.current) {
      briefingScroll.current.scrollTo(target, { immediate: reducedMotion, programmatic: false, lerp: .14 });
    } else {
      briefing.current.scrollTop = target;
    }
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
        gesture.started = event.timeStamp;
      }
      gesture.last = event.timeStamp;
      if (gesture.changed) return;
      const delta = event.deltaY * (event.deltaMode ? 36 : 1);
      if (!delta || moveBriefing(delta)) return;
      gesture.distance += Math.max(-24, Math.min(24, delta));
      if (Math.abs(gesture.distance) < 56) return;
      gesture.changed = true;
      const next = gesture.distance > 0 ? 'concept' : 'film';
      if (next !== channel && event.timeStamp - gesture.started >= 140) playTuningSignal(next);
      tune(next);
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
      if (event.key === 'Enter' && !event.repeat && startScreen) startIntro();
      else if (event.key === 'Enter' && phase === 'ready') begin();
      else return;
      event.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, channel, startScreen]);

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
    <main ref={cursorRoot} className={`crt ${phase}${retained ? ' retained' : ''}${interference && phase !== 'boot' ? ' drifting' : ''}`} aria-label="MICROCOSMOS Co. VR Systems">
      <audio ref={music} src={soundtrack} loop preload="auto" onPlay={() => setSoundOn(true)} onPause={() => setSoundOn(false)} />
      <div className="glass">
        <canvas className="signal" ref={grain} aria-hidden="true" />
        <video ref={video} className={`transmission${phase === 'playback' && channel === 'film' ? ' transmission-primary' : ''}`}
          autoPlay loop muted playsInline preload="auto" src={transmission}
          onError={() => setError(true)} aria-hidden="true" />
        <video ref={footage} className={`interference-footage${prelude ? ' footage-prelude' : interference && phase !== 'boot' ? ' footage-burst' : ''}`}
          muted playsInline preload="auto" loop src={interferenceFootage} aria-hidden="true"
          onTimeUpdate={event => {
            if (prelude && !preludeFinished && event.currentTarget.currentTime >= 3) setPreludeFinished(true);
          }}
          onError={() => setPreludeFinished(true)} />
        <div className="network-trace" aria-hidden="true" />
        {['boot', 'ready'].includes(phase) && <span className="terminal-status"><i aria-hidden="true" /><ReconstructText active>{phase === 'boot' ? 'ESTABLISHING LINK' : 'RECALL TERMINAL ONLINE'}</ReconstructText></span>}
        {startScreen && <section className="start-screen" aria-label="Start MICROCOSMOS">
          <p className="start-motto">The past is still running.</p>
          <button className="command game-start" onClick={startIntro}><span aria-hidden="true">▸</span> PRESS START</button>
          <p>ENTER ↵</p>
        </section>}
        {phase === 'boot' && introStarted && <Intro reducedMotion={reducedMotion} signal={intensity} onExit={finishIntro} onInteract={startMusic} onRecall={setRecall} />}
        {phase === 'starting' && <div className="session-closed" role="status"><ReconstructText active>Session started.</ReconstructText></div>}
        {phase === 'closing' && <div className="session-closed" role="status"><span><ReconstructText active>Session closed.</ReconstructText></span><span><ReconstructText active delay={350}>One memory was retained.</ReconstructText></span></div>}
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
          <h1 id="title"><ReconstructText active delay={240}>MICROCOSMOS</ReconstructText><span className="brand-subtitle"><ReconstructText active delay={380}>Co. VR Systems</ReconstructText></span></h1>
          <p className="premise"><ReconstructText active delay={430}>Return to a moment that still feels like home.</ReconstructText></p>
          <p className="whisper"><ReconstructText active delay={580}>Personal memory reconstruction in virtual reality.</ReconstructText></p>
          <button ref={access} className="command access" onClick={begin}><span aria-hidden="true">▸</span> <ReconstructText active delay={730}>ACCESS TRANSMISSION</ReconstructText></button>
        </section>}
        {phase === 'ready' && <button className="command rewind" onClick={() => {
          music.current.pause();
          if (music.current.readyState) music.current.currentTime = 0;
          setRecall(null);
          setPreludeFinished(reducedMotion);
          setIntroStarted(false);
          setPhase('boot');
        }}>↺ REPLAY INTRO</button>}
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
            <span className="terminal-status playback-status"><i aria-hidden="true" /> <ReconstructText active={phase === 'playback' && channel === 'film'}>CH 01 / TRANSMISSION</ReconstructText></span>
            {error && <p className="video-error" role="status">SIGNAL LOST</p>}
            <p className="transmission-motto"><ReconstructText active={phase === 'playback' && channel === 'film'} delay={360}>The past is closer than you remember.</ReconstructText></p>
            <div className="transmission-navigation">
              <p className="tune-hint"><span className="wheel-hint">SCROLL DOWN TO TUNE</span><span className="swipe-hint">SWIPE UP TO TUNE</span></p>
              <button className="command" onClick={() => tune('concept')}><ReconstructText active={phase === 'playback' && channel === 'film'} delay={160}>↓ CH 02 / SYSTEM BRIEFING</ReconstructText></button>
            </div>
          </section>
          <section ref={briefing} className="concept channel-pane" data-active={channel === 'concept'} inert={channel !== 'concept'}
            aria-labelledby="concept-title" onScroll={event => {
              const panel = event.currentTarget;
              const progress = panel.scrollTop / Math.max(1, panel.scrollHeight - panel.clientHeight);
              setDiscAngle(progress * 150 + extraTurn.current);
            }}>
            <div className="concept-copy">
            <p className="concept-label terminal-path"><ReconstructText active={briefingActive}>CH 02 / CLIENT BRIEFING</ReconstructText></p>
            <h2 id="concept-title"><ReconstructText active={briefingActive} delay={90}>Your return session.</ReconstructText></h2>
            <div className="concept-columns">
              <div>
                <h3><ReconstructText active={briefingActive} delay={160}>Session overview</ReconstructText></h3>
                <p><ReconstructText active={briefingActive} delay={220}>Select a moment from your past. The system uses fragments you can still recall to reconstruct it as a VR session.</ReconstructText></p>
                <p><ReconstructText active={briefingActive} delay={300}>When two details conflict, the system selects the one you’re most likely to recognize.</ReconstructText></p>
              </div>
              <div>
                <h3><ReconstructText active={briefingActive} delay={190}>Known effects</ReconstructText></h3>
                <p><ReconstructText active={briefingActive} delay={260}>Some clients report remembering details first encountered during a session. Repeated visits may make the reconstructed version easier to recall.</ReconstructText></p>
                <p><ReconstructText active={briefingActive} delay={340}>If you find yourself missing a place you can only remember in the headset, wait until the feeling passes before scheduling another visit.</ReconstructText></p>
              </div>
            </div>
              <SessionComparison recall={recall} active={briefingActive} />
              <div className="briefing-actions">
                <button className="command" onClick={() => tune('film')}><ReconstructText active={briefingActive} delay={410}>↑ CH 01 / TRANSMISSION</ReconstructText></button>
                <button className="command" onClick={() => scrollBriefing(discStage.current.offsetTop)}><ReconstructText active={briefingActive} delay={450}>↓ INSPECT DISC</ReconstructText></button>
              </div>
            </div>
            <div ref={discStage} className="disc-stage">
              <p className="concept-label terminal-path">CH 02 / OPTICAL MEDIA</p>
              <div className="disc-gallery">
                {briefingActive && <Disc position={discAngle} />}
                <section className="disc-index" aria-labelledby="disc-index-title">
                  <h2 id="disc-index-title">Recovered recordings</h2>
                  <ul>
                    {sessions.map(record => <li key={record.id}><span>{record.id}</span><span>{record.name}</span></li>)}
                  </ul>
                </section>
              </div>
              {presaveAvailable
                ? <a className="command presave" href={presaveUrl} target="_blank" rel="noopener noreferrer">ACCESS PRE-SAVE ↗</a>
                : <div className="presave-pending">
                    <button type="button" className="command presave" disabled>ACCESS PRE-SAVE</button>
                    <span>PRE-SAVE NOT YET OPEN</span>
                  </div>}
              <button className="command" onClick={() => scrollBriefing(0)}>↑ BACK TO BRIEFING</button>
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
      </div>
      <PixelCursor />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
