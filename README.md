# ORBITAL ARCHITECT: Mission Control (NASA Space Apps 2026 Prototype)

An interactive **1-to-4 player cooperative space systems-engineering and orbital simulation game** built for the **2026 NASA Space Apps Challenge ("Space Mission Design Game")**, featuring the flagship scenario **Operation Desert Pulse** (Earth Observation & Subsurface Aquifer Hydrology).

---

## 1. Chosen Tech Stack & Procedural Architecture

To ensure the prototype runs out of the box with **zero external asset dependencies or broken texture URLs**, everything is self-contained in TypeScript:

* **Framework:** React 19 + TypeScript + Vite
* **Rendering Engine:** Dual HTML5 `<canvas>` pipelines:
  * **Concurrent Design Facility (CDF) Blueprint Canvas:** Real-time procedural spacecraft assembly schematic with toggleable **Structural**, **Power Grid**, and **Data Bus** telemetry overlays.
  * **Orbital Operations Canvas:** Real-time planetary orbit propagator with sunlit/eclipse terminator physics, arid target-belt ground tracks, ground-station RF downlink beams, and mid-mission anomaly visuals.
* **Procedural Textures (`src/engine/proceduralTextures.ts`):** Offscreen `<canvas>` generators creating deep-space starfields, brushed aerospace aluminum patterns, crinkled gold Kapton MLI foil, gallium-arsenide photovoltaic solar cell grids, and a procedural Earth globe with desert belts and cloud layers.
* **Procedural Audio (`src/engine/soundEffects.ts`):** Zero-file Web Audio API synthesizer producing telemetry clicks, component lock-in chimes, launch ignition rumbles, anomaly klaxons, and downlink data bursts.

---

## 2. Project Structure

```text
orbital-architect/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── src/
    ├── main.tsx
    ├── styles.css
    ├── App.tsx
    ├── data/
    │   └── missionData.ts
    ├── engine/
    │   ├── proceduralTextures.ts
    │   ├── soundEffects.ts
    │   └── simulationEngine.ts
    └── components/
        ├── SpacecraftBlueprintCanvas.tsx
        ├── OrbitalSimulationCanvas.tsx
        └── PostMortemModal.tsx