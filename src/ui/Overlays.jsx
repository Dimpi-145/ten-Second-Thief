import { useEffect } from 'react';
import { sfx } from '../game/audio.js';
import { CAMERA_LABELS, actions, isWorldUnlocked, useStore } from '../game/store.js';
import { WORLDS } from '../game/worlds.js';

const click = (fn) => () => {
  sfx.click();
  fn();
};

export function Intro() {
  const worldIndex = useStore((s) => s.world);
  const level = useStore((s) => s.level);
  const world = WORLDS[worldIndex];
  useEffect(() => {
    const id = setTimeout(actions.startPlaying, 1700);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="screen intro-screen">
      <div className="intro-level">
        {world.name.toUpperCase()} · LEVEL {level + 1}
      </div>
      <div className="intro-name">{world.levels[level].name}</div>
      <div className="intro-brief">10 SECONDS · {world.objective.toUpperCase()}</div>
      <div className="intro-bar" />
    </div>
  );
}

export function LifeLost() {
  const reason = useStore((s) => s.lostReason);
  const lives = useStore((s) => s.lives);
  useEffect(() => {
    const id = setTimeout(actions.afterLifeLost, 1500);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="screen lost-screen">
      <div className="lost-title">{reason}</div>
      <div className="lost-sub">{lives > 0 ? `${lives} ${lives === 1 ? 'LIFE' : 'LIVES'} LEFT` : 'NO LIVES LEFT'}</div>
    </div>
  );
}

export function Pause() {
  const cameraMode = useStore((s) => s.cameraMode);
  return (
    <div className="screen dim">
      <div className="panel glass">
        <h2 className="panel-title cyan">PAUSED</h2>
        <p className="panel-sub">The clock is frozen. Catch your breath.</p>
        <div className="panel-buttons">
          <button className="btn btn-primary" onClick={click(actions.resume)} autoFocus>
            RESUME
          </button>
          <button className="btn" onClick={click(actions.cycleCamera)}>
            🎥 CAMERA: {CAMERA_LABELS[cameraMode]}
          </button>
          <button className="btn" onClick={click(actions.restartLevel)}>
            RESTART LEVEL
          </button>
          <button className="btn" onClick={click(actions.openLevels)}>
            LEVEL SELECT
          </button>
          <button className="btn btn-ghost" onClick={click(actions.toTitle)}>
            QUIT TO MENU
          </button>
        </div>
        <p className="panel-hint">
          <kbd>ESC</kbd> resume · <kbd>R</kbd> restart · <kbd>C</kbd> camera · <kbd>M</kbd> mute
        </p>
      </div>
    </div>
  );
}

function Breakdown() {
  const result = useStore((s) => s.result);
  const score = useStore((s) => s.score);
  if (!result) return null;
  return (
    <div className="breakdown">
      <div className="row">
        <span>Loot</span>
        <b>+{result.loot}</b>
      </div>
      <div className="row">
        <span>Time bonus ({result.timeLeft.toFixed(2)}s left)</span>
        <b>+{result.timeBonus}</b>
      </div>
      {result.perfect > 0 && (
        <div className="row gold">
          <span>Clean sweep</span>
          <b>+{result.perfect}</b>
        </div>
      )}
      <div className="row total">
        <span>Score</span>
        <b>{score.toLocaleString()}</b>
      </div>
      {result.unlockedWorld && <div className="unlock-banner">🔓 NEW WORLD UNLOCKED — {result.unlockedWorld.toUpperCase()}</div>}
    </div>
  );
}

function Record() {
  const highScore = useStore((s) => s.highScore);
  const newRecord = useStore((s) => s.newRecord);
  return (
    <div className={`record${newRecord ? ' new' : ''}`}>
      {newRecord ? '★ NEW HIGH SCORE ★' : 'HIGH SCORE'} <b>{highScore.toLocaleString()}</b>
    </div>
  );
}

export function Complete() {
  const worldIndex = useStore((s) => s.world);
  const level = useStore((s) => s.level);
  return (
    <div className="screen dim">
      <div className="panel glass">
        <div className="panel-kicker">
          {WORLDS[worldIndex].name.toUpperCase()} · LEVEL {level + 1} CLEARED
        </div>
        <h2 className="panel-title green">MISSION COMPLETE</h2>
        <Breakdown />
        <div className="panel-buttons">
          <button className="btn btn-primary" onClick={click(actions.nextLevel)} autoFocus>
            NEXT LEVEL ▶
          </button>
          <button className="btn btn-ghost" onClick={click(actions.openLevels)}>
            LEVEL SELECT
          </button>
        </div>
      </div>
    </div>
  );
}

export function GameOver() {
  const score = useStore((s) => s.score);
  const worldIndex = useStore((s) => s.world);
  const level = useStore((s) => s.level);
  const reason = useStore((s) => s.lostReason);
  useEffect(() => {
    sfx.gameover();
  }, []);
  return (
    <div className="screen dim red">
      <div className="panel glass">
        <div className="panel-kicker">
          {WORLDS[worldIndex].name.toUpperCase()} · LEVEL {level + 1} · {reason}
        </div>
        <h2 className="panel-title red">MISSION FAILED</h2>
        <div className="final-score">{score.toLocaleString()}</div>
        <Record />
        <div className="panel-buttons">
          <button className="btn btn-primary" onClick={click(actions.retry)} autoFocus>
            RETRY MISSION
          </button>
          <button className="btn" onClick={click(actions.openLevels)}>
            LEVEL SELECT
          </button>
          <button className="btn btn-ghost" onClick={click(actions.toTitle)}>
            MENU
          </button>
        </div>
      </div>
    </div>
  );
}

export function Victory() {
  const worldIndex = useStore((s) => s.world);
  const cleared = useStore((s) => s.cleared);
  const world = WORLDS[worldIndex];
  const next = WORLDS[worldIndex + 1];
  const nextOpen = next && isWorldUnlocked(worldIndex + 1, cleared);
  return (
    <div className="screen dim">
      <div className="panel glass">
        <div className="panel-kicker">ALL {world.levels.length} LEVELS CLEARED</div>
        <h2 className="panel-title gold">{next ? `${world.name.toUpperCase()} CLEARED` : 'MASTER THIEF'}</h2>
        <Breakdown />
        <Record />
        <div className="panel-buttons">
          {nextOpen ? (
            <button className="btn btn-primary" onClick={click(actions.nextWorld)} autoFocus>
              NEXT WORLD: {next.name.toUpperCase()} ▶
            </button>
          ) : (
            <button className="btn btn-primary" onClick={click(actions.openWorlds)} autoFocus>
              WORLD SELECT
            </button>
          )}
          <button className="btn btn-ghost" onClick={click(actions.toTitle)}>
            MENU
          </button>
        </div>
      </div>
    </div>
  );
}
