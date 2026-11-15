import React, { useEffect, useRef, useState } from 'react';
import ReconstructText from './ReconstructText';

const scenes = [
  {
    first: 'Is this a dream…',
    second: '…or is it real?',
    timing: [1100, 4600, 8450],
    transfer: ['READING SOURCE MEMORY', 'RECONSTRUCTING MISSING DATA'],
  },
  {
    first: 'You can go back.',
    second: 'What will you remember when you return?',
    timing: [650, 2900, 7900],
    transfer: ['SOURCE RECORD VERIFIED', 'OPENING RECALL TERMINAL'],
  },
];
const recallOptions = ['A voice', 'A song', 'A sound'];

const codeColumns = Array.from({ length: 20 }, (_, column) =>
  Array.from({ length: 54 }, (_, row) => ((row * 1597 + column * 371 + row * column * 47) % 65536)
    .toString(16).toUpperCase().padStart(4, '0')).join('\n'));

export default function Intro({ reducedMotion, signal, onExit, onInteract, onRecall }) {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [transferring, setTransferring] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const locked = useRef(false);
  const scene = scenes[step];
  const [firstAt, secondAt, readyAt] = scene.timing;
  const finished = reducedMotion || elapsed >= readyAt;
  const first = reducedMotion ? scene.first : scene.first.slice(0, Math.max(0, Math.floor((elapsed - firstAt) / 104)));
  const second = reducedMotion ? scene.second : scene.second.slice(0, Math.max(0, Math.floor((elapsed - secondAt) / 104)));

  useEffect(() => {
    if (reducedMotion || transferring || choosing) return;
    const started = performance.now();
    const timer = window.setInterval(() => {
      const time = performance.now() - started;
      setElapsed(Math.min(time, readyAt));
      if (time >= readyAt) window.clearInterval(timer);
    }, 45);
    return () => window.clearInterval(timer);
  }, [step, readyAt, transferring, choosing, reducedMotion]);

  useEffect(() => {
    if (!transferring) return;
    signal.current = 1.45;
    const timer = window.setTimeout(() => {
      if (step === scenes.length - 1) {
        onExit();
        return;
      }
      setChoosing(true);
      setTransferring(false);
    }, reducedMotion ? 0 : 1500);
    return () => {
      window.clearTimeout(timer);
      signal.current = 1;
    };
  }, [transferring, step, reducedMotion, signal, onExit]);

  function advance() {
    if (!finished || locked.current) return;
    locked.current = true;
    onInteract();
    setTransferring(true);
  }

  useEffect(() => {
    function onKey(event) {
      if (event.key !== 'Enter' || event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
          event.target.closest?.('button, input, a')) return;
      if (!finished) return;
      event.preventDefault();
      advance();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished, onInteract]);

  return <>
    <div className="intro-shell">
      {choosing ? <section className="recall-test" aria-labelledby="recall-question">
        <p className="concept-label"><ReconstructText active>RECALL TEST / SELECT FIRST IMPRESSION</ReconstructText></p>
        <h2 id="recall-question"><ReconstructText active delay={120}>What do you remember first?</ReconstructText></h2>
        <div>
          {recallOptions.map(option => <button key={option} className="command recall-option" onClick={() => {
            onRecall(option);
            setElapsed(0);
            setStep(1);
            setChoosing(false);
            locked.current = false;
          }}><ReconstructText active delay={200}>{option}</ReconstructText></button>)}
        </div>
      </section> : transferring ? <div className="intro-transfer" aria-label={scene.transfer[1]}>
        <div className="matrix-stream" aria-hidden="true">
          {codeColumns.map((code, column) => <span key={column} style={{ '--column-delay': `-${column * .12}s` }}>{code}</span>)}
        </div>
        <div className="transfer-log">{scene.transfer.map(line => <span key={line}>{line}</span>)}</div>
      </div> : <>
        <div className="intro" aria-hidden="true">{first}{second ? '\n\n' + second : ''}{first && <i />}</div>
        <p className="sr-only">{scene.first} {scene.second}</p>
        {finished && <button className="command intro-enter" onClick={advance}>PRESS ENTER ↵</button>}
      </>}
    </div>
    <button className="skip command" onClick={() => { onInteract(); onExit(); }}>SKIP INTRO ↵</button>
  </>;
}
