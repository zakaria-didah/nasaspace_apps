import React, { useEffect, useMemo, useState } from 'react';
import {
  COMPONENT_CATALOG,
  ComponentCategory,
  DEFAULT_CONFIG,
  MISSION_ANOMALIES,
  MISSION_BUDGET_CAP_M,
  MISSION_TARGET_DAYS,
  MissionConfig,
  ROLE_METADATA,
  TeamRole
} from './data/missionData';
import {
  createInitialSimulationState,
  evaluateDesign,
  LiveSimulationState,
  stepSimulationDay
} from './engine/simulationEngine';
import { SpacecraftBlueprintCanvas } from './components/SpacecraftBlueprintCanvas';
import { OrbitalSimulationCanvas } from './components/OrbitalSimulationCanvas';
import { PostMortemModal } from './components/PostMortemModal';
import { soundEngine } from './engine/soundEffects';

type GamePhase = 'CDF_BUILDER' | 'LAUNCH_SEQUENCE' | 'LIVE_OPS';

const CATEGORY_ORDER: { key: ComponentCategory; label: string; configField: keyof MissionConfig }[] = [
  { key: 'bus', label: '1. Spacecraft Structural Bus', configField: 'busId' },
  { key: 'instrument', label: '2. Scientific Payload Instrument', configField: 'instrumentId' },
  { key: 'power', label: '3. Solar Arrays & Eclipse Battery', configField: 'powerId' },
  { key: 'comms', label: '4. Downlink Antenna & Recorder', configField: 'commsId' },
  { key: 'orbit', label: '5. Target Operational Orbit', configField: 'orbitId' },
  { key: 'launcher', label: '6. Launch Vehicle', configField: 'launcherId' }
];

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('CDF_BUILDER');
  const [activeRole, setActiveRole] = useState<TeamRole>('ALL');
  const [config, setConfig] = useState<MissionConfig>(DEFAULT_CONFIG);
  const [simState, setSimState] = useState<LiveSimulationState | null>(null);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [muted, setMuted] = useState<boolean>(false);

  const summary = useMemo(() => evaluateDesign(config), [config]);

  const handleSelectComponent = (field: keyof MissionConfig, id: string) => {
    soundEngine.playSnap();
    setConfig((prev) => ({ ...prev, [field]: id }));
  };

  const handleToggleMute = () => {
    soundEngine.muted = !muted;
    setMuted(!muted);
  };

  const handleStartLaunch = () => {
    if (!summary.canLaunch) return;
    soundEngine.playLaunchIgnition();
    const initial = createInitialSimulationState(summary);
    setSimState(initial);
    setPhase('LAUNCH_SEQUENCE');

    setTimeout(() => {
      setPhase('LIVE_OPS');
    }, 2200);
  };

  // Real-time Orbital Operations Loop
  useEffect(() => {
    if (phase !== 'LIVE_OPS' || !simState || simState.completed || simState.activeAnomalyId) {
      return;
    }

    const interval = setInterval(() => {
      setSimState((prev) => {
        if (!prev || prev.completed || prev.activeAnomalyId) return prev;

        const next = stepSimulationDay(prev, summary, 4.5 * simSpeed);

        // Check if an un-resolved anomaly should trigger
        const pendingAnomaly = MISSION_ANOMALIES.find(
          (a) => next.day >= a.triggerDay && !next.resolvedAnomalyIds.includes(a.id)
        );

        if (pendingAnomaly) {
          soundEngine.playAnomalyAlert();
          return {
            ...next,
            activeAnomalyId: pendingAnomaly.id,
            logs: [
              {
                day: Math.round(next.day),
                text: `ALERT: ${pendingAnomaly.title} — Awaiting team decision!`,
                tone: 'warn'
              },
              ...next.logs
            ]
          };
        }

        if (next.overGroundStation && next.bufferUsedGb > 15 && Math.random() < 0.25) {
          soundEngine.playDownlinkChirp();
        }

        if (next.completed && !prev.completed) {
          soundEngine.playMissionComplete(!next.failedReason);
        }

        return next;
      });
    }, 180);

    return () => clearInterval(interval);
  }, [phase, simState, simSpeed, summary]);

  const activeAnomaly = useMemo(() => {
    if (!simState?.activeAnomalyId) return null;
    return MISSION_ANOMALIES.find((a) => a.id === simState.activeAnomalyId) ?? null;
  }, [simState?.activeAnomalyId]);

  const handleResolveAnomaly = (choiceId: string) => {
    if (!simState || !activeAnomaly) return;
    const choice = activeAnomaly.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    soundEngine.playSnap();
    setSimState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        budgetRemainingM: prev.budgetRemainingM + choice.budgetDeltaM,
        fuelRemainingKg: Math.max(0, +(prev.fuelRemainingKg + choice.fuelDeltaKg).toFixed(1)),
        scienceCollected: Math.max(0, +(prev.scienceCollected + choice.scienceDelta).toFixed(1)),
        busHealthPct: Math.min(100, Math.max(0, prev.busHealthPct + choice.healthDelta)),
        resolvedAnomalyIds: [...prev.resolvedAnomalyIds, activeAnomaly.id],
        activeAnomalyId: null,
        logs: [
          {
            day: Math.round(prev.day),
            text: choice.logMessage,
            tone: 'highlight'
          },
          ...prev.logs
        ]
      };
    });
  };

  const handleResetToBuilder = () => {
    setSimState(null);
    setPhase('CDF_BUILDER');
    setSimSpeed(1);
  };

  const budgetUsedPct = Math.min(100, Math.round((summary.totalCostM / MISSION_BUDGET_CAP_M) * 100));
  const massUsedPct = Math.min(100, Math.round((summary.wetMassKg / summary.maxLaunchMassKg) * 100));

  return (
    <div className="app-shell">
      {/* Top Mission Control Header */}
      <header className="top-bar">
        <div className="brand-group">
          <span className="mission-badge">NASA SPACE APPS 2026</span>
          <div>
            <div className="brand-title">ORBITAL ARCHITECT // OPERATION DESERT PULSE</div>
            <div className="brand-subtitle">
              3-Year Arid Subsurface Aquifer & Atmospheric Dust Observation Mission
            </div>
          </div>
        </div>

        <div className="controls-group">
          <span className="mission-badge">
            PHASE: {phase === 'CDF_BUILDER' ? '1. CONCURRENT DESIGN' : phase === 'LAUNCH_SEQUENCE' ? '2. LAUNCH' : '3. LIVE OPS'}
          </span>
          <button className="btn-secondary" onClick={handleToggleMute}>
            {muted ? '🔇 Audio Muted' : '🔊 Telemetry SFX'}
          </button>
          {phase !== 'CDF_BUILDER' && (
            <button className="btn-secondary" onClick={handleResetToBuilder}>
              ↺ Abort to CDF Builder
            </button>
          )}
        </div>
      </header>

      {/* 1-to-4 Player Asymmetric Team Role Bar */}
      <div className="role-bar">
        <div className="role-tabs">
          {(Object.keys(ROLE_METADATA) as TeamRole[]).map((roleKey) => (
            <button
              key={roleKey}
              className={`role-tab ${activeRole === roleKey ? 'active' : ''}`}
              onClick={() => {
                soundEngine.playSnap();
                setActiveRole(roleKey);
              }}
            >
              {ROLE_METADATA[roleKey].label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {ROLE_METADATA[activeRole].subtitle}
        </div>
      </div>

      {/* Live Engineering & Telemetry Gauges */}
      <section className="telemetry-strip">
        <div className={`metric-box ${summary.budgetRemainingM < 0 ? 'danger' : ''}`}>
          <div className="metric-label">
            <span>MISSION BUDGET</span>
            <span>CAP: ${MISSION_BUDGET_CAP_M}M</span>
          </div>
          <div className="metric-value">
            ${phase === 'CDF_BUILDER' ? summary.totalCostM : MISSION_BUDGET_CAP_M - (simState?.budgetRemainingM ?? summary.budgetRemainingM)}M / ${MISSION_BUDGET_CAP_M}M
          </div>
          <div className="meter-track">
            <div
              className="meter-fill"
              style={{
                width: `${budgetUsedPct}%`,
                backgroundColor: summary.budgetRemainingM < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'
              }}
            />
          </div>
        </div>

        <div className={`metric-box ${summary.wetMassKg > summary.maxLaunchMassKg ? 'danger' : ''}`}>
          <div className="metric-label">
            <span>WET MASS / ROCKET CAP</span>
            <span>{massUsedPct}%</span>
          </div>
          <div className="metric-value">
            {summary.wetMassKg} / {summary.maxLaunchMassKg} kg
          </div>
          <div className="meter-track">
            <div
              className="meter-fill"
              style={{
                width: `${massUsedPct}%`,
                backgroundColor: summary.wetMassKg > summary.maxLaunchMassKg ? 'var(--accent-rose)' : 'var(--accent-cyan)'
              }}
            />
          </div>
        </div>

        <div className={`metric-box ${summary.orbitAveragePowerW < 0 ? 'warn' : ''}`}>
          <div className="metric-label">
            <span>ORBIT AVG POWER</span>
            <span>{phase === 'LIVE_OPS' && simState ? `BAT: ${simState.batteryPct}%` : `BAT: ${summary.batteryCapacityWh}Wh`}</span>
          </div>
          <div className="metric-value">
            {summary.orbitAveragePowerW >= 0 ? `+${summary.orbitAveragePowerW}W` : `${summary.orbitAveragePowerW}W`}
          </div>
          <div className="meter-track">
            <div
              className="meter-fill"
              style={{
                width: `${Math.min(100, Math.max(12, ((summary.orbitAveragePowerW + 300) / 800) * 100))}%`,
                backgroundColor: summary.orbitAveragePowerW < 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)'
              }}
            />
          </div>
        </div>

        <div className={`metric-box ${summary.dataGenGbPerDay > summary.downlinkGbPerDay ? 'warn' : ''}`}>
          <div className="metric-label">
            <span>DATA GEN vs DOWNLINK</span>
            <span>BUF: {summary.storageGb} GB</span>
          </div>
          <div className="metric-value">
            {summary.dataGenGbPerDay} / {summary.downlinkGbPerDay} GB/d
          </div>
          <div className="meter-track">
            <div
              className="meter-fill"
              style={{
                width: `${Math.min(100, (summary.dataGenGbPerDay / Math.max(1, summary.downlinkGbPerDay)) * 100)}%`,
                backgroundColor: summary.dataGenGbPerDay > summary.downlinkGbPerDay ? 'var(--accent-amber)' : 'var(--accent-cyan)'
              }}
            />
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-label">
            <span>{phase === 'CDF_BUILDER' ? 'PROJECTED SCIENCE' : 'COLLECTED SCIENCE'}</span>
            <span>{phase === 'LIVE_OPS' && simState ? `DAY ${Math.round(simState.day)}` : '3-YR GOAL'}</span>
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-cyan)' }}>
            {phase === 'CDF_BUILDER'
              ? `~${summary.projectedAnnualScience * 3} pts`
              : `${Math.round(simState?.scienceCollected ?? 0)} pts`}
          </div>
          <div className="meter-track">
            <div
              className="meter-fill"
              style={{
                width:
                  phase === 'CDF_BUILDER'
                    ? '65%'
                    : `${Math.min(100, ((simState?.day ?? 0) / MISSION_TARGET_DAYS) * 100)}%`,
                backgroundColor: 'var(--accent-indigo)'
              }}
            />
          </div>
        </div>
      </section>

      {/* Main 3-Column Engineering & Simulation Workspace */}
      <main className="workspace-grid">
        {/* LEFT PANEL: Subsystem Configuration (Phase 1) or Live Spacecraft Telemetry (Phase 2/3) */}
        <section className="panel" style={{ maxHeight: 'calc(100vh - 205px)', overflowY: 'auto' }}>
          <div className="panel-header">
            <span className="panel-title">
              {phase === 'CDF_BUILDER' ? 'Subsystem Configuration' : 'Live Spacecraft Telemetry'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {phase === 'CDF_BUILDER' ? 'Click to swap hardware' : 'Real-Time Bus Feed'}
            </span>
          </div>

          {phase === 'CDF_BUILDER' ? (
            CATEGORY_ORDER.map((cat) => {
              const items = COMPONENT_CATALOG.filter((c) => c.category === cat.key);
              const isRoleFocused = ROLE_METADATA[activeRole].focusCategories.includes(cat.key);
              return (
                <div key={cat.key} className="category-block">
                  <div className="category-label">
                    <span>{cat.label}</span>
                    {!isRoleFocused && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                        (Other Role Tab)
                      </span>
                    )}
                  </div>
                  {items.map((item) => {
                    const selected = config[cat.configField] === item.id;
                    return (
                      <button
                        key={item.id}
                        className={`option-card ${selected ? 'selected' : ''} ${!isRoleFocused ? 'dimmed' : ''}`}
                        onClick={() => handleSelectComponent(cat.configField, item.id)}
                      >
                        <div className="option-top">
                          <span>{item.name}</span>
                          <span className="option-cost">${item.costM}M</span>
                        </div>
                        <div className="option-specs">{item.shortSpecs}</div>
                        <div className="option-desc">{item.description}</div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          ) : (
            simState && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="metric-box">
                  <div className="metric-label">BUS STRUCTURAL HEALTH</div>
                  <div className="metric-value">{simState.busHealthPct}%</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">STATION-KEEPING PROPELLANT</div>
                  <div className="metric-value">
                    {simState.fuelRemainingKg} / {summary.propellantMassKg} kg
                  </div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">ONBOARD SOLID-STATE RECORDER</div>
                  <div className="metric-value">
                    {simState.bufferUsedGb} / {summary.storageGb} GB
                  </div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">TOTAL DATA DOWNLINKED</div>
                  <div className="metric-value" style={{ color: 'var(--accent-emerald)' }}>
                    {Math.round(simState.dataTransmittedTotalGb)} GB
                  </div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">BUFFER OVERFLOW LOST</div>
                  <div
                    className="metric-value"
                    style={{ color: simState.dataLostOverflowGb > 20 ? 'var(--accent-amber)' : 'inherit' }}
                  >
                    {Math.round(simState.dataLostOverflowGb)} GB
                  </div>
                </div>
              </div>
            )
          )}
        </section>

        {/* CENTER PANEL: Interactive CAD Blueprint or Live Orbital Canvas */}
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">
              {phase === 'CDF_BUILDER'
                ? 'Concurrent Design Facility — Interactive Blueprint'
                : 'Orbital Propagator & Ground Track'}
            </span>
            {phase === 'LIVE_OPS' && simState && !simState.completed && (
              <div className="overlay-pills">
                {[1, 3, 6].map((spd) => (
                  <button
                    key={spd}
                    className={`pill-btn ${simSpeed === spd ? 'active' : ''}`}
                    onClick={() => setSimSpeed(spd)}
                  >
                    {spd}x SPEED
                  </button>
                ))}
              </div>
            )}
          </div>

          {phase === 'CDF_BUILDER' ? (
            <SpacecraftBlueprintCanvas summary={summary} />
          ) : (
            simState && (
              <OrbitalSimulationCanvas
                summary={summary}
                simState={simState}
                phase={phase === 'LAUNCH_SEQUENCE' ? 'LAUNCH' : 'OPS'}
              />
            )
          )}

          {/* Active Mid-Mission Anomaly Prompt */}
          {activeAnomaly && (
            <div className="anomaly-card">
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fde047' }}>
                ⚠ {activeAnomaly.title}
              </div>
              <div style={{ fontSize: '0.82rem' }}>{activeAnomaly.briefing}</div>
              <div className="anomaly-choices">
                {activeAnomaly.choices.map((choice) => {
                  const cannotAffordBudget =
                    choice.budgetDeltaM < 0 && (simState?.budgetRemainingM ?? 0) + choice.budgetDeltaM < 0;
                  const cannotAffordFuel =
                    choice.fuelDeltaKg < 0 && (simState?.fuelRemainingKg ?? 0) + choice.fuelDeltaKg < 0;
                  const disabled = cannotAffordBudget || cannotAffordFuel;

                  return (
                    <button
                      key={choice.id}
                      className="choice-btn"
                      disabled={disabled}
                      style={{ opacity: disabled ? 0.45 : 1 }}
                      onClick={() => handleResolveAnomaly(choice.id)}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {choice.label}{' '}
                        {disabled && (
                          <span style={{ color: 'var(--accent-rose)' }}>
                            (Insufficient {cannotAffordBudget ? 'Reserve Budget' : 'Propellant'})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {choice.detail}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Mission Action Bar */}
          {phase === 'CDF_BUILDER' && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginTop: 'auto',
                paddingTop: '0.5rem'
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {summary.canLaunch
                  ? `Ready for rollout on ${summary.launcher.name} ($${summary.budgetRemainingM}M reserve).`
                  : 'Resolve red engineering blockers on the right before launch.'}
              </div>
              <button
                className="btn-primary"
                disabled={!summary.canLaunch}
                onClick={handleStartLaunch}
              >
                🚀 Approve Design & Launch Mission
              </button>
            </div>
          )}
        </section>

        {/* RIGHT PANEL: Live Trade-Off Diagnostics & Telemetry Log */}
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">Systems Trade-Off Analyzer</span>
          </div>

          <div className="alert-list">
            {summary.alerts.map((alert, i) => (
              <div key={i} className={`alert-item ${alert.level}`}>
                <div style={{ fontWeight: 700, marginBottom: '0.15rem' }}>{alert.title}</div>
                <div>{alert.detail}</div>
              </div>
            ))}
          </div>

          <div className="panel-header" style={{ marginTop: '0.35rem' }}>
            <span className="panel-title">
              {phase === 'CDF_BUILDER' ? 'Mission Brief & Constraints' : 'Mission Operations Log'}
            </span>
          </div>

          {phase === 'CDF_BUILDER' ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <p>
                <strong>Objective:</strong> Map subsurface groundwater aquifers and atmospheric dust plumes across arid mid-latitude belts for <strong>3 full years (1,095 days)</strong>.
              </p>
              <p>
                <strong>Key Trade-Off:</strong> High-resolution <em>L-Band SAR</em> penetrates sand sheets (+20% science), but consumes <strong>450W</strong> and generates <strong>120 GB/day</strong>—requiring deployable solar wings and X-Band/Ka-Band downlink capacity.
              </p>
              <p>
                <strong>Contingency Tip:</strong> Leaving <strong>$9M+</strong> in reserve budget and extra propellant helps survive mid-mission solar storms and ground station outages.
              </p>
            </div>
          ) : (
            simState && (
              <div className="event-log">
                {simState.logs.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`log-entry ${entry.tone === 'highlight' ? 'highlight' : entry.tone === 'warn' ? 'warn' : ''}`}
                  >
                    [DAY {entry.day}] {entry.text}
                  </div>
                ))}
              </div>
            )
          )}
        </section>
      </main>

      {/* End-of-Mission Engineering Post-Mortem Report */}
      {simState?.completed && (
        <PostMortemModal
          summary={summary}
          simState={simState}
          onResetToBuilder={handleResetToBuilder}
        />
      )}
    </div>
  );
}