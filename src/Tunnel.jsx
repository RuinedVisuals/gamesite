import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import PixelCursor, { trackPixelCursor } from './PixelCursor';
import emblem from './media/emblem.png';
import interferenceFootage from './media/microbg.mp4';
import { startSignal } from './signal';
import './style.css';
import './tunnel.css';

const depth = 5.8;
const ringCount = 18;
const cruiseSpeed = 2.6;
const signalStrength = { current: .32 };
const wrap = (value, length) => ((value % length) + length) % length;

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

function Tunnel() {
  const host = useRef(null);
  const canvas = useRef(null);
  const grain = useRef(null);
  const footage = useRef(null);
  const goal = useRef(0);
  const direction = useRef(1);
  const drag = useRef(null);
  const [fragment, setFragment] = useState(0);
  const [available, setAvailable] = useState(true);

  function travel(amount) {
    goal.current += amount;
  }

  useEffect(() => trackPixelCursor(host.current), []);
  useEffect(() => startSignal(grain.current, signalStrength, matchMedia('(prefers-reduced-motion: reduce)').matches, .85), []);

  useEffect(() => {
    const element = canvas.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: element, antialias: true, powerPreference: 'low-power' });
    } catch {
      setAvailable(false);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#091238');
    scene.fog = new THREE.FogExp2('#091238', .035);
    const camera = new THREE.PerspectiveCamera(64, 1, .08, 116);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
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
    let position = 0;
    let visibleFragment = -1;
    let previousTime = 0;

    const resize = new ResizeObserver(() => {
      const { clientWidth: width, clientHeight: height } = element;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.fov = width < 700 ? 76 : 64;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    resize.observe(element);
    renderer.setAnimationLoop(time => {
      const elapsed = previousTime ? Math.min(50, time - previousTime) : 16;
      previousTime = time;
      if (!reducedMotion.matches && !drag.current) {
        goal.current += direction.current * cruiseSpeed * elapsed / 1000;
      }
      position = reducedMotion.matches ? goal.current : THREE.MathUtils.damp(position, goal.current, 7, elapsed / 1000);
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
      const nextFragment = wrap(Math.round(position / depth), ringCount);
      if (nextFragment !== visibleFragment) {
        visibleFragment = nextFragment;
        setFragment(nextFragment);
      }
      renderer.render(scene, camera);
    });

    function wheel(event) {
      if (event.ctrlKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      direction.current = Math.sign(event.deltaY);
      travel(Math.max(-9, Math.min(9, event.deltaY * (event.deltaMode ? 28 : 1) * .027)));
    }
    function key(event) {
      if (event.target.closest?.('button, a') || event.altKey || event.ctrlKey || event.metaKey) return;
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
      renderer.setAnimationLoop(null);
      [texture, panelMaterial, grid, plane, backing, gridMaterial, edge].forEach(resource => resource.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <main ref={host} className="crt tunnel" aria-label="MICROCOSMOS Memory Tunnel">
      <canvas ref={canvas} className="tunnel-scene" aria-hidden="true"
        onPointerDown={event => {
          if (!available || event.button !== 0) return;
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
      <a className="command tunnel-return" href={import.meta.env.BASE_URL}>← RETURN TO MICROCOSMOS Co.</a>
      <img className="channel-mark" src={emblem} alt="" draggable="false" />
      <div className="tunnel-title">
        <p className="concept-label"><i aria-hidden="true" /> RECOVERED VISUAL ARCHIVE</p>
        <h1>Memory Tunnel</h1>
        <p className="tunnel-company">MICROCOSMOS Co. · Memory Restore VR Systems</p>
      </div>
      {available && <div className="tunnel-controls">
        <span>FRAGMENT {String(fragment + 1).padStart(2, '0')}</span>
        <div>
          <button className="command" aria-label="Travel back" onClick={() => travel(-depth)}>↑</button>
          <button className="command" aria-label="Travel forward" onClick={() => travel(depth)}>↓</button>
        </div>
        <span>SCROLL OR DRAG TO TRAVEL</span>
      </div>}
      <div className="phosphor" aria-hidden="true" />
      <div className="glass-gloss" aria-hidden="true" />
      <PixelCursor />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<Tunnel />);
