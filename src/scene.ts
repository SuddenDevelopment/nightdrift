import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';

/**
 * Probe for a WebGL 2 context before constructing a renderer. three.js
 * removed WebGL 1 support in r163, so an unavailable context is fatal and must
 * be detected before `new WebGLRenderer()` throws.
 */
export function webgl2Available(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export interface SceneStats {
  frames: number;
  drawCalls: number;
  geometries: number;
  textures: number;
}

export interface SceneHandle {
  readonly canvas: HTMLCanvasElement;
  render(): void;
  resize(): void;
  stats(): SceneStats;
  dispose(): void;
}

export interface SceneOptions {
  onContextLost: () => void;
}

export function createScene(host: HTMLElement, { onContextLost }: SceneOptions): SceneHandle {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));

  const canvas = renderer.domElement;
  canvas.id = 'scene';
  // The Factory capture clicks this once it reports readiness; until then it
  // must not claim to be ready.
  canvas.dataset.ready = 'false';
  host.append(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(60, 1, 0.1, 2000);
  camera.position.set(0, 2, 0);

  let frames = 0;

  const handleContextLost = (event: Event) => {
    // Without preventDefault the browser will not attempt restoration, and
    // three.js would keep issuing calls against a dead context.
    event.preventDefault();
    onContextLost();
  };
  canvas.addEventListener('webglcontextlost', handleContextLost, false);

  function resize(): void {
    const width = host.clientWidth || globalThis.innerWidth;
    const height = host.clientHeight || globalThis.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }
  resize();

  return {
    canvas,
    render() {
      renderer.render(scene, camera);
      frames += 1;
    },
    resize,
    stats: () => ({
      frames,
      drawCalls: renderer.info.render.calls,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    }),
    dispose() {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      // The empty scene owns nothing yet; later checkpoints dispose their own
      // geometries, materials and textures here before the renderer goes.
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
