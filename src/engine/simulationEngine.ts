import {
  COMPONENT_CATALOG,
  MISSION_BUDGET_CAP_M,
  MISSION_TARGET_DAYS,
  MissionConfig,
  SpacecraftComponent
} from '../data/missionData';

export interface EngineeringAlert {
  level: 'blocker' | 'warning' | 'optimal';
  title: string;
  detail: string;
}

export interface EngineeringSummary {
  bus: SpacecraftComponent;
  instrument: SpacecraftComponent;
  power: SpacecraftComponent;
  comms: SpacecraftComponent;
  orbit: SpacecraftComponent;
  launcher: SpacecraftComponent;
  totalCostM: number;
  budgetRemainingM: number;
  dryMassKg: number;
  propellantMassKg: number;
  wetMassKg: number;
  maxLaunchMassKg: number;
  payloadMassKg: number;
  maxBusPayloadKg: number;
  sunlitPowerGenW: number;
  totalPowerDrawW: number;
  orbitAveragePowerW: number;
  eclipseDurationHours: number;
  eclipseEnergyRequiredWh: number;
  batteryCapacityWh: number;
  dataGenGbPerDay: number;
  downlinkGbPerDay: number;
  storageGb: number;
  projectedAnnualScience: number;
  canLaunch: boolean;
  alerts: EngineeringAlert[];
}

export interface LiveSimulationState {
  day: number;
  orbitAngleRad: number;
  inEclipse: boolean;
  overGroundStation: boolean;
  overAridTarget: boolean;
  batteryPct: number;
  bufferUsedGb: number;
  fuelRemainingKg: number;
  busHealthPct: number;
  budgetRemainingM: number;
  scienceCollected: number;
  dataGeneratedTotalGb: number;
  dataTransmittedTotalGb: number;
  dataLostOverflowGb: number;
  resolvedAnomalyIds: string[];
  activeAnomalyId: string | null;
  dutyCycleThrottle: number; // 0.0 to 1.0
  logs: { day: number; text: string; tone: 'normal' | 'highlight' | 'warn' }[];
  completed: boolean;
  failedReason: string | null;
}

export function getComponentById(id: string): SpacecraftComponent {
  const found = COMPONENT_CATALOG.find((c) => c.id === id);
  if (!found) {
    throw new Error(`Unknown component ID: ${id}`);
  }
  return found;
}

export function evaluateDesign(config: MissionConfig): EngineeringSummary {
  const bus = getComponentById(config.busId);
  const instrument = getComponentById(config.instrumentId);
  const power = getComponentById(config.powerId);
  const comms = getComponentById(config.commsId);
  const orbit = getComponentById(config.orbitId);
  const launcher = getComponentById(config.launcherId);

  const selected = [bus, instrument, power, comms, orbit, launcher];
  const totalCostM = selected.reduce((sum, item) => sum + item.costM, 0);
  const budgetRemainingM = MISSION_BUDGET_CAP_M - totalCostM;

  const dryMassKg = bus.massKg + instrument.massKg + power.massKg + comms.massKg;
  const propellantMassKg = orbit.massKg;
  const wetMassKg = dryMassKg + propellantMassKg;

  const maxLaunchMassKg =
    orbit.id === 'orbit-sso' ? launcher.maxMassSsoKg ?? 380 : launcher.maxMassLeoKg ?? 480;

  const payloadMassKg = instrument.massKg + comms.massKg;
  const maxBusPayloadKg = bus.maxPayloadKg ?? 500;

  const sunlitPowerGenW = power.powerW;
  const totalPowerDrawW = Math.abs(bus.powerW) + Math.abs(instrument.powerW) + Math.abs(comms.powerW);
  const eclipseFrac = orbit.eclipseFraction ?? 0.25;
  const orbitAveragePowerW = Math.round(sunlitPowerGenW * (1 - eclipseFrac) - totalPowerDrawW);

  // 95-minute orbital period (~1.58 hours)
  const eclipseDurationHours = +(1.58 * eclipseFrac).toFixed(2);
  const eclipseEnergyRequiredWh = Math.round(totalPowerDrawW * eclipseDurationHours);
  const batteryCapacityWh = power.batteryWh ?? 450;

  const dataGenGbPerDay = instrument.dataGenGbPerDay ?? 20;
  const downlinkGbPerDay = comms.downlinkGbPerDay ?? 30;
  const storageGb = comms.storageGb ?? 64;

  const baseSci = instrument.scienceBasePerYear ?? 50;
  const orbitMult = orbit.scienceMultiplier ?? 1.0;
  const sandBonus = instrument.penetratesSandAndDust ? 1.2 : 0.78;
  const projectedAnnualScience = Math.round(baseSci * orbitMult * sandBonus);

  const alerts: EngineeringAlert[] = [];

  if (budgetRemainingM < 0) {
    alerts.push({
      level: 'blocker',
      title: `Budget Exceeded by $${Math.abs(budgetRemainingM)}M`,
      detail: `Mission cost ($${totalCostM}M) exceeds NASA's $${MISSION_BUDGET_CAP_M}M cap. Downsize rocket or subsystems.`
    });
  }

  if (wetMassKg > maxLaunchMassKg) {
    alerts.push({
      level: 'blocker',
      title: `Launch Mass Exceeded (+${wetMassKg - maxLaunchMassKg} kg)`,
      detail: `${launcher.name} only lifts ${maxLaunchMassKg} kg to ${orbit.name}. Upgrade rocket or trim mass.`
    });
  }

  if (payloadMassKg > maxBusPayloadKg) {
    alerts.push({
      level: 'blocker',
      title: `Bus Structural Overload (+${payloadMassKg - maxBusPayloadKg} kg)`,
      detail: `${bus.name} supports max ${maxBusPayloadKg} kg of instruments + comms.`
    });
  }

  if (orbitAveragePowerW < 0) {
    alerts.push({
      level: 'warning',
      title: `Negative Orbit-Average Power (${orbitAveragePowerW}W)`,
      detail: `Solar generation cannot sustain continuous sensor operations; duty-cycle throttling will occur in orbit.`
    });
  }

  if (eclipseEnergyRequiredWh > batteryCapacityWh) {
    alerts.push({
      level: 'warning',
      title: `Eclipse Battery Deficit (${eclipseEnergyRequiredWh}Wh needed vs ${batteryCapacityWh}Wh)`,
      detail: `Deep eclipse drain in ${orbit.name} will trigger brownouts unless batteries or orbit are adjusted.`
    });
  }

  if (dataGenGbPerDay > downlinkGbPerDay) {
    alerts.push({
      level: 'warning',
      title: `Downlink Bottleneck (${dataGenGbPerDay} GB/day vs ${downlinkGbPerDay} GB/day)`,
      detail: `Sensor generates data faster than your antenna can transmit. Expect onboard buffer overflow losses.`
    });
  }

  if (!instrument.penetratesSandAndDust) {
    alerts.push({
      level: 'warning',
      title: 'Optical Sensor Subsurface Limitation',
      detail: 'Optical/Thermal imaging maps surface heat but cannot penetrate dry desert sand to measure deep aquifers.'
    });
  }

  const canLaunch = alerts.every((a) => a.level !== 'blocker');

  if (canLaunch && alerts.length === 0) {
    alerts.push({
      level: 'optimal',
      title: 'All Subsystems Nominal & Balanced',
      detail: `Positive power margin (+${orbitAveragePowerW}W), zero downlink bottleneck, and $${budgetRemainingM}M contingency reserve.`
    });
  }

  return {
    bus,
    instrument,
    power,
    comms,
    orbit,
    launcher,
    totalCostM,
    budgetRemainingM,
    dryMassKg,
    propellantMassKg,
    wetMassKg,
    maxLaunchMassKg,
    payloadMassKg,
    maxBusPayloadKg,
    sunlitPowerGenW,
    totalPowerDrawW,
    orbitAveragePowerW,
    eclipseDurationHours,
    eclipseEnergyRequiredWh,
    batteryCapacityWh,
    dataGenGbPerDay,
    downlinkGbPerDay,
    storageGb,
    projectedAnnualScience,
    canLaunch,
    alerts
  };
}

export function createInitialSimulationState(summary: EngineeringSummary): LiveSimulationState {
  return {
    day: 0,
    orbitAngleRad: 0.35,
    inEclipse: false,
    overGroundStation: false,
    overAridTarget: true,
    batteryPct: 100,
    bufferUsedGb: 0,
    fuelRemainingKg: summary.propellantMassKg,
    busHealthPct: 100,
    budgetRemainingM: summary.budgetRemainingM,
    scienceCollected: 0,
    dataGeneratedTotalGb: 0,
    dataTransmittedTotalGb: 0,
    dataLostOverflowGb: 0,
    resolvedAnomalyIds: [],
    activeAnomalyId: null,
    dutyCycleThrottle: 1.0,
    logs: [
      {
        day: 0,
        text: `SECO confirmed! ${summary.bus.name} inserted into ${summary.orbit.name}.`,
        tone: 'highlight'
      },
      {
        day: 0,
        text: `Solar arrays deployed (+${summary.sunlitPowerGenW}W peak). Reserve budget: $${summary.budgetRemainingM}M.`,
        tone: 'normal'
      }
    ],
    completed: false,
    failedReason: null
  };
}

export function stepSimulationDay(
  prev: LiveSimulationState,
  summary: EngineeringSummary,
  daysDelta: number
): LiveSimulationState {
  if (prev.completed || prev.activeAnomalyId) return prev;

  const nextDay = Math.min(MISSION_TARGET_DAYS, prev.day + daysDelta);
  const elapsedDays = nextDay - prev.day;
  if (elapsedDays <= 0) return prev;

  const orbitAngleRad = (prev.orbitAngleRad + elapsedDays * 0.42) % (Math.PI * 2);
  const normAngle = orbitAngleRad / (Math.PI * 2);

  // Eclipse window positioned on night side of Earth
  const eclipseFrac = summary.orbit.eclipseFraction ?? 0.25;
  const inEclipse = normAngle > 0.5 - eclipseFrac / 2 && normAngle < 0.5 + eclipseFrac / 2;

  // Ground station pass window & arid target belt pass
  const overGroundStation = normAngle < 0.24 || normAngle > 0.88;
  const overAridTarget = normAngle >= 0.14 && normAngle <= 0.46;

  // Power & Battery dynamics
  let batteryPct = prev.batteryPct;
  let effectiveThrottle = prev.dutyCycleThrottle;

  if (summary.orbitAveragePowerW < 0) {
    batteryPct = Math.max(18, batteryPct - elapsedDays * 1.4);
    if (batteryPct <= 25) {
      effectiveThrottle = Math.max(0.45, summary.sunlitPowerGenW / Math.max(1, summary.totalPowerDrawW));
    }
  } else {
    batteryPct = inEclipse
      ? Math.max(35, 100 - (summary.eclipseEnergyRequiredWh / summary.batteryCapacityWh) * 55)
      : Math.min(100, batteryPct + elapsedDays * 4);
    effectiveThrottle = 1.0;
  }

  // Station-keeping propellant burn
  const dailyFuelBurn = summary.propellantMassKg / (MISSION_TARGET_DAYS * 1.08);
  const fuelRemainingKg = Math.max(0, +(prev.fuelRemainingKg - dailyFuelBurn * elapsedDays).toFixed(2));

  let busHealthPct = prev.busHealthPct;
  if (fuelRemainingKg <= 0.1) {
    busHealthPct = Math.max(0, busHealthPct - elapsedDays * 0.35);
  }

  // Data generation, storage buffer & downlink
  const dailyGen = summary.dataGenGbPerDay * effectiveThrottle * elapsedDays;
  let bufferUsedGb = prev.bufferUsedGb + dailyGen;
  let dataLostOverflowGb = prev.dataLostOverflowGb;

  if (bufferUsedGb > summary.storageGb) {
    const overflow = bufferUsedGb - summary.storageGb;
    dataLostOverflowGb += overflow;
    bufferUsedGb = summary.storageGb;
  }

  const dailyDownlinkCapacity = summary.downlinkGbPerDay * elapsedDays;
  const transmitted = Math.min(bufferUsedGb, dailyDownlinkCapacity);
  bufferUsedGb -= transmitted;

  const dataGeneratedTotalGb = prev.dataGeneratedTotalGb + dailyGen;
  const dataTransmittedTotalGb = prev.dataTransmittedTotalGb + transmitted;

  // Science yield scales with transmitted data integrity & orbital multipliers
  const dailyScienceRate = (summary.projectedAnnualScience / 365) * effectiveThrottle;
  const retentionRatio = dailyGen > 0 ? transmitted / dailyGen : 1;
  const scienceGain = dailyScienceRate * elapsedDays * (0.35 + 0.65 * retentionRatio);
  const scienceCollected = prev.scienceCollected + scienceGain;

  const logs = [...prev.logs];
  if (Math.floor(nextDay / 180) > Math.floor(prev.day / 180)) {
    const months = Math.round(nextDay / 30);
    logs.unshift({
      day: Math.round(nextDay),
      text: `Month ${months} Telemetry: ${Math.round(scienceCollected)} Sci | Buffer ${Math.round(bufferUsedGb)}/${summary.storageGb} GB | Fuel ${fuelRemainingKg.toFixed(1)} kg`,
      tone: 'normal'
    });
  }

  let completed = nextDay >= MISSION_TARGET_DAYS;
  let failedReason: string | null = null;

  if (busHealthPct <= 0) {
    completed = true;
    failedReason = 'Spacecraft de-orbited early after exhausting station-keeping propellant.';
    logs.unshift({
      day: Math.round(nextDay),
      text: 'CRITICAL LOSS OF SIGNAL: Orbital decay caused premature atmospheric reentry.',
      tone: 'warn'
    });
  } else if (completed) {
    logs.unshift({
      day: MISSION_TARGET_DAYS,
      text: 'MISSION COMPLETE: 3-Year Primary Earth Observation Objective Achieved!',
      tone: 'highlight'
    });
  }

  return {
    ...prev,
    day: nextDay,
    orbitAngleRad,
    inEclipse,
    overGroundStation,
    overAridTarget,
    batteryPct: Math.round(batteryPct),
    bufferUsedGb: +bufferUsedGb.toFixed(1),
    fuelRemainingKg,
    busHealthPct: Math.round(busHealthPct),
    scienceCollected: +scienceCollected.toFixed(1),
    dataGeneratedTotalGb: +dataGeneratedTotalGb.toFixed(1),
    dataTransmittedTotalGb: +dataTransmittedTotalGb.toFixed(1),
    dataLostOverflowGb: +dataLostOverflowGb.toFixed(1),
    logs: logs.slice(0, 35),
    completed,
    failedReason
  };
}