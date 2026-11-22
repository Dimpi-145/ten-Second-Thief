import { useEffect, useRef } from 'react';
import { joystick } from '../game/input.js';

const RADIUS = 52;

// On-screen joystick. Only visible on touch devices (see CSS media query).
export function TouchControls() {
  const base = useRef();
  const knob = useRef();

  useEffect(() => {
    const el = base.current;
    let active = null;
    const set = (x, y) => {
      joystick.x = x / RADIUS;
      joystick.y = y / RADIUS;
      knob.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    const track = (e) => {
      const r = el.getBoundingClientRect();
      let x = e.clientX - (r.left + r.width / 2);
      let y = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(x, y);
      if (d > RADIUS) {
        x = (x / d) * RADIUS;
        y = (y / d) * RADIUS;
      }
      set(x, y);
    };
    const down = (e) => {
      active = e.pointerId;
      el.setPointerCapture(e.pointerId);
      track(e);
    };
    const move = (e) => {
      if (e.pointerId === active) track(e);
    };
    const up = (e) => {
      if (e.pointerId !== active) return;
      active = null;
      set(0, 0);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      joystick.x = 0;
      joystick.y = 0;
    };
  }, []);

  return (
    <div ref={base} className="joystick">
      <div ref={knob} className="joystick-knob" />
    </div>
  );
}
