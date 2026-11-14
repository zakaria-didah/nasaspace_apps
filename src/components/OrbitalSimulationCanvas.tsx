import React, { useEffect, useRef } from 'react';
import { EngineeringSummary, LiveSimulationState } from '../engine/simulationEngine';
import { getProceduralTextures } from '../engine/proceduralTextures';

interface Props {
  summary: EngineeringSummary;
  simState: LiveSimulationState;
  phase: 'LAUNCH' | 'OPS';
}

export const OrbitalSimulationCanvas: React.FC<Props> = ({ summary, simState, phase }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const textures = getProceduralTextures(ctx);
    const W = canvas.width;
    const H = canvas.height;

    // Starfield backdrop
    ctx.drawImage(textures.starfieldCanvas, 0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const earthRadius = 104;

    // Sunlight direction arrow from left
    const sunGrad = ctx.createLinearGradient(0, cy, cx + earthRadius * 1.4, cy);
    sunGrad.addColorStop(0, 'rgba(253, 224, 71, 0.14)');
    sunGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fde047';
    ctx.font = '11px monospace';
    ctx.fillText('☀ SOLAR FLUX VECTOR →', 16, 24);

    // Draw Earth Globe clipped to circle with scrolling procedural albedo map
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, earthRadius, 0, Math.PI * 2);
    ctx.clip();

    const scrollOffset = ((simState.day * 3.5) % 256);
    ctx.drawImage(
      textures.earthAlbedoCanvas,
      scrollOffset,
      0,
      256,
      256,
      cx - earthRadius,
      cy - earthRadius,
      earthRadius * 2,
      earthRadius * 2
    );

    // Night-side terminator shadow (right half of Earth)
    const termGrad = ctx.createLinearGradient(cx - 25, cy, cx + earthRadius, cy);
    termGrad.addColorStop(0, 'rgba(2, 6, 23, 0)');
    termGrad.addColorStop(0.55, 'rgba(2, 6, 23, 0.65)');
    termGrad.addColorStop(1, 'rgba(2, 6, 23, 0.92)');
    ctx.fillStyle = termGrad;
    ctx.fillRect(cx - earthRadius, cy - earthRadius, earthRadius * 2, earthRadius * 2);
    ctx.restore();

    // Atmospheric Limb Glow
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, earthRadius + 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Ground Station Marker on Sunlit Edge
    const gsAngle = -0.32;
    const gsX = cx + Math.cos(gsAngle) * earthRadius;
    const gsY = cy + Math.sin(gsAngle) * earthRadius;
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(gsX, gsY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '10px monospace';
    ctx.fillText('DSN GROUND STATION', gsX + 10, gsY - 4);

    // Orbit Ring
    const orbitRadius = summary.orbit.id === 'orbit-sso' ? 168 : 144;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Satellite Position
    const satAngle = phase === 'LAUNCH' ? -1.45 : simState.orbitAngleRad;
    const satX = cx + Math.cos(satAngle) * orbitRadius;
    const satY = cy + Math.sin(satAngle) * orbitRadius;

    // Nadir Sensor Scan Cone when over Arid Target
    if (phase === 'OPS' && simState.overAridTarget) {
      ctx.fillStyle = summary.instrument.penetratesSandAndDust
        ? 'rgba(245, 158, 11, 0.22)'
        : 'rgba(56, 189, 248, 0.2)';
      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(cx + Math.cos(satAngle - 0.14) * earthRadius, cy + Math.sin(satAngle - 0.14) * earthRadius);
      ctx.lineTo(cx + Math.cos(satAngle + 0.14) * earthRadius, cy + Math.sin(satAngle + 0.14) * earthRadius);
      ctx.closePath();
      ctx.fill();
    }

    // RF Downlink Beam when over Ground Station
    if (phase === 'OPS' && simState.overGroundStation && simState.bufferUsedGb > 1) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(gsX, gsY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Satellite Icon
    ctx.save();
    ctx.translate(satX, satY);
    ctx.rotate(satAngle + Math.PI / 2);
    // Solar wings
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(-18, -3, 36, 6);
    // Bus body
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-5, -6, 10, 12);
    ctx.restore();

    // Status HUD Overlay
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px monospace';
    ctx.fillText(
      phase === 'LAUNCH'
        ? `STAGE 2 ORBITAL INSERTION // TARGET ALT: ${summary.orbit.altitudeKm} KM`
        : `DAY ${Math.round(simState.day)} / 1095  |  ${simState.inEclipse ? 'ECLIPSE (BATTERY)' : 'SUNLIT (CHARGING)'}`,
      16,
      H - 16
    );
  }, [summary, simState, phase]);

  return (
    <div className="canvas-wrapper">
      <canvas ref={canvasRef} width={760} height={410} />
    </div>
  );
};