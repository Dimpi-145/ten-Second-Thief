import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { idleStep } from '../game/simulation.js';
import { actions, useStore } from '../game/store.js';
import { createWorld } from '../game/world.js';
import { WORLDS } from '../game/worlds.js';
import { LevelContent } from './GameScene.jsx';

let thumb = null; // reusable 2D canvas for preview snapshots

// Draws the just-rendered WebGL frame into a small JPEG (centre-cropped to 16:9).
function snapshot(gl) {
  const src = gl.domElement;
  if (!thumb) {
    thumb = document.createElement('canvas');
    thumb.width = 480;
    thumb.height = 270;
  }
  const ratio = thumb.width / thumb.height;
  let sw = src.width;
  let sh = src.height;
  if (sw / sh > ratio) sw = sh * ratio;
  else sh = sw / ratio;
  const ctx = thumb.getContext('2d');
  ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL('image/jpeg', 0.82);
}

// A live, unplayed level slowly orbited by the camera: used behind the world-select,
// level-select and briefing screens, and to bake the preview thumbnails on the cards.
function Diorama({ worldIndex, levelIndex, capture, shift = false }) {
  const world = useMemo(() => createWorld(worldIndex, levelIndex), [worldIndex, levelIndex]);
  const frames = useRef(0);
  const angle = useRef(0.55);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    idleStep(world, dt);
    const { camera, size, gl, scene } = state;
    const portrait = size.width / size.height < 1;
    const span = Math.max(world.width, world.depth);
    const r = span * (portrait ? 1.05 : 0.7) + 5;
    if (!capture) angle.current += dt * 0.11;
    const a = angle.current;
    if (camera.fov !== 46) {
      camera.fov = 46;
      camera.updateProjectionMatrix();
    }
    // slide the picture to the right when a menu panel covers the left of the screen
    const offset = shift && !portrait ? Math.round(size.width * 0.17) : 0;
    const current = camera.view && camera.view.enabled ? -camera.view.offsetX : 0;
    if (current !== offset) {
      if (offset) camera.setViewOffset(size.width, size.height, -offset, 0, size.width, size.height);
      else camera.clearViewOffset();
    }
    camera.position.set(Math.sin(a) * r, r * 0.62, Math.cos(a) * r);
    camera.lookAt(0, 0.5, 0);

    if (capture && ++frames.current === 4) {
      // render synchronously so the drawing buffer is valid when we copy it
      gl.render(scene, camera);
      let url = '';
      try {
        url = snapshot(gl);
      } catch {
        url = 'none';
      }
      actions.setPreview(capture, url);
    }
  });

  return <LevelContent world={world} />;
}

// Background for the world-select screen. First visit: quickly visits each world once to bake
// its card thumbnail, then shows whichever world the player is hovering.
export function WorldSelectScene() {
  const hover = useStore((s) => s.hoverWorld);
  const previews = useStore((s) => s.previews);
  const pending = WORLDS.findIndex((w) => !previews[w.id]);
  const index = pending >= 0 ? pending : hover;
  return (
    <Diorama
      key={`${index}-${pending >= 0}`}
      worldIndex={index}
      levelIndex={0}
      capture={pending >= 0 ? WORLDS[index].id : null}
    />
  );
}

// Background for the level-select and briefing screens: the selected level itself.
export function LevelPreviewScene() {
  const worldIndex = useStore((s) => s.world);
  const level = useStore((s) => s.level);
  return <Diorama key={`${worldIndex}-${level}`} worldIndex={worldIndex} levelIndex={level} shift />;
}
