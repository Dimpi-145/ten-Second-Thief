// Pre-mission screens: world selection, level selection and the mission briefing.
import { sfx } from '../game/audio.js';
import { LEVEL_TIME, START_LIVES } from '../game/levels.js';
import {
  CAMERA_LABELS,
  actions,
  bestKey,
  clearedIn,
  isLevelUnlocked,
  isWorldUnlocked,
  useStore,
} from '../game/store.js';
import { UNLOCK_AFTER, WORLDS, hazardsOf } from '../game/worlds.js';

const click = (fn) => () => {
  sfx.click();
  fn();
};

function Pips({ n, max = 5 }) {
  return (
    <span className="pips" aria-label={`difficulty ${n} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  );
}

function BackButton({ onClick, label = 'BACK' }) {
  return (
    <button className="btn btn-ghost btn-back" onClick={click(onClick)}>
      ◀ {label}
    </button>
  );
}

// ---- World selection --------------------------------------------------------------------------
function WorldCard({ index }) {
  const world = WORLDS[index];
  const cleared = useStore((s) => s.cleared);
  const preview = useStore((s) => s.previews[world.id]);
  const active = useStore((s) => s.hoverWorld === index);
  const unlocked = isWorldUnlocked(index, cleared);
  const done = clearedIn(index, cleared);
  const total = world.levels.length;
  const need = index > 0 ? Math.min(UNLOCK_AFTER, WORLDS[index - 1].levels.length) : 0;
  const hover = () => actions.hoverWorld(index);

  return (
    <article
      className={`world-card glass${active ? ' active' : ''}${unlocked ? '' : ' locked'}`}
      style={{ '--card': world.theme.accent, '--card2': world.theme.accent2, '--i': index }}
      onPointerEnter={hover}
      onFocus={hover}
      onClick={unlocked ? click(() => actions.selectWorld(index)) : hover}
    >
      <div className="world-thumb">
        {preview && preview !== 'none' ? <img src={preview} alt={`${world.name} preview`} draggable="false" /> : <div className="thumb-wait" />}
        <span className="world-num">0{index + 1}</span>
        {!unlocked && (
          <div className="lock-veil">
            <span className="lock-icon">🔒</span>
            <span>
              CLEAR {need} LEVEL{need > 1 ? 'S' : ''} OF {WORLDS[index - 1].name.toUpperCase()}
            </span>
          </div>
        )}
        {unlocked && done === total && <span className="world-badge">★ CLEARED</span>}
      </div>
      <div className="world-body">
        <h3>{world.name}</h3>
        <div className="world-meta">
          <Pips n={world.difficulty} />
          <span>{world.rank}</span>
        </div>
        <p>{world.description}</p>
        <div className="world-foot">
          <span className="world-progress">
            {unlocked ? `${done}/${total} LEVELS` : 'LOCKED'}
            <i>
              <b style={{ width: `${(done / total) * 100}%` }} />
            </i>
          </span>
          <button
            className="btn btn-primary btn-small"
            disabled={!unlocked}
            onClick={(e) => {
              e.stopPropagation();
              sfx.click();
              actions.selectWorld(index);
            }}
          >
            {unlocked ? 'PLAY ▶' : 'LOCKED'}
          </button>
        </div>
      </div>
    </article>
  );
}

export function WorldSelect() {
  const ready = useStore((s) => WORLDS.every((w) => s.previews[w.id]));
  return (
    <div className="screen menu-screen">
      <header className="menu-head">
        <BackButton onClick={actions.toTitle} label="MENU" />
        <div>
          <div className="menu-kicker">SELECT YOUR TARGET</div>
          <h2 className="menu-title">WORLDS</h2>
        </div>
        <span className="menu-spacer" />
      </header>
      <div className="world-grid">
        {WORLDS.map((w, i) => (
          <WorldCard key={w.id} index={i} />
        ))}
      </div>
      {!ready && (
        <div className="casing">
          <div className="casing-bar" />
          CASING THE TARGETS…
        </div>
      )}
    </div>
  );
}

// ---- Level selection --------------------------------------------------------------------------
export function LevelSelect() {
  const worldIndex = useStore((s) => s.world);
  const level = useStore((s) => s.level);
  const cleared = useStore((s) => s.cleared);
  const best = useStore((s) => s.best);
  const world = WORLDS[worldIndex];
  const done = clearedIn(worldIndex, cleared);

  return (
    <div className="screen menu-screen side">
      <header className="menu-head">
        <BackButton onClick={actions.openWorlds} label="WORLDS" />
        <div>
          <div className="menu-kicker">
            {world.rank} · <Pips n={world.difficulty} />
          </div>
          <h2 className="menu-title">{world.name}</h2>
        </div>
        <span className="menu-spacer" />
      </header>
      <div className="level-list">
        {world.levels.map((lv, i) => {
          const open = isLevelUnlocked(worldIndex, i, cleared);
          const score = best[bestKey(worldIndex, i)];
          return (
            <button
              key={lv.name}
              className={`level-card glass${i === level ? ' active' : ''}${open ? '' : ' locked'}`}
              style={{ '--i': i }}
              disabled={!open}
              onPointerEnter={() => actions.hoverLevel(i)}
              onFocus={() => actions.hoverLevel(i)}
              onClick={click(() => actions.selectLevel(i))}
            >
              <span className="level-num">{open ? String(i + 1).padStart(2, '0') : '🔒'}</span>
              <span className="level-info">
                <b>{lv.name}</b>
                <small>{open ? hazardsOf(lv).join(' · ') : 'Clear the previous level to unlock'}</small>
              </span>
              <span className="level-score">
                {i < done ? <em>✔ CLEARED</em> : open ? <em className="new">NEW</em> : null}
                {score ? <small>BEST {score.toLocaleString()}</small> : null}
              </span>
            </button>
          );
        })}
      </div>
      <p className="menu-hint">Hover a level to scout it · Click to open the briefing</p>
    </div>
  );
}

// ---- Mission briefing -------------------------------------------------------------------------
export function Briefing() {
  const worldIndex = useStore((s) => s.world);
  const level = useStore((s) => s.level);
  const cameraMode = useStore((s) => s.cameraMode);
  const best = useStore((s) => s.best[bestKey(worldIndex, level)]);
  const world = WORLDS[worldIndex];
  const lv = world.levels[level];

  return (
    <div className="screen menu-screen side">
      <header className="menu-head">
        <BackButton onClick={actions.openLevels} label="LEVELS" />
        <span className="menu-spacer" />
      </header>
      <section className="briefing glass">
        <div className="menu-kicker">
          MISSION BRIEFING · {world.name.toUpperCase()} {level + 1}/{world.levels.length}
        </div>
        <h2 className="briefing-title">{lv.name}</h2>
        <p className="briefing-objective">{world.objective}</p>
        <ol className="briefing-steps">
          {world.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <div className="briefing-intel">
          <div>
            <span>SECURITY</span>
            <div className="chips">
              {hazardsOf(lv).map((h) => (
                <i key={h}>{h}</i>
              ))}
            </div>
          </div>
          <div className="intel-row">
            <div>
              <span>TIME LIMIT</span>
              <b>{LEVEL_TIME}.00s</b>
            </div>
            <div>
              <span>LIVES</span>
              <b>{START_LIVES}</b>
            </div>
            <div>
              <span>BEST</span>
              <b>{best ? best.toLocaleString() : '—'}</b>
            </div>
          </div>
        </div>
        <div className="briefing-actions">
          <button className="btn btn-primary btn-start" onClick={click(actions.startMission)} autoFocus>
            START MISSION ▶
          </button>
          <button className="btn btn-camera" onClick={click(actions.cycleCamera)} title="Camera view (C in game)">
            🎥 {CAMERA_LABELS[cameraMode]}
          </button>
        </div>
      </section>
    </div>
  );
}
