import React, { useEffect, useRef, useState } from 'react';
import { EngineeringSummary } from '../engine/simulationEngine';
import { getProceduralTextures } from '../engine/proceduralTextures';

interface Props {
  summary: EngineeringSummary;
}

type OverlayLayer = 'STRUCTURAL' | 'POWER' | 'DATA';

export const SpacecraftBlueprintCanvas: React.FC<Props> = ({ summary }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [overlay, setOverlay] = useState<OverlayLayer>('STRUCTURAL');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const textures = getProceduralTextures(ctx);
    const W = canvas.width;
    const H = canvas.height;

    // Background deep blueprint slate + subtle starfield
    ctx.drawImage(textures.starfieldCanvas, 0, 0, W, H);
    ctx.fillStyle = 'rgba(7, 16, 32, 0.72)';
    ctx.fillRect(0, 0, W, H);

    // Architectural Blueprint Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.09)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const cx = W / 2;
    const cy = H / 2 + 8;

    // Scale bus dimensions based on selected bus
    const busW = summary.bus.id === 'bus-micro' ? 92 : summary.bus.id === 'bus-standard' ? 126 : 158;
    const busH = summary.bus.id === 'bus-micro' ? 110 : summary.bus.id === 'bus-standard' ? 140 : 168;

    // 1. Solar Array Wings (Left & Right)
    const wingSpan =
      summary.power.id === 'pwr-basic' ? 0 : summary.power.id === 'pwr-deployable' ? 165 : 225;
    const wingHeight = summary.power.id === 'pwr-highcap' ? 76 : 56;

    if (wingSpan > 0) {
      // Struts
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - busW / 2 - 22, cy);
      ctx.lineTo(cx + busW / 2 + 22, cy);
      ctx.stroke();

      // Left & Right Photovoltaic Panels
      ctx.fillStyle = textures.solarCellPattern || '#1e3a8a';
      ctx.strokeStyle = overlay === 'POWER' ? '#facc15' : '#38bdf8';
      ctx.lineWidth = overlay === 'POWER' ? 2.5 : 1.5;

      // Left Wing
      ctx.fillRect(cx - busW / 2 - 20 - wingSpan, cy - wingHeight / 2, wingSpan, wingHeight);
      ctx.strokeRect(cx - busW / 2 - 20 - wingSpan, cy - wingHeight / 2, wingSpan, wingHeight);

      // Right Wing
      ctx.fillRect(cx + busW / 2 + 20, cy - wingHeight / 2, wingSpan, wingHeight);
      ctx.strokeRect(cx + busW / 2 + 20, cy - wingHeight / 2, wingSpan, wingHeight);
    }

    // 2. Main Spacecraft Bus Chassis (Brushed Aluminum + Gold Kapton MLI Core)
    ctx.fillStyle = textures.aluminumPattern || '#64748b';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.fillRect(cx - busW / 2, cy - busH / 2, busW, busH);
    ctx.strokeRect(cx - busW / 2, cy - busH / 2, busW, busH);

    // Gold Kapton Thermal Blanket Inset
    const inset = 14;
    ctx.fillStyle = textures.kaptonGoldPattern || '#d97706';
    ctx.fillRect(cx - busW / 2 + inset, cy - busH / 2 + inset, busW - inset * 2, busH - inset * 2);
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
    ctx.strokeRect(cx - busW / 2 + inset, cy - busH / 2 + inset, busW - inset * 2, busH - inset * 2);

    // Body-mounted solar cells if pwr-basic
    if (summary.power.id === 'pwr-basic') {
      ctx.fillStyle = textures.solarCellPattern || '#1e3a8a';
      ctx.fillRect(cx - busW / 2 + 20, cy - busH / 2 + 22, busW - 40, busH - 44);
    }

    // 3. Top Communications Dish (S-Band / X-Band / Ka-Band)
    const dishRadius =
      summary.comms.id === 'comms-sband' ? 16 : summary.comms.id === 'comms-xband' ? 28 : 38;
    ctx.strokeStyle = overlay === 'DATA' ? '#34d399' : '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - busH / 2);
    ctx.lineTo(cx, cy - busH / 2 - 22);
    ctx.stroke();

    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy - busH / 2 - 24, dishRadius, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Feed horn
    ctx.beginPath();
    ctx.moveTo(cx, cy - busH / 2 - 24);
    ctx.lineTo(cx, cy - busH / 2 - 24 - dishRadius * 0.75);
    ctx.stroke();

    // 4. Bottom Nadir Scientific Payload (Optical vs L-Band SAR vs Dual-Band SAR + Lidar)
    const nadirY = cy + busH / 2;
    if (summary.instrument.id === 'inst-optical') {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fillRect(cx - 26, nadirY, 52, 26);
      ctx.strokeRect(cx - 26, nadirY, 52, 26);
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(cx, nadirY + 13, 9, 0, Math.PI * 2);
      ctx.fill();
    } else if (summary.instrument.id === 'inst-sar') {
      // Wide phased-array SAR radar plank
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.fillRect(cx - 78, nadirY + 4, 156, 20);
      ctx.strokeRect(cx - 78, nadirY + 4, 156, 20);
    } else {
      // Dual-Band SAR + Lidar Telescope
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.fillRect(cx - 92, nadirY + 4, 184, 22);
      ctx.strokeRect(cx - 92, nadirY + 4, 184, 22);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(cx - 14, nadirY + 26, 28, 14);
    }

    // 5. Subsystem Overlay Flows
    if (overlay === 'POWER') {
      ctx.strokeStyle = '#facc15';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - busW / 2 - 25, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + busW / 2 + 25, cy);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, nadirY + 12);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (overlay === 'DATA') {
      ctx.strokeStyle = '#34d399';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, nadirY + 10);
      ctx.lineTo(cx, cy - busH / 2 - 26);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Dimension & Callout Annotations
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(`BUS: ${summary.bus.name.toUpperCase()}`, 16, 24);
    ctx.fillText(`PAYLOAD: ${summary.instrument.name.toUpperCase()}`, 16, 40);
    ctx.fillText(`ORBIT: ${summary.orbit.name.toUpperCase()}`, 16, H - 16);
    ctx.fillText(`WET MASS: ${summary.wetMassKg} / ${summary.maxLaunchMassKg} KG`, W - 215, H - 16);
  }, [summary, overlay]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          CAD SCHEMATIC VIEWPORT // LAYER: {overlay}
        </span>
        <div className="overlay-pills">
          {(['STRUCTURAL', 'POWER', 'DATA'] as OverlayLayer[]).map((layer) => (
            <button
              key={layer}
              className={`pill-btn ${overlay === layer ? 'active' : ''}`}
              onClick={() => setOverlay(layer)}
            >
              {layer}
            </button>
          ))}
        </div>
      </div>
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} width={760} height={410} />
      </div>
    </div>
  );
};