import { sfx } from '../game/audio.js';
import { actions, clearedIn, useStore } from '../game/store.js';
import { WORLDS } from '../game/worlds.js';

export function TitleScreen() {
  const highScore = useStore((s) => s.highScore);
  const muted = useStore((s) => s.muted);
  const cleared = useStore((s) => s.cleared);
  const lastWorld = useStore((s) => s.world);
  const total = WORLDS.reduce((n, w) => n + w.levels.length, 0);
  const done = WORLDS.reduce((n, w, i) => n + clearedIn(i, cleared), 0);
  const play = () => {
    sfx.click();
    actions.openWorlds();
  };
  const resume = () => {
    sfx.click();
    actions.selectWorld(lastWorld);
  };
  return (
    <div className="screen title-screen">
      <div className="title-wrap">
        <div className="title-kicker">SIX WORLDS · ONE CLOCK</div>
        <h1 className="title">
          <span className="title-the">THE</span>
          <span className="title-main" data-text="10-SECOND">
            10-SECOND
          </span>
          <span className="title-thief">THIEF</span>
        </h1>
        <p className="title-tag">Museums, vaults, casinos, rooftops, labs and orbit. Ten seconds each.</p>
      </div>

      <div className="title-actions">
        <button className="btn btn-play" onClick={play} autoFocus>
          <span className="btn-play-icon">▶</span> PLAY
        </button>
        {done > 0 && (
          <button className="btn btn-ghost btn-small" onClick={resume}>
            CONTINUE · {WORLDS[lastWorld].name.toUpperCase()}
          </button>
        )}
        <div className="title-score">
          HIGH SCORE <b>{highScore.toLocaleString()}</b>
          <span className="title-progress">
            {done}/{total} LEVELS
          </span>
        </div>
      </div>

      <div className="title-help glass">
        <div>
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> / <kbd>↑</kbd>
          <kbd>←</kbd>
          <kbd>↓</kbd>
          <kbd>→</kbd> move
        </div>
        <div>
          <kbd>SPACE</kbd> smoke bomb
        </div>
        <div>
          <kbd>DRAG</kbd> rotate camera
        </div>
        <div>
          <kbd>C</kbd> camera view
        </div>
        <div>
          <kbd>ESC</kbd> pause
        </div>
        <div className="legend">
          <span className="dot cyan" /> diamond +100
          <span className="dot gold" /> gold +50
          <span className="dot purple" /> key unlocks exit
        </div>
      </div>

      <button className="btn-icon title-mute" onClick={actions.toggleMute} aria-label="Toggle sound">
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  );
}
