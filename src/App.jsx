import { useEffect } from 'react';
import { ambient } from './game/ambient.js';
import { sfx } from './game/audio.js';
import { installKeyboard } from './game/input.js';
import { actions, getState, useStore } from './game/store.js';
import { WORLDS } from './game/worlds.js';
import { GameCanvas } from './scene/GameCanvas.jsx';
import { HUD } from './ui/HUD.jsx';
import { Briefing, LevelSelect, WorldSelect } from './ui/Menus.jsx';
import { Complete, GameOver, Intro, LifeLost, Pause, Victory } from './ui/Overlays.jsx';
import { TitleScreen } from './ui/TitleScreen.jsx';
import { TouchControls } from './ui/TouchControls.jsx';

const MENUS = new Set(['title', 'worlds', 'levels', 'briefing']);
const QUIET = new Set(['paused', 'complete', 'gameover', 'victory']);
let gestureSeen = false; // browsers only allow audio after the first user gesture

function useGlobalKeys() {
  useEffect(() => {
    const removeGameKeys = installKeyboard(() => getState().screen === 'playing');
    const go = (fn) => {
      sfx.click();
      fn();
    };
    const onKey = (e) => {
      if (e.repeat) return;
      const { screen } = getState();
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (screen === 'playing') actions.pause();
        else if (screen === 'paused') actions.resume();
        else if (e.code === 'Escape') {
          if (screen === 'worlds') go(actions.toTitle);
          else if (screen === 'levels') go(actions.openWorlds);
          else if (screen === 'briefing') go(actions.openLevels);
        }
      } else if (e.code === 'KeyM') {
        actions.toggleMute();
      } else if (e.code === 'KeyC' && !MENUS.has(screen)) {
        actions.cycleCamera();
      } else if (e.code === 'KeyR' && screen === 'paused') {
        actions.restartLevel();
      } else if (e.code === 'Enter' && e.target?.tagName !== 'BUTTON') {
        // (a focused button already handles Enter itself)
        if (screen === 'title') go(actions.openWorlds);
        else if (screen === 'briefing') go(actions.startMission);
        else if (screen === 'gameover') go(actions.retry);
        else if (screen === 'complete') go(actions.nextLevel);
        else if (screen === 'victory') go(actions.nextWorld);
      }
    };
    // Auto-pause when the tab is hidden so the clock never runs unseen.
    const onVisibility = () => {
      if (document.hidden) actions.pause();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      removeGameKeys();
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}

// Keeps the ambient loop in step with the current screen / world / mute setting.
function useAmbient(screen, world, muted) {
  useEffect(() => {
    const sync = () => {
      if (!gestureSeen || muted) {
        ambient.stop();
        return;
      }
      ambient.play(MENUS.has(screen) ? 'menu' : WORLDS[world].id);
      ambient.duck(QUIET.has(screen));
    };
    sync();
    if (gestureSeen) return undefined;
    const first = () => {
      gestureSeen = true;
      sync();
    };
    window.addEventListener('pointerdown', first, { once: true });
    window.addEventListener('keydown', first, { once: true });
    return () => {
      window.removeEventListener('pointerdown', first);
      window.removeEventListener('keydown', first);
    };
  }, [screen, world, muted]);
  useEffect(() => () => ambient.stop(), []);
}

export default function App() {
  const screen = useStore((s) => s.screen);
  const attempt = useStore((s) => s.attempt);
  const alarm = useStore((s) => s.alarm);
  const world = useStore((s) => s.world);
  const muted = useStore((s) => s.muted);
  useGlobalKeys();
  useAmbient(screen, world, muted);

  const inGame = !MENUS.has(screen);
  const { accent, accent2 } = WORLDS[world].theme;
  // one cinematic wipe per screen change (retries of the same level share the game key + attempt)
  const wipeKey = inGame ? `game-${attempt}` : `${screen}-${screen === 'title' ? '' : world}`;
  return (
    <div
      className={`app${alarm ? ' is-alarm' : ''}${screen === 'lifelost' ? ' is-hit' : ''}`}
      style={{ '--accent': inGame || screen !== 'title' ? accent : '#00e5ff', '--accent2': accent2 }}
    >
      <GameCanvas />
      <div className="vignette" />
      <div className="alarm-flash" />
      <div className="scanlines" />
      {inGame && <HUD />}
      {inGame && <TouchControls />}
      {screen === 'title' && <TitleScreen />}
      {screen === 'worlds' && <WorldSelect />}
      {screen === 'levels' && <LevelSelect />}
      {screen === 'briefing' && <Briefing />}
      {screen === 'intro' && <Intro key={attempt} />}
      {screen === 'paused' && <Pause />}
      {screen === 'lifelost' && <LifeLost />}
      {screen === 'complete' && <Complete />}
      {screen === 'gameover' && <GameOver />}
      {screen === 'victory' && <Victory />}
      <div key={wipeKey} className="wipe">
        <span />
        <span />
      </div>
    </div>
  );
}
