import React, { useEffect, useRef, useState } from 'react';
import { startSignal } from './signal';
import PixelCursor from './PixelCursor';

const sessions = [
  {
    id: '017', name: 'Someone at the door', category: 'FAMILY',
    cue: 'Three knocks, spaced unevenly.',
    before: 'I remember the knock. I don’t remember opening the door.',
    after: 'I opened it before the third knock. I knew who it was.',
    note: 'The client requested a repeat visit. The reconstructed visitor was retained.',
  },
  {
    id: '024', name: 'Last day of school', category: 'CHILDHOOD',
    cue: 'The bell rang while everyone was already outside.',
    before: 'I waited at the gate until the caretaker said I should go home.',
    after: 'Mum was waiting at the gate. She always came on the last day.',
    note: 'The client no longer requested the caretaker’s name.',
  },
  {
    id: '031', name: 'End of side A', category: 'MUSIC',
    cue: 'A cassette clicks between two songs.',
    before: 'There’s a gap before the next track. I used to wait for it.',
    after: 'Someone says my name in the gap. I can hear it even with the tape stopped.',
    note: 'The client identified the inserted voice as their own.',
  },
  {
    id: '046', name: 'The last summer bus', category: 'SUMMER',
    cue: 'Warm vinyl against the back of the legs.',
    before: 'I took the last bus back on my own.',
    after: 'I left the window seat free for him. He got on at the next stop.',
    note: 'The transport record was removed from the follow-up questionnaire.',
  },
  {
    id: '052', name: 'Birthday message', category: 'VOICEMAIL',
    cue: 'A saved message cut off after the birthday wish.',
    before: 'She says happy birthday, then the recording ends.',
    after: 'She calls again after midnight to tell me she’s proud of me.',
    note: 'The client supplied a date for the second call. The date was added to their record.',
  },
  {
    id: '063', name: 'Saturday sign-off', category: 'BROADCAST',
    cue: 'A television left on after the last program.',
    before: 'The picture went blue. That was when I knew it was time for bed.',
    after: 'The picture went blue and a voice said I could stay a little longer.',
    note: 'The client remained connected for fourteen minutes after the session ended.',
  },
];

const activationKeys = [' ', 'Enter'];

export default function SessionComparison() {
  const [held, setHeld] = useState(false);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const panel = useRef(null);
  const screen = useRef(null);
  const interference = useRef(.31);
  const session = sessions[selected];

  useEffect(() => {
    if (open) return startSignal(screen.current, interference, matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, [open]);

  return <>
    <button className="command archive-open" onClick={() => {
      panel.current.showModal();
      setOpen(true);
    }}>
      <span aria-hidden="true">▣</span> RECOVERED SESSION ARCHIVE <span aria-hidden="true">↗</span>
    </button>
    <dialog className="session-archive" ref={panel} aria-labelledby="archive-title" onClose={() => {
      setHeld(false);
      setOpen(false);
    }}>
      {open && <canvas className="signal archive-signal" ref={screen} aria-hidden="true" />}
      <div className="archive-ui">
      <header className="archive-titlebar">
        <h2 id="archive-title"><span aria-hidden="true">▣</span> Recovered Sessions</h2>
        <form method="dialog"><button className="archive-close" aria-label="Close archive">×</button></form>
      </header>
      <div className="archive-location"><span>MICROCOSMOS Co. VR Systems</span><span>Archive / Recovered / Client records</span></div>
      <div className="archive-body">
        <nav className="archive-index" aria-label="Recovered session files">
          {sessions.map((record, index) => (
            <button key={record.id} className="archive-file" aria-current={index === selected ? 'true' : undefined} onClick={() => {
              setSelected(index);
              setHeld(false);
            }}><span>{record.id}</span><span>{record.name}</span></button>
          ))}
        </nav>
        <article className="archive-record" aria-labelledby="record-title">
          <div className="archive-trace" aria-hidden="true">010011 001011 110010 010111 100110 001001 011110 110010 001101 010101 001110 110001 010011 001011 110010 010111 100110 001001 011110 110010 001101 010101 001110 110001</div>
          <div className="record-header">
            <p className="concept-label">SESSION {session.id} / {session.category}</p>
            <h3 id="record-title">{session.name}</h3>
            <p className="memory-cue">{session.cue}</p>
          </div>
          <div className="comparison-frame" data-reconstructed={held} aria-live="polite">
            <p className="concept-label">{held ? '02 / RECONSTRUCTED MEMORY' : '01 / SOURCE MEMORY'}</p>
            <blockquote>“{held ? session.after : session.before}”</blockquote>
            <p className="interview-result">{held ? session.note : 'Client intake transcript.'}</p>
          </div>
          <button className="command compare-hold" aria-pressed={held}
            onPointerDown={event => {
              if (event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              setHeld(true);
            }}
            onPointerUp={() => setHeld(false)}
            onPointerCancel={() => setHeld(false)}
            onLostPointerCapture={() => setHeld(false)}
            onBlur={() => setHeld(false)}
            onKeyDown={event => {
              if (!activationKeys.includes(event.key)) return;
              event.preventDefault();
              setHeld(true);
            }}
            onKeyUp={event => {
              if (!activationKeys.includes(event.key)) return;
              event.preventDefault();
              setHeld(false);
            }}>HOLD TO COMPARE</button>
        </article>
      </div>
      <div className="archive-status"><span>{sessions.length} RECOVERED FILES</span><span>READ ONLY</span></div>
      </div>
      <div className="phosphor" aria-hidden="true" />
      <div className="glass-gloss" aria-hidden="true" />
      <div className="signal-drift" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <PixelCursor />
    </dialog>
  </>;
}
