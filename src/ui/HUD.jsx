import { useEffect } from 'react';
import { sfx } from '../game/audio.js';
import { queueSmoke } from '../game/input.js';
import { LEVEL_TIME, SMOKE_CHARGES, START_LIVES } from '../game/levels.js';
import { CAMERA_LABELS, actions, useStore } from '../game/store.js';
import { WORLDS } from '../game/worlds.js';

function Timer() {
  const t = useStore((s) => s.timeLeft);
  const danger = t <= 3;
  const [whole, frac] = t.toFixed(2).split('.');
  return (
    <div className={`hud-timer glass${danger ? ' danger' : ''}`}>
      <div className="hud-label">TIME</div>
      <div className="timer-value">
        {whole.padStart(2, '0')}
        <span className="timer-frac">.{frac}</span>
      </div>
      <div className="timer-bar">
        <div className="timer-fill" style={{ transform: `scaleX(${t / LEVEL_TIME})` }} />
      </div>
    </div>
  );
}

function Countdown() {
  const n = useStore((s) => (s.screen === 'playing' && s.timeLeft <= 3 && s.timeLeft > 0 ? Math.ceil(s.timeLeft) : 0));
  useEffect(() => {
    if (n > 0) sfx.tick();
  }, [n]);
  if (!n) return null;
  return (
    <div className="countdown">
      <div key={n} className="countdown-num">
        {n}
      </div>
    </div>
  );
}

function Toast() {
  const message = useStore((s) => s.message);
  if (!message) return null;
  return (
    <div key={message.id} className={`toast tone-${message.tone}`}>
      {message.text}
    </div>
  );
}

// Mission checklist: adapts to whatever this world asks for (key, targets, exit).
function Objectives() {
  const worldIndex = useStore((s) => s.world);
  const needKey = useStore((s) => s.needKey);
  const hasKey = useStore((s) => s.hasKey);
  const targets = useStore((s) => s.targets);
  const totalTargets = useStore((s) => s.totalTargets);
  const exitOpen = useStore((s) => s.exitOpen);
  const collected = useStore((s) => s.collected);
  const totalItems = useStore((s) => s.totalItems);
  const { labels } = WORLDS[worldIndex];
  return (
    <div className="hud-panel glass hud-objectives">
      {needKey && (
        <div className={`objective${hasKey ? ' done' : ''}`}>
          <span className="obj-icon purple">⚿</span>
          {hasKey ? `${labels.key} ACQUIRED` : `FIND THE ${labels.key}`}
        </div>
      )}
      {totalTargets > 0 && (
        <div className={`objective${targets === totalTargets ? ' done' : ''}`}>
          <span className="obj-icon gold">★</span>
          {labels.target} {targets}/{totalTargets}
        </div>
      )}
      <div className={`objective${exitOpen ? ' go' : ' dim'}`}>
        <span className="obj-icon green">➜</span>
        {exitOpen ? `RUN TO THE ${labels.exit}` : `${labels.exit} LOCKED`}
      </div>
      <div className={`objective minor${collected === totalItems ? ' done' : ''}`}>
        <span className="obj-icon cyan">◆</span>
        LOOT {collected}/{totalItems}
      </div>
    </div>
  );
}

export function HUD() {
  const score = useStore((s) => s.score);
  const lives = useStore((s) => s.lives);
  const worldIndex = useStore((s) => s.world);
  const level = useStore((s) => s.level);
  const smoke = useStore((s) => s.smoke);
  const hidden = useStore((s) => s.hidden);
  const muted = useStore((s) => s.muted);
  const cameraMode = useStore((s) => s.cameraMode);
  const playing = useStore((s) => s.screen === 'playing');
  const world = WORLDS[worldIndex];

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-panel glass">
          <div className="hud-label">SCORE</div>
          <div key={score} className="hud-score">
            {score.toLocaleString()}
          </div>
        </div>

        <Timer />

        <div className="hud-panel glass hud-right">
          <div className="hud-label">
            LEVEL {level + 1}/{world.levels.length}
          </div>
          <div className="hud-lives" aria-label={`${lives} lives`}>
            {Array.from({ length: START_LIVES }, (_, i) => (
              <span key={i} className={`life${i < lives ? '' : ' lost'}`}>
                ♥
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="hud-bottom">
        <Objectives />

        <div className={`hud-panel glass hud-smoke${hidden ? ' active' : ''}`}>
          <div className="hud-label">{hidden ? 'HIDDEN' : 'SMOKE [SPACE]'}</div>
          <div className="smoke-pips">
            {Array.from({ length: SMOKE_CHARGES }, (_, i) => (
              <span key={i} className={`pip${i < smoke ? '' : ' used'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="hud-buttons">
        <button className="btn-icon btn-cam" onClick={actions.cycleCamera} aria-label="Change camera view" title="Camera view [C]">
          🎥 <span>{CAMERA_LABELS[cameraMode]}</span>
        </button>
        <button className="btn-icon" onClick={actions.toggleMute} aria-label="Toggle sound">
          {muted ? '🔇' : '🔊'}
        </button>
        {playing && (
          <button className="btn-icon" onClick={actions.pause} aria-label="Pause">
            ❚❚
          </button>
        )}
      </div>

      {playing && (
        <button className="touch-smoke" onPointerDown={queueSmoke} aria-label="Smoke bomb">
          SMOKE
        </button>
      )}

      <Toast />
      <Countdown />
      <div className="level-name">
        {world.name} · {world.levels[level].name}
      </div>
      <div key={cameraMode} className="cam-flash">
        {CAMERA_LABELS[cameraMode]} CAM
      </div>
    </div>
  );
}
