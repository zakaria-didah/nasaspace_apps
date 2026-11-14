import React from 'react';
import { MISSION_BUDGET_CAP_M, MISSION_TARGET_DAYS } from '../data/missionData';
import { EngineeringSummary, LiveSimulationState } from '../engine/simulationEngine';

interface Props {
  summary: EngineeringSummary;
  simState: LiveSimulationState;
  onResetToBuilder: () => void;
}

export const PostMortemModal: React.FC<Props> = ({ summary, simState, onResetToBuilder }) => {
  const retentionPct =
    simState.dataGeneratedTotalGb > 0
      ? Math.min(100, Math.round((simState.dataTransmittedTotalGb / simState.dataGeneratedTotalGb) * 100))
      : 100;

  const finalScore = simState.failedReason
    ? Math.round(simState.scienceCollected * 0.4)
    : Math.round(
        simState.scienceCollected * 2.4 +
          simState.budgetRemainingM * 4 +
          simState.busHealthPct * 2 +
          retentionPct * 1.5
      );

  let grade = 'C';
  if (simState.failedReason) grade = 'FAILED';
  else if (finalScore >= 1150) grade = 'S';
  else if (finalScore >= 920) grade = 'A';
  else if (finalScore >= 720) grade = 'B';

  const nasaBenchmark =
    summary.instrument.id === 'inst-hybrid'
      ? 'Comparable to NASA NISAR + CALIPSO joint Earth-system architecture'
      : summary.instrument.id === 'inst-sar'
      ? 'Comparable to NASA SMAP (Soil Moisture Active Passive) L-band hydrology observatory'
      : 'Comparable to NASA Landsat 9 surface thermal/optical monitoring tier';

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="mission-badge">NASA POST-MISSION ENGINEERING REPORT</span>
            <h2 style={{ marginTop: '0.4rem', fontSize: '1.35rem' }}>
              Operation Desert Pulse — Final Evaluation
            </h2>
          </div>
          <button className="btn-secondary" onClick={onResetToBuilder}>
            Redesign Spacecraft
          </button>
        </div>

        <div className="grade-banner">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              TOTAL COMPOSITE SCORE
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {finalScore} PTS
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
              {simState.failedReason
                ? simState.failedReason
                : `Completed full ${MISSION_TARGET_DAYS}-day primary mission in ${summary.orbit.name}.`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MISSION GRADE</div>
            <div
              className="grade-letter"
              style={{ color: grade === 'FAILED' ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}
            >
              {grade}
            </div>
          </div>
        </div>

        <div className="report-grid">
          <div className="metric-box">
            <div className="metric-label">SCIENCE YIELD</div>
            <div className="metric-value" style={{ color: 'var(--accent-cyan)' }}>
              {Math.round(simState.scienceCollected)} pts
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-label">DATA RETENTION</div>
            <div className="metric-value">{retentionPct}%</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">OVERFLOW LOST</div>
            <div
              className="metric-value"
              style={{ color: simState.dataLostOverflowGb > 50 ? 'var(--accent-amber)' : 'inherit' }}
            >
              {Math.round(simState.dataLostOverflowGb)} GB
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-label">BUDGET RESERVE</div>
            <div className="metric-value" style={{ color: 'var(--accent-emerald)' }}>
              ${simState.budgetRemainingM}M / ${MISSION_BUDGET_CAP_M}M
            </div>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-label">SYSTEMS ENGINEERING ROOT-CAUSE DIAGNOSTICS</div>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <li>
              <strong>Subsurface Aquifer Capability:</strong>{' '}
              {summary.instrument.penetratesSandAndDust
                ? 'L-Band Radar penetrated arid sand sheets and dust storms for high-value aquifer telemetry.'
                : 'Optical sensor was blocked by subsurface sand and dust plumes, limiting science yield.'}
            </li>
            <li>
              <strong>Downlink & Buffer Efficiency:</strong>{' '}
              {simState.dataLostOverflowGb > 100
                ? `Lost ${Math.round(simState.dataLostOverflowGb)} GB due to insufficient antenna downlink bandwidth relative to sensor data generation.`
                : 'Comms antenna and solid-state recorder kept pace with daily instrument data volume.'}
            </li>
            <li>
              <strong>Historical NASA Mission Benchmark:</strong> {nasaBenchmark}.
            </li>
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={onResetToBuilder}>
            Iterate Design & Launch New Mission
          </button>
        </div>
      </div>
    </div>
  );
};