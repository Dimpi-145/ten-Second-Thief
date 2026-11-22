import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime } from '../../game/runtime.js';
import { TILE, VOID, cellType } from '../../game/world.js';
import { getFloorTexture, getWindowTexture } from '../../game/textures.js';
import { Backdrop } from './Backdrop.jsx';
import { std } from './materials.js';
import { PROPS } from './props.jsx';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const trimMat = new THREE.MeshBasicMaterial({ toneMapped: false });

// ---- Walls: one instanced mesh for the blocks, one for the neon trims -------------------------
function Walls({ world, cutaway }) {
  const wallRef = useRef();
  const trimRef = useRef();
  const { wall } = world.theme;
  const n = world.walls.length;
  const tall = wall.height >= 2;
  const mat = std(wall.color, wall.rough, wall.metal);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const s = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const col = new THREE.Color();
    const a = new THREE.Color(wall.trim[0]);
    const b = new THREE.Color(wall.trim[1]);
    world.walls.forEach((w, i) => {
      m.compose(p.set(w.x, wall.height / 2, w.z), q, s.set(TILE, wall.height, TILE));
      wallRef.current.setMatrixAt(i, m);
      const tint = (w.c + w.r) % 4 < 2 ? a : b;
      // top trim (a cap strip on low parapets) + skirting trim
      m.compose(p.set(w.x, tall ? wall.height - 0.3 : wall.height + 0.03, w.z), q, s.set(TILE + 0.06, tall ? 0.09 : 0.06, TILE + 0.06));
      trimRef.current.setMatrixAt(i * 2, m);
      trimRef.current.setColorAt(i * 2, col.copy(tint).multiplyScalar(tall ? 1 : 0.7));
      m.compose(p.set(w.x, tall ? 0.08 : -5, w.z), q, s.set(TILE + 0.06, 0.09, TILE + 0.06));
      trimRef.current.setMatrixAt(i * 2 + 1, m);
      trimRef.current.setColorAt(i * 2 + 1, col.copy(tint).multiplyScalar(0.45));
    });
    wallRef.current.instanceMatrix.needsUpdate = true;
    trimRef.current.instanceMatrix.needsUpdate = true;
    trimRef.current.instanceColor.needsUpdate = true;
  }, [world, wall, tall]);

  // Cutaway: any wall standing between the camera and the thief sinks to just below the
  // line of sight, so the player is never hidden behind architecture.
  const heights = useMemo(() => new Float32Array(n).fill(wall.height), [n, wall.height]);
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() }),
    [],
  );
  useFrame((state, rawDt) => {
    if (!cutaway || !tall) return;
    const cam = state.camera.position;
    const pl = world.player;
    let dx = cam.x - pl.x;
    let dz = cam.z - pl.z;
    const horiz = Math.hypot(dx, dz);
    const active = runtime.cam.mode !== 'first' && horiz > 1;
    dx /= horiz || 1;
    dz /= horiz || 1;
    const slope = (cam.y - 0.15) / (horiz || 1); // rise of the sight line per unit towards the camera
    const k = 1 - Math.exp(-Math.min(rawDt, 0.05) * 9);
    const { m, q, p, s } = tmp;
    let dirty = false;
    for (let i = 0; i < n; i++) {
      const w = world.walls[i];
      let goal = wall.height;
      if (active) {
        const rx = w.x - pl.x;
        const rz = w.z - pl.z;
        const along = rx * dx + rz * dz;
        const side = Math.abs(rx * dz - rz * dx);
        if (along > 0.2 && along < horiz && side < 2.3) {
          goal = Math.max(0.45, Math.min(wall.height, 0.15 + Math.max(0, along - 1.3) * slope - 0.2));
        }
      }
      const cur = heights[i];
      if (Math.abs(cur - goal) < 0.004) continue;
      const h = cur + (goal - cur) * k;
      heights[i] = h;
      dirty = true;
      m.compose(p.set(w.x, h / 2, w.z), q, s.set(TILE, h, TILE));
      wallRef.current.setMatrixAt(i, m);
      m.compose(p.set(w.x, h - 0.3 * (h / wall.height), w.z), q, s.set(TILE + 0.06, 0.09, TILE + 0.06));
      trimRef.current.setMatrixAt(i * 2, m);
    }
    if (dirty) {
      wallRef.current.instanceMatrix.needsUpdate = true;
      trimRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={wallRef} args={[unitBox, mat, n]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={trimRef} args={[unitBox, trimMat, n * 2]} frustumCulled={false} />
    </>
  );
}

// ---- Floor: merged quads so void cells become real holes, with cliff faces around them --------
function Floor({ world }) {
  const { theme } = world;
  const { top, sides } = useMemo(() => {
    const pos = [];
    const uv = [];
    const spos = [];
    const suv = [];
    const depth = theme.cliff;
    const vScale = theme.backdrop === 'city' ? depth / 10 : 1;
    const open = (c, r) => c < 0 || r < 0 || c >= world.cols || r >= world.rows || cellType(world, c, r) === VOID;
    const wallQuad = (ax, az, bx, bz) => {
      spos.push(ax, 0, az, bx, 0, bz, bx, -depth, bz, ax, 0, az, bx, -depth, bz, ax, -depth, az);
      suv.push(0, 0, 1, 0, 1, vScale, 0, 0, 1, vScale, 0, vScale);
    };
    for (let r = 0; r < world.rows; r++) {
      for (let c = 0; c < world.cols; c++) {
        if (cellType(world, c, r) === VOID) continue;
        const x0 = world.toX(c) - TILE / 2;
        const x1 = x0 + TILE;
        const z0 = world.toZ(r) - TILE / 2;
        const z1 = z0 + TILE;
        pos.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x0, 0, z0, x1, 0, z1, x1, 0, z0);
        const u0 = c / 2;
        const u1 = (c + 1) / 2;
        const v0 = r / 2;
        const v1 = (r + 1) / 2;
        uv.push(u0, v0, u0, v1, u1, v1, u0, v0, u1, v1, u1, v0);
        if (open(c - 1, r)) wallQuad(x0, z0, x0, z1);
        if (open(c + 1, r)) wallQuad(x1, z1, x1, z0);
        if (open(c, r - 1)) wallQuad(x1, z0, x0, z0);
        if (open(c, r + 1)) wallQuad(x0, z1, x1, z1);
      }
    }
    const topGeo = new THREE.BufferGeometry();
    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    topGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    topGeo.computeVertexNormals();
    const sideGeo = new THREE.BufferGeometry();
    sideGeo.setAttribute('position', new THREE.Float32BufferAttribute(spos, 3));
    sideGeo.setAttribute('uv', new THREE.Float32BufferAttribute(suv, 2));
    sideGeo.computeVertexNormals();
    return { top: topGeo, sides: sideGeo };
  }, [world, theme]);

  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: getFloorTexture(theme.floor.style),
        roughness: theme.floor.rough,
        metalness: theme.floor.metal,
      }),
    [theme],
  );
  const sideMat = useMemo(
    () =>
      theme.backdrop === 'city'
        ? new THREE.MeshBasicMaterial({ map: getWindowTexture(), color: '#8a93b0', side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({
            color: new THREE.Color(theme.wall.color).multiplyScalar(0.45),
            roughness: 0.8,
            side: THREE.DoubleSide,
          }),
    [theme],
  );

  return (
    <>
      <mesh geometry={top} material={floorMat} receiveShadow />
      <mesh geometry={sides} material={sideMat} />
    </>
  );
}

function Lighting({ world }) {
  const alarmRef = useRef();
  const { theme } = world;
  const hx = world.width / 2;
  const hz = world.depth / 2;
  const ext = Math.max(hx, hz) + 3;
  const [a, b] = theme.lights;
  const power = theme.lightPower;

  useFrame(() => {
    if (!alarmRef.current) return;
    alarmRef.current.intensity = world.alarm > 0 ? 60 + Math.sin(world.t * 18) * 50 : 0;
  });

  return (
    <>
      <ambientLight intensity={theme.ambient[1]} color={theme.ambient[0]} />
      <hemisphereLight args={theme.hemi} />
      <directionalLight
        position={[hx * 0.5, 18, hz * 0.7]}
        intensity={theme.sun[1]}
        color={theme.sun[0]}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-ext}
        shadow-camera-right={ext}
        shadow-camera-top={ext}
        shadow-camera-bottom={-ext}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0015}
      />
      <pointLight position={[-hx * 0.5, 2.6, -hz * 0.5]} color={a} intensity={power} distance={20} decay={1.7} />
      <pointLight position={[hx * 0.5, 2.6, -hz * 0.5]} color={b} intensity={power} distance={20} decay={1.7} />
      <pointLight position={[-hx * 0.5, 2.6, hz * 0.5]} color={b} intensity={power} distance={20} decay={1.7} />
      <pointLight position={[hx * 0.5, 2.6, hz * 0.5]} color={a} intensity={power} distance={20} decay={1.7} />
      <pointLight ref={alarmRef} position={[0, 5, 0]} color="#ff1a3c" intensity={0} distance={60} decay={1.2} />
    </>
  );
}

// Static architecture for a level. Everything world-specific comes from world.theme and PROPS.
export function Environment({ world, cutaway = false }) {
  const { theme } = world;
  const P = PROPS[theme.id] || PROPS.museum;
  return (
    <>
      <color attach="background" args={[theme.bg]} />
      <fog attach="fog" args={theme.fog} />
      <Lighting world={world} />
      <Backdrop world={world} />
      <Floor world={world} />
      <Walls world={world} cutaway={cutaway} />
      {world.pillars.map((p, i) => (
        <group key={`p${i}`} position={[p.x, 0, p.z]}>
          <P.Pillar i={i} />
        </group>
      ))}
      {world.cases.map((c, i) => (
        <group key={`c${i}`} position={[c.x, 0, c.z]}>
          <P.Obstacle seed={c.seed} />
        </group>
      ))}
      <P.Decor world={world} />
    </>
  );
}
