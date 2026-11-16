import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import PixelCursor, { trackPixelCursor } from './PixelCursor';
import emblem from './media/emblem.png';
import interferenceFootage from './media/microbg.mp4';
import originalMemory from './media/session-original.jpg';
import reconstructedMemory from './media/session-reconstruction.jpg';
import { startSignal } from './signal';
import './style.css';
import './tunnel.css';

const depth = 5.8;
const ringCount = 18;
const destination = 54;
const exitThreshold = destination - .5;
const exitVisibleFrom = 39;
const signalStrength = { current: .32 };
const wrap = (value, length) => ((value % length) + length) % length;
const messages = [
  'Follow the sound.',
  'Three knocks. An uneven pause.',
  'You remember standing on this side.',
  'Then why is the sound behind you?',
];

function createGrid() {
  const lines = [];
  const halfWidth = 5.6;
  const halfHeight = 3.6;
  for (let column = 0; column <= 6; column++) {
    const x = -halfWidth + column * halfWidth / 3;
    for (const y of [-halfHeight, halfHeight]) lines.push(x, y, 0, x, y, -depth);
  }
  for (let row = 1; row < 4; row++) {
    const y = -halfHeight + row * halfHeight / 2;
    for (const x of [-halfWidth, halfWidth]) lines.push(x, y, 0, x, y, -depth);
  }
  for (let row = 0; row <= 2; row++) {
    const z = -row * depth / 3;
    for (const y of [-halfHeight, halfHeight]) lines.push(-halfWidth, y, z, halfWidth, y, z);
    for (const x of [-halfWidth, halfWidth]) lines.push(x, -halfHeight, z, x, halfHeight, z);
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
}

const memoryPath = import.meta.env.BASE_URL + 'memory/017/';

export default function Tunnel(props) {
  const [insideMemory, setInsideMemory] = useState(location.pathname === memoryPath);
  const [emerging, setEmerging] = useState(false);
  const [returning, setReturning] = useState(false);
  const returnPath = useRef(insideMemory ? import.meta.env.BASE_URL + 'tunnel/' : location.href);
  const previousTitle = useRef(insideMemory ? 'Memory Tunnel — MICROCOSMOS Co.' : document.title);
  useEffect(() => {
    if (!props.onClose) return;
    return () => {
      if (location.pathname === memoryPath) {
        history.replaceState(history.state, '', returnPath.current);
        document.title = previousTitle.current;
      }
    };
  }, []);

  function changePage(open) {
    history.replaceState(history.state, '', open ? memoryPath : returnPath.current);
    document.title = open ? 'Session 017 — MICROCOSMOS Co.' : previousTitle.current;
    setEmerging(open && !matchMedia('(prefers-reduced-motion: reduce)').matches);
    setReturning(!open);
    setInsideMemory(open);
  }

  return insideMemory
    ? <MemoryPage {...props} emerging={emerging} onBack={() => changePage(false)} />
    : <TunnelScene {...props} returning={returning} onArrival={() => changePage(true)} />;
}

function MemoryPage({ onBack, soundOn, onToggleSound, emerging }) {
  const host = useRef(null);
  const touchStart = useRef(null);
  const [doorOpen, setDoorOpen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  useEffect(() => trackPixelCursor(host.current), []);
  useEffect(() => {
    const page = host.current;
    let reverseDistance = 0;
    function reverse(event) {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      reverseDistance = Math.max(0, reverseDistance - event.deltaY * (event.deltaMode ? 28 : 1));
      if (reverseDistance >= 48) onBack();
    }
    page.addEventListener('wheel', reverse, { passive: true });
    return () => page.removeEventListener('wheel', reverse);
  }, [onBack]);

  return (
    <section ref={host} className="crt tunnel memory-page" aria-label="Recovered memory 017"
      onTouchStart={event => { touchStart.current = event.touches.length === 1 ? event.touches[0].clientY : null; }}
      onTouchEnd={event => {
        if (touchStart.current !== null && event.changedTouches[0].clientY - touchStart.current > 48) onBack();
        touchStart.current = null;
      }}>
      {doorOpen && <img className="memory-room" alt={showSource
        ? 'Dim kitchen with one glass of milk on the table'
        : 'The same kitchen, with a second glass beside the first'}
        src={showSource ? originalMemory : reconstructedMemory} />}
      <button className="command tunnel-return" onClick={onBack} autoFocus>← BACK TO TUNNEL</button>
      <img className="channel-mark" src={emblem} alt="" />
      <header className="memory-heading">
        <p className="concept-label">RECOVERED SESSION 017</p>
        <h1>Someone at the door</h1>
      </header>
      {!doorOpen && <button className="memory-door" onClick={() => setDoorOpen(true)}>
        <span className="command">OPEN THE DOOR</span>
      </button>}
      {doorOpen && <button className="command memory-compare" aria-pressed={showSource}
        onClick={() => setShowSource(!showSource)}>SOURCE RECORD</button>}
      {onToggleSound && <button className="command sound-toggle tunnel-sound" aria-label="Soundtrack"
        aria-pressed={soundOn} onClick={onToggleSound}>SOUND {soundOn ? 'ON' : 'OFF'}</button>}
      <div className="phosphor" aria-hidden="true" />
      <div className="glass-gloss" aria-hidden="true" />
      {emerging && <div className="memory-exposure" aria-hidden="true" />}
      <PixelCursor />
    </section>
  );
}

function TunnelScene({ onClose, soundOn, onToggleSound, onArrival, returning }) {
  const host = useRef(null);
  const canvas = useRef(null);
  const grain = useRef(null);
  const footage = useRef(null);
  const goal = useRef(returning ? destination - 8 : 0);
  const drag = useRef(null);
  const messagesLayer = useRef(null);
  const exitLight = useRef(null);

  function travel(amount) {
    goal.current = THREE.MathUtils.clamp(goal.current + amount, 0, destination);
  }

  useEffect(() => trackPixelCursor(host.current), []);
  useEffect(() => startSignal(grain.current, signalStrength, matchMedia('(prefers-reduced-motion: reduce)').matches, .85), []);

  useEffect(() => {
    const element = canvas.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: element, antialias: true, powerPreference: 'low-power' });
    } catch {
      element.classList.add('tunnel-scene-unavailable');
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#091238');
    scene.fog = new THREE.FogExp2('#091238', .035);
    const camera = new THREE.PerspectiveCamera(64, 1, .08, 116);
    renderer?.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    const grid = createGrid();
    const gridMaterial = new THREE.LineBasicMaterial({ color: '#516fe4', transparent: true, opacity: .68 });
    const plane = new THREE.PlaneGeometry(4.9, 2.76);
    const backing = new THREE.PlaneGeometry(5.03, 2.89);
    const edge = new THREE.MeshBasicMaterial({ color: '#89a6f6', transparent: true, opacity: .54 });
    const texture = new THREE.VideoTexture(footage.current);
    texture.colorSpace = THREE.SRGBColorSpace;
    const panelMaterial = new THREE.MeshBasicMaterial({ color: '#b5caff', map: texture });

    const segments = Array.from({ length: ringCount }, () => {
      const group = new THREE.Group();
      group.add(new THREE.LineSegments(grid, gridMaterial));
      const card = new THREE.Mesh(plane, panelMaterial);
      const outline = new THREE.Mesh(backing, edge);
      outline.position.z = -.018;
      card.add(outline);
      group.add(card);
      scene.add(group);
      return { group, card, index: null };
    });

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let position = returning ? exitThreshold - .1 : 0;
    let frame;
    let previousTime = 0;
    const captions = [...messagesLayer.current.children];

    const resize = new ResizeObserver(() => {
      const { clientWidth: width, clientHeight: height } = element;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.fov = width < 700 ? 76 : 64;
      camera.updateProjectionMatrix();
      renderer?.setSize(width, height, false);
    });
    resize.observe(element);
    function draw(time) {
      const elapsed = previousTime ? Math.min(50, time - previousTime) : 16;
      previousTime = time;
      position = reducedMotion.matches ? goal.current : THREE.MathUtils.damp(position, goal.current, 7, elapsed / 1000);
      const approach = THREE.MathUtils.clamp((position - exitVisibleFrom) / (exitThreshold - exitVisibleFrom), 0, 1);
      if (!reducedMotion.matches) {
        exitLight.current.style.opacity = Math.min(1, approach * 4);
        exitLight.current.style.scale = .007 + .993 * Math.pow(approach, 3.5);
      }
      captions.forEach((caption, index) => {
        const distance = 9 + index * 12 - position;
        const scale = 2.8 / Math.max(distance, 1.25);
        const opacity = Math.min(1, (19 - distance) / 5, (distance - 1.25) / 2);
        caption.style.opacity = Math.max(0, opacity);
        caption.style.transform = `scale(${scale})`;
      });
      const base = Math.floor(position / depth);
      const offset = position - base * depth;
      segments.forEach((segment, slot) => {
        const index = base + slot - 2;
        segment.group.position.z = offset - (slot - 2) * depth - 2.1;
        if (segment.index === index) return;
        segment.index = index;
        const side = wrap(index, 5);
        segment.card.position.set(side === 0 || side === 2 ? -5.57 : side === 3 ? -2.35 : side === 4 ? 2.35 : 5.57,
          side === 3 ? -3.56 : side === 4 ? 3.56 : side === 2 ? 1.05 : -.62, -depth * .5);
        segment.card.rotation.set(side === 3 ? -Math.PI / 2 : side === 4 ? Math.PI / 2 : 0,
          side === 0 || side === 2 ? Math.PI / 2 : side === 1 ? -Math.PI / 2 : 0, 0);
      });
      if (position >= exitThreshold) {
        onArrival();
        return;
      }
      renderer?.render(scene, camera);
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);

    function wheel(event) {
      if (event.ctrlKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      travel(THREE.MathUtils.clamp(event.deltaY * (event.deltaMode ? 28 : 1) * .018, -3.5, 3.5));
    }
    function key(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const direction = { ArrowUp: -1, PageUp: -1, w: 1, ArrowDown: 1, PageDown: 1, s: -1 }[event.key];
      if (!direction) return;
      event.preventDefault();
      travel(direction * depth);
    }
    const root = host.current;
    root.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', key);
    return () => {
      root.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', key);
      resize.disconnect();
      cancelAnimationFrame(frame);
      [texture, panelMaterial, grid, plane, backing, gridMaterial, edge].forEach(resource => resource.dispose());
      renderer?.dispose();
    };
  }, []);

  return (
    <section ref={host} className="crt tunnel" aria-label="MICROCOSMOS Memory Tunnel">
      <canvas ref={canvas} className="tunnel-scene" aria-hidden="true"
        onPointerDown={event => {
          if (event.button !== 0) return;
          drag.current = { id: event.pointerId, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          if (drag.current?.id !== event.pointerId) return;
          travel((drag.current.y - event.clientY) * .055);
          drag.current.y = event.clientY;
        }}
        onLostPointerCapture={() => { drag.current = null; }} />
      <canvas ref={grain} className="signal tunnel-grain" aria-hidden="true" />
      <video ref={footage} className="interference-footage tunnel-footage" src={interferenceFootage}
        autoPlay muted loop playsInline aria-hidden="true" />
      {onClose
        ? <button className="command tunnel-return" onClick={onClose} autoFocus>← EXIT TUNNEL</button>
        : <a className="command tunnel-return" href={import.meta.env.BASE_URL}>← RETURN TO MICROCOSMOS Co.</a>}
      <img className="channel-mark" src={emblem} alt="" draggable="false" />
      <div className="tunnel-title">
        <p className="concept-label"><i aria-hidden="true" /> RECOVERED VISUAL ARCHIVE</p>
        <h1>Memory Tunnel</h1>
        <p className="tunnel-company">MICROCOSMOS Co. · Memory Restore VR Systems</p>
      </div>
      <div className="tunnel-messages" ref={messagesLayer} aria-hidden="true">
        {messages.map(message => <p key={message}>{message}</p>)}
      </div>
      <div className="tunnel-exit-light" ref={exitLight} aria-hidden="true" />
      {onToggleSound && <button className="command sound-toggle tunnel-sound" aria-label="Soundtrack"
        aria-pressed={soundOn} onClick={onToggleSound}>SOUND {soundOn ? 'ON' : 'OFF'}</button>}
      <div className="tunnel-controls">
        <div>
          <button className="command" aria-label="Travel back" onClick={() => travel(-depth)}>↑</button>
          <button className="command" aria-label="Travel forward" onClick={() => travel(depth)}>↓</button>
        </div>
        <span>SCROLL OR DRAG TO GO DEEPER</span>
      </div>
      <div className="phosphor" aria-hidden="true" />
      <div className="glass-gloss" aria-hidden="true" />
      <PixelCursor />
    </section>
  );
}
