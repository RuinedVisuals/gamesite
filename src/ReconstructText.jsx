import React, { useEffect, useState } from 'react';

const symbols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/';

export default function ReconstructText({ active, delay = 0, children }) {
  const [sample, setSample] = useState(null);
  useEffect(() => {
    if (!active || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSample(null);
      return;
    }
    const started = performance.now();
    function draw() {
      const time = performance.now() - started - delay;
      const progress = Math.min(1, Math.max(0, time / 850));
      if (progress === 1) {
        setSample(null);
        return true;
      }
      const resolved = Math.floor(progress * children.length);
      setSample(Array.from(children, (character, index) => index < resolved || /[^\p{L}\p{N}]/u.test(character)
        ? character
        : symbols[Math.floor(Math.random() * symbols.length)]).join(''));
      return false;
    }
    draw();
    const timer = window.setInterval(() => {
      if (draw()) window.clearInterval(timer);
    }, 55);
    return () => window.clearInterval(timer);
  }, [active, delay, children]);
  return <span className="reconstruct-text" data-reconstructing={sample !== null}>
    <span>{children}</span>
    {sample !== null && <span className="reconstruct-sample" aria-hidden="true">{sample}</span>}
  </span>;
}
