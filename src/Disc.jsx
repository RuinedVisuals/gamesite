import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import emblem from './media/emblem.png';

const vertexShader = `
  varying vec2 discPoint;
  void main() {
    discPoint = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D mark;
  uniform vec2 tilt;
  uniform float back;
  varying vec2 discPoint;
  void main() {
    vec2 p = discPoint;
    float r = length(p);
    float a = atan(p.y, p.x);
    float beam = pow(.5 + .5 * cos(2.0 * a - 3.0 * tilt.x + tilt.y + .55 * r), 10.0);
    float spread = pow(.5 + .5 * cos(2.0 * a - 3.0 * tilt.x + tilt.y), 2.5);
    vec3 spectrum = .54 + .46 * cos(12.0 * r + 6.0 * a + 5.0 * tilt.y + vec3(0.0, 2.1, 4.2));
    vec3 metal = vec3(.10, .16, .25) + spread * vec3(.18, .25, .34);
    metal += beam * (.28 + .65 * spectrum) * (.57 + .43 * back);
    metal += (.5 + .5 * cos(r * 970.0)) * .027;
    float hub = 1.0 - smoothstep(.28, .29, r);
    metal = mix(metal, vec3(.23, .37, .53) + spread * .24, hub);
    metal += (1.0 - smoothstep(.0, .013, abs(r - .286))) * .31;
    metal += smoothstep(.98, .998, r) * vec3(.49, .65, .79);
    vec2 logoUV = (p - vec2(0.0, .53)) / vec2(.57, .57) + .5;
    if (back < .5 && all(greaterThanEqual(logoUV, vec2(0.0))) && all(lessThanEqual(logoUV, vec2(1.0)))) {
      vec4 logo = texture2D(mark, logoUV);
      metal = mix(metal, logo.rgb * .87 + .12, logo.a * .94);
    }
    gl_FragColor = vec4(metal, 1.0);
  }
`;

export default function Disc({ position }) {
  const canvas = useRef(null);
  const angle = useRef(position);
  const [available, setAvailable] = useState(true);
  useEffect(() => { angle.current = position; }, [position]);

  useEffect(() => {
    const element = canvas.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: element, alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      setAvailable(false);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 20);
    camera.position.z = 4.35;
    const disc = new THREE.Group();
    scene.add(disc);
    const texture = new THREE.TextureLoader().load(emblem);
    const geometry = new THREE.RingGeometry(.128, 1, 128);
    const tilt = new THREE.Vector2();
    const materials = [0, 1].map(back => new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { mark: { value: texture }, tilt: { value: tilt }, back: { value: back } },
    }));

    materials.forEach((material, index) => {
      const face = new THREE.Mesh(geometry, material);
      face.position.z = index ? -.018 : .018;
      if (index) face.rotation.y = Math.PI;
      disc.add(face);
    });
    const edge = new THREE.MeshBasicMaterial({ color: '#7b9dc6', side: THREE.DoubleSide });
    const rims = [1, .128].map(radius => {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, .036, 128, 1, true), edge);
      rim.rotation.x = Math.PI / 2;
      disc.add(rim);
      return rim;
    });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer = new ResizeObserver(() => {
      const { clientWidth: width, clientHeight: height } = element;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    observer.observe(element);
    renderer.setAnimationLoop(() => {
      if (!element.clientWidth) return;
      const phase = angle.current * .007;
      const yaw = -.48 + phase;
      const pitch = .30 + Math.sin(phase * .57) * .54;
      disc.rotation.y = reduced ? yaw : THREE.MathUtils.lerp(disc.rotation.y, yaw, .14);
      disc.rotation.x = reduced ? pitch : THREE.MathUtils.lerp(disc.rotation.x, pitch, .14);
      disc.rotation.z = -.19;
      tilt.set(disc.rotation.x, disc.rotation.y);
      renderer.render(scene, camera);

    });

    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      geometry.dispose();
      rims.forEach(rim => rim.geometry.dispose());
      materials.forEach(material => material.dispose());
      edge.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, []);

  return available
    ? <canvas ref={canvas} className="disc-model" role="img" aria-label="Iridescent optical disc with the MICROCOSMOS logo" />
    : <div className="disc-fallback" role="img" aria-label="MICROCOSMOS optical disc"><img src={emblem} alt="" /></div>;
}