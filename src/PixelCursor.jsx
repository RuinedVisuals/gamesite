import React from 'react';
import arrow from './media/cursor-arrow.png';
import hand from './media/cursor-hand.png';

export function trackPixelCursor(root) {
  const cursors = root.querySelectorAll('.pixel-cursor');
  const lights = root.querySelectorAll('.cursor-exposure');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let x = 0;
  let y = 0;
  let lightX = 0;
  let lightY = 0;
  let frame = 0;
  let previousTime = 0;

  function draw(time) {
    frame = 0;
    const elapsed = previousTime ? Math.min(time - previousTime, 40) : 16;
    previousTime = time;
    const ease = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 23);
    lightX += (x - lightX) * ease;
    lightY += (y - lightY) * ease;
    const settled = Math.abs(x - lightX) + Math.abs(y - lightY) < .4;
    if (settled) {
      lightX = x;
      lightY = y;
    }
    cursors.forEach(cursor => { cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`; });
    lights.forEach(light => { light.style.transform = `translate3d(${lightX}px, ${lightY}px, 0) translate(-50%, -50%)`; });
    if (!settled) frame = requestAnimationFrame(draw);
  }

  function move(event) {
    if (event.pointerType === 'touch') return;
    const target = event.target;
    if (!(target instanceof Element) || !root.contains(target)) {
      hide();
      return;
    }
    x = event.clientX;
    y = event.clientY;
    if (!root.dataset.pointer) {
      lightX = x;
      lightY = y;
    }
    const interactive = target.closest('button:not(:disabled), a[href], summary, .emblem');
    const shape = interactive ? 'hand' : 'arrow';
    if (root.dataset.pointer !== shape) root.dataset.pointer = shape;
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function hide() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    delete root.dataset.pointer;
  }

  function leave(event) {
    if (!event.relatedTarget) hide();
  }

  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerout', leave);
  window.addEventListener('blur', hide);
  return () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerout', leave);
    window.removeEventListener('blur', hide);
    hide();
  };
}

export default function PixelCursor() {
  return <>
    <span className="cursor-exposure" aria-hidden="true" />
    <span className="pixel-cursor" aria-hidden="true">
      <img className="pixel-cursor-arrow" src={arrow} alt="" draggable="false" />
      <img className="pixel-cursor-hand" src={hand} alt="" draggable="false" />
    </span>
  </>;
}
