import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime } from '../game/runtime.js';

// Camera views. dist/pitch/fov describe the orbit; stiff = how tightly the camera tracks.
export const VIEWS = {
  follow: { dist: 13, pitch: 0.92, fov: 50, stiff: 6, look: 0.9 },
  cinematic: { dist: 7.2, pitch: 0.7, fov: 40, stiff: 3.2, look: 1.1 },
  wide: { dist: 23, pitch: 1.2, fov: 52, stiff: 5, look: 0.4 },
  first: { dist: 0, pitch: 0, fov: 74, stiff: 22, look: 1.5 },
};

const target = new THREE.Vector3();
const desired = new THREE.Vector3();
const desiredLook = new THREE.Vector3();

// Player camera with four views. Drag to orbit / look, wheel to zoom; switching views eases smoothly.
export function CameraRig({ world }) {
  const gl = useThree((s) => s.gl);
  const look = useRef(new THREE.Vector3());
  const first = useRef(true);
  const lastMode = useRef(runtime.cam.mode);

  useEffect(() => {
    const el = gl.domElement;
    const cam = runtime.cam;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const move = (e) => {
      if (!dragging) return;
      cam.yaw -= (e.clientX - lastX) * 0.006;
      cam.tilt = Math.max(-0.4, Math.min(0.4, cam.tilt + (e.clientY - lastY) * 0.004));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = () => {
      dragging = false;
    };
    const wheel = (e) => {
      cam.zoom = Math.max(0.65, Math.min(1.6, cam.zoom + e.deltaY * 0.0008));
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const { camera, size } = state;
    const cam = runtime.cam;
    const p = world.player;
    const view = VIEWS[cam.mode] || VIEWS.follow;
    const fp = cam.mode === 'first';

    if (camera.view && camera.view.enabled) camera.clearViewOffset();

    if (cam.mode !== lastMode.current) {
      // entering first person: look where the thief is facing; leaving it: back to north-up
      if (fp) cam.yaw = p.angle + Math.PI;
      else if (lastMode.current === 'first') cam.yaw = 0;
      cam.tilt = 0;
      lastMode.current = cam.mode;
    }

    if (fp) {
      const fx = -Math.sin(cam.yaw);
      const fz = -Math.cos(cam.yaw);
      desired.set(p.x + fx * 0.15, 1.5 + p.y, p.z + fz * 0.15);
      desiredLook.set(p.x + fx * 8, 1.5 + p.y - cam.tilt * 8 - 0.6, p.z + fz * 8);
    } else {
      // Pull back on narrow (portrait) screens so the room stays readable.
      const aspect = size.width / size.height;
      const dist = view.dist * cam.zoom * (aspect < 1 ? 1.45 : aspect < 1.4 ? 1.15 : 1);
      const pitch = Math.max(0.4, Math.min(1.4, view.pitch + cam.tilt));
      const cp = Math.cos(pitch);
      target.set(p.x, view.look + p.y * 0.6, p.z);
      desired.set(
        target.x + Math.sin(cam.yaw) * cp * dist,
        target.y + Math.sin(pitch) * dist,
        target.z + Math.cos(cam.yaw) * cp * dist,
      );
      desiredLook.copy(target);
    }

    if (first.current) {
      // Start high above the room and swoop down during the level intro.
      first.current = false;
      camera.position.set(desired.x, desired.y + 9, desired.z + 5);
      look.current.copy(desiredLook);
    }

    // While a view switch is blending, ease gently; afterwards use the view's own stiffness.
    if (cam.blend > 0) cam.blend -= dt;
    const stiff = cam.blend > 0 ? 4.5 : view.stiff;
    camera.position.lerp(desired, 1 - Math.exp(-dt * stiff));
    look.current.lerp(desiredLook, 1 - Math.exp(-dt * (cam.blend > 0 ? 5 : Math.max(9, view.stiff))));

    if (Math.abs(camera.fov - view.fov) > 0.05) {
      camera.fov += (view.fov - camera.fov) * (1 - Math.exp(-dt * 4));
      camera.updateProjectionMatrix();
    }

    if (runtime.shake > 0.001) {
      const s = runtime.shake * (fp ? 0.35 : 1);
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
      camera.position.z += (Math.random() - 0.5) * s;
      runtime.shake *= Math.exp(-dt * 7);
    } else runtime.shake = 0;

    camera.lookAt(look.current);
  });

  return null;
}
