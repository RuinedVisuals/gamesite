import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderer } from 'three';

const vertexShader = `
  varying vec2 screenUV;
  void main() {
    screenUV = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 screenUV;
  uniform float time;
  uniform float interference;
  uniform float grain;

  float hash(vec2 p) {
    p = fract(p * vec2(321.319, 412.495));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 p = (screenUV - .5) * 2.0;
    vec2 uv = p * (1.0 + .12 * p.yx * p.yx) * .5 + .5;
    float tick = floor(time * 17.0);
    float row = floor(uv.y * 353.0);
    float sweep = pow(.5 + .5 * sin(uv.y * 8.5 + time * 2.2), 26.0);
    float phosphorRoll = pow(.5 + .5 * sin(uv.y * 6.8 + time * 1.33), 8.0);
    float band = .5 + .5 * sin(uv.y * 17.0 - time * .56);
    float streak = hash(vec2(row, tick));
    float fragments = hash(vec2(floor(uv.x * 33.0), row + tick * .17));
    float grit = hash(floor(uv * vec2(700.0, 450.0)) + tick);
    float scan = .76 + .24 * sin(uv.y * 1550.0);
    vec3 glow = vec3(.075, .105, .54);
    glow += vec3(.01, .032, .105) * (band * .28 + sweep * .69 + grit * .34);
    glow += vec3(.009, .025, .092) * phosphorRoll * (.57 + .3 * interference);
    vec3 split = mix(vec3(.13, .15, .54), vec3(.035, .36, .65), fragments);
    split += vec3(.29, .015, .025) * step(.94, fragments);
    float tear = pow(streak, 6.0) * (.19 + sweep * .47) * (.21 + fragments * .79);
    glow = glow * (1.0 - interference * .25) + split * tear * interference;
    glow += vec3(.01, .028, .076) * grit * interference;
    float smudge = hash(floor(uv * vec2(76.0, 56.0)));
    float dust = smoothstep(.972, .997, hash(floor(uv * vec2(390.0, 293.0))));
    float residue = hash(floor(uv * vec2(32.0, 23.0)));
    glow *= .89 + smudge * .12 + residue * .055;
    glow += vec3(.085, .125, .205) * dust * (.28 + grit * .29);
    float dropout = pow(hash(vec2(row, floor(uv.x * 8.0))), 15.0);
    glow *= 1.0 - dropout * .22;
    float coarseGrit = hash(floor(uv * vec2(420.0, 285.0)) + tick);
    glow += vec3(.26, .34, .68) * (coarseGrit - .5) * grain;
    gl_FragColor = vec4(glow * scan, 1.0);
  }
`;

export function startSignal(canvas, strength, reducedMotion, grain = 0) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, powerPreference: 'low-power' });
  } catch {
    canvas.hidden = true;
    return;
  }

  const scene = new Scene();
  const camera = new OrthographicCamera();
  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    vertexShader, fragmentShader,
    uniforms: {
      time: { value: 0 },
      interference: { value: .23 },
      grain: { value: grain },
    },
  });
  const screen = new Mesh(geometry, material);
  screen.frustumCulled = false;
  scene.add(screen);

  function resize() {
    const factor = Math.min(1, 1400 / canvas.clientWidth);
    renderer.setSize(Math.max(1, canvas.clientWidth * factor), Math.max(1, canvas.clientHeight * factor), false);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  renderer.setAnimationLoop(time => {
    material.uniforms.time.value = reducedMotion ? 0 : time / 1000;
    material.uniforms.interference.value = reducedMotion ? .14 : strength.current;
    renderer.render(scene, camera);
  });

  return () => {
    observer.disconnect();
    renderer.setAnimationLoop(null);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}
