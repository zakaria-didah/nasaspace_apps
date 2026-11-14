export type TeamRole = 'ALL' | 'SCIENCE' | 'POWER' | 'FLIGHT' | 'COMMS';

export type ComponentCategory =
  | 'bus'
  | 'instrument'
  | 'power'
  | 'comms'
  | 'orbit'
  | 'launcher';

export interface SpacecraftComponent {
  id: string;
  category: ComponentCategory;
  ownerRole: Exclude<TeamRole, 'ALL'>;
  name: string;
  costM: number; // $ Millions
  massKg: number; // Dry or propellant mass (kg)
  powerW: number; // Positive = generates power, Negative = consumes power
  batteryWh?: number;
  maxPayloadKg?: number;
  dataGenGbPerDay?: number;
  downlinkGbPerDay?: number;
  storageGb?: number;
  scienceBasePerYear?: number;
  penetratesSandAndDust?: boolean;
  altitudeKm?: number;
  inclinationDeg?: number;
  eclipseFraction?: number;
  scienceMultiplier?: number;
  maxMassLeoKg?: number;
  maxMassSsoKg?: number;
  shortSpecs: string;
  description: string;
}

export interface MissionConfig {
  busId: string;
  instrumentId: string;
  powerId: string;
  commsId: string;
  orbitId: string;
  launcherId: string;
}

export interface AnomalyChoice {
  id: string;
  label: string;
  detail: string;
  budgetDeltaM: number;
  fuelDeltaKg: number;
  scienceDelta: number;
  healthDelta: number;
  logMessage: string;
}

export interface MissionAnomaly {
  id: string;
  triggerDay: number;
  title: string;
  severity: 'WARNING' | 'CRITICAL' | 'OPPORTUNITY';
  briefing: string;
  choices: AnomalyChoice[];
}

export const MISSION_BUDGET_CAP_M = 180;
export const MISSION_TARGET_DAYS = 1095; // 3-Year Operational Lifetime

export const ROLE_METADATA: Record<
  TeamRole,
  { label: string; subtitle: string; focusCategories: ComponentCategory[] }
> = {
  ALL: {
    label: 'Unified Director (Solo)',
    subtitle: 'Full mission authority across all spacecraft and flight subsystems',
    focusCategories: ['bus', 'instrument', 'power', 'comms', 'orbit', 'launcher']
  },
  SCIENCE: {
    label: 'Principal Investigator',
    subtitle: 'Payload sensors, aquifer penetration & scientific data yield',
    focusCategories: ['instrument']
  },
  POWER: {
    label: 'Systems & Power Lead',
    subtitle: 'Structural bus, solar arrays, battery eclipse margins & thermal balance',
    focusCategories: ['bus', 'power']
  },
  FLIGHT: {
    label: 'Flight Dynamics Lead',
    subtitle: 'Orbital altitude, Sun-Synchronous geometry & launch vehicle capacity',
    focusCategories: ['orbit', 'launcher']
  },
  COMMS: {
    label: 'Comms & Mission Director',
    subtitle: 'Downlink bandwidth, onboard solid-state buffer & $180M budget cap',
    focusCategories: ['comms']
  }
};

export const COMPONENT_CATALOG: SpacecraftComponent[] = [
  // 1. SPACECRAFT BUS
  {
    id: 'bus-micro',
    category: 'bus',
    ownerRole: 'POWER',
    name: 'MicroSat-XL Modular Bus',
    costM: 14,
    massKg: 55,
    powerW: -40,
    maxPayloadKg: 270,
    shortSpecs: '55 kg | -40W | Max Payload: 270 kg',
    description: 'Lightweight carbon-composite frame ideal for small-lift rockets, but tight structural volume.'
  },
  {
    id: 'bus-standard',
    category: 'bus',
    ownerRole: 'POWER',
    name: 'ESPA-Class Precision Bus',
    costM: 28,
    massKg: 120,
    powerW: -75,
    maxPayloadKg: 650,
    shortSpecs: '120 kg | -75W | Max Payload: 650 kg',
    description: 'Standard NASA Earth-science bus with 3-axis reaction wheels and high thermal stability.'
  },
  {
    id: 'bus-heavy',
    category: 'bus',
    ownerRole: 'POWER',
    name: 'Deep-Survey Heavy Bus',
    costM: 46,
    massKg: 220,
    powerW: -110,
    maxPayloadKg: 1200,
    shortSpecs: '220 kg | -110W | Max Payload: 1,200 kg',
    description: 'Redundant avionics, star trackers, and reinforced propellant tanks for multi-instrument suites.'
  },

  // 2. SCIENTIFIC INSTRUMENTS
  {
    id: 'inst-optical',
    category: 'instrument',
    ownerRole: 'SCIENCE',
    name: 'Multispectral Optical + Thermal Imager',
    costM: 18,
    massKg: 65,
    powerW: -110,
    dataGenGbPerDay: 18,
    scienceBasePerYear: 48,
    penetratesSandAndDust: false,
    shortSpecs: '65 kg | -110W | 18 GB/day | 48 Sci/yr',
    description: 'Maps surface vegetation stress and land temperature, but cannot penetrate dry desert sand or dust storms.'
  },
  {
    id: 'inst-sar',
    category: 'instrument',
    ownerRole: 'SCIENCE',
    name: 'L-Band Synthetic Aperture Radar (SAR)',
    costM: 42,
    massKg: 210,
    powerW: -450,
    dataGenGbPerDay: 120,
    scienceBasePerYear: 98,
    penetratesSandAndDust: true,
    shortSpecs: '210 kg | -450W | 120 GB/day | 98 Sci/yr',
    description: 'Penetrates arid sand sheets to map subsurface soil moisture and ancient aquifers day or night.'
  },
  {
    id: 'inst-hybrid',
    category: 'instrument',
    ownerRole: 'SCIENCE',
    name: 'Dual-Band SAR + Atmospheric Lidar',
    costM: 56,
    massKg: 265,
    powerW: -530,
    dataGenGbPerDay: 150,
    scienceBasePerYear: 128,
    penetratesSandAndDust: true,
    shortSpecs: '265 kg | -530W | 150 GB/day | 128 Sci/yr',
    description: 'Flagship payload combining subsurface hydrology radar with vertical dust-aerosol laser profiling.'
  },

  // 3. POWER & BATTERY SYSTEMS
  {
    id: 'pwr-basic',
    category: 'power',
    ownerRole: 'POWER',
    name: 'Body-Mounted GaAs Panels + 450Wh Li-Ion',
    costM: 10,
    massKg: 32,
    powerW: 320,
    batteryWh: 450,
    shortSpecs: '32 kg | +320W Sun | 450Wh Battery',
    description: 'No deployment mechanisms required, but insufficient wattage for active radar instruments.'
  },
  {
    id: 'pwr-deployable',
    category: 'power',
    ownerRole: 'POWER',
    name: 'Dual-Wing Solar Arrays + 1,400Wh Battery',
    costM: 22,
    massKg: 68,
    powerW: 820,
    batteryWh: 1400,
    shortSpecs: '68 kg | +820W Sun | 1,400Wh Battery',
    description: 'Articulated solar wings sustain high-draw radar passes and deep orbital eclipses.'
  },
  {
    id: 'pwr-highcap',
    category: 'power',
    ownerRole: 'POWER',
    name: 'Triple-Junction UltraFlex + 2,600Wh Battery',
    costM: 34,
    massKg: 105,
    powerW: 1320,
    batteryWh: 2600,
    shortSpecs: '105 kg | +1,320W Sun | 2,600Wh Battery',
    description: 'High-margin power architecture capable of continuous radar + lidar duty cycles.'
  },

  // 4. COMMUNICATIONS & ONBOARD DATA BUFFER
  {
    id: 'comms-sband',
    category: 'comms',
    ownerRole: 'COMMS',
    name: 'S-Band Transceiver + 64 GB Recorder',
    costM: 8,
    massKg: 18,
    powerW: -35,
    downlinkGbPerDay: 28,
    storageGb: 64,
    shortSpecs: '18 kg | -35W | Downlink: 28 GB/day | 64 GB Buffer',
    description: 'Low-cost telemetry link. Will overflow onboard memory rapidly if paired with high-rate radar.'
  },
  {
    id: 'comms-xband',
    category: 'comms',
    ownerRole: 'COMMS',
    name: 'X-Band Gimbaled Dish + 256 GB Recorder',
    costM: 16,
    massKg: 34,
    powerW: -75,
    downlinkGbPerDay: 115,
    storageGb: 256,
    shortSpecs: '34 kg | -75W | Downlink: 115 GB/day | 256 GB Buffer',
    description: 'Balanced Earth-science downlink supporting high-volume radar observations over ground stations.'
  },
  {
    id: 'comms-kaband',
    category: 'comms',
    ownerRole: 'COMMS',
    name: 'Ka-Band High-Gain Dish + 512 GB Recorder',
    costM: 26,
    massKg: 52,
    powerW: -120,
    downlinkGbPerDay: 220,
    storageGb: 512,
    shortSpecs: '52 kg | -120W | Downlink: 220 GB/day | 512 GB Buffer',
    description: 'Rapid burst downlink clears massive radar + lidar buffers in a single 8-minute pass.'
  },

  // 5. TARGET ORBIT
  {
    id: 'orbit-leo',
    category: 'orbit',
    ownerRole: 'FLIGHT',
    name: 'Low Earth Orbit (450 km, 52° Inclination)',
    costM: 6,
    massKg: 65, // Station-keeping propellant required against atmospheric drag
    powerW: 0,
    altitudeKm: 450,
    inclinationDeg: 52,
    eclipseFraction: 0.38,
    scienceMultiplier: 1.0,
    shortSpecs: '450 km | 65 kg Fuel | 38% Eclipse | 1.0x Sci',
    description: 'Easier rocket insertion, but heavier atmospheric drag demands 65 kg fuel and causes long 38% eclipses.'
  },
  {
    id: 'orbit-sso',
    category: 'orbit',
    ownerRole: 'FLIGHT',
    name: 'Sun-Synchronous Orbit (650 km, 98° Dawn-Dusk)',
    costM: 12,
    massKg: 22, // Minimal drag propellant needed
    powerW: 0,
    altitudeKm: 650,
    inclinationDeg: 98,
    eclipseFraction: 0.12,
    scienceMultiplier: 1.25,
    shortSpecs: '650 km | 22 kg Fuel | 12% Eclipse | 1.25x Sci',
    description: 'Near-constant solar illumination (12% eclipse) and repeatable lighting over arid belts, but requires higher launch energy.'
  },

  // 6. LAUNCH VEHICLE
  {
    id: 'lv-small',
    category: 'launcher',
    ownerRole: 'FLIGHT',
    name: 'Small-Lift Dedicated Launcher',
    costM: 42,
    massKg: 0,
    powerW: 0,
    maxMassLeoKg: 480,
    maxMassSsoKg: 380,
    shortSpecs: '$42M | Max LEO: 480 kg | Max SSO: 380 kg',
    description: 'Budget-friendly rocket ideal for compact spacecraft; strict mass ceiling on high-inclination SSO.'
  },
  {
    id: 'lv-medium',
    category: 'launcher',
    ownerRole: 'FLIGHT',
    name: 'Medium-Lift Reusable Launcher',
    costM: 76,
    massKg: 0,
    powerW: 0,
    maxMassLeoKg: 1450,
    maxMassSsoKg: 1150,
    shortSpecs: '$76M | Max LEO: 1,450 kg | Max SSO: 1,150 kg',
    description: 'Heavy payload margin for flagship radar spacecraft in Sun-Synchronous Orbit, consuming 42% of total budget.'
  }
];

export const DEFAULT_CONFIG: MissionConfig = {
  busId: 'bus-standard',
  instrumentId: 'inst-sar',
  powerId: 'pwr-deployable',
  commsId: 'comms-xband',
  orbitId: 'orbit-sso',
  launcherId: 'lv-medium'
};

export const MISSION_ANOMALIES: MissionAnomaly[] = [
  {
    id: 'anom-ground-outage',
    triggerDay: 240,
    title: 'ANOMALY 01: Primary Ground Station Storm Outage',
    severity: 'WARNING',
    briefing:
      'Severe Atlantic storms knocked out our primary receiving antenna for 14 days. Onboard solid-state memory is filling toward overflow.',
    choices: [
      {
        id: 'lease-commercial',
        label: 'Lease Commercial Ground Dish ($9M Reserve)',
        detail: 'Maintains 100% science downlink with zero data loss if reserve budget allows.',
        budgetDeltaM: -9,
        fuelDeltaKg: 0,
        scienceDelta: 12,
        healthDelta: 0,
        logMessage: 'Leased commercial polar ground station (-$9M). Zero science packets lost.'
      },
      {
        id: 'throttle-duty',
        label: 'Throttle Sensor Duty Cycle to 45% (Free)',
        detail: 'Prevents buffer corruption without spending budget, sacrificing two weeks of observations.',
        budgetDeltaM: 0,
        fuelDeltaKg: 0,
        scienceDelta: -18,
        healthDelta: 2,
        logMessage: 'Throttled sensor duty cycle during storm outage (-18 Sci, preserved bus health).'
      }
    ]
  },
  {
    id: 'anom-cme-flare',
    triggerDay: 580,
    title: 'ANOMALY 02: X-Class Solar Coronal Mass Ejection (CME)',
    severity: 'CRITICAL',
    briefing:
      'Geomagnetic storm expanded Earth’s upper atmosphere, increasing drag and dropping orbital altitude by 14 km.',
    choices: [
      {
        id: 'reboost-burn',
        label: 'Execute Station-Keeping Reboost Burn (-12 kg Fuel)',
        detail: 'Restores nominal orbit immediately if sufficient propellant remains.',
        budgetDeltaM: 0,
        fuelDeltaKg: -12,
        scienceDelta: 10,
        healthDelta: -3,
        logMessage: 'Executed thruster reboost burn (-12 kg propellant). Nominal orbit restored.'
      },
      {
        id: 'safe-mode-drift',
        label: 'Enter Safe Mode & Accept Lower Orbit (0 kg Fuel)',
        detail: 'Saves fuel, but elevated drag degrades spacecraft health and imaging geometry.',
        budgetDeltaM: 0,
        fuelDeltaKg: 0,
        scienceDelta: -25,
        healthDelta: -18,
        logMessage: 'Entered CME Safe Mode. Orbital decay reduced instrument resolution (-25 Sci).'
      }
    ]
  },
  {
    id: 'anom-dust-plume',
    triggerDay: 890,
    title: 'TARGET OF OPPORTUNITY: Historic Saharan Dust Plume',
    severity: 'OPPORTUNITY',
    briefing:
      'A massive mineral dust plume is crossing North Africa into the Atlantic. Earth Science HQ requests continuous high-rate scanning.',
    choices: [
      {
        id: 'overclock-scan',
        label: 'Overclock Payload & High-Gain Downlink (+45 Sci)',
        detail: 'Pushes power & thermal subsystems hard (-12% bus health) for major scientific discovery.',
        budgetDeltaM: -3,
        fuelDeltaKg: -3,
        scienceDelta: 45,
        healthDelta: -12,
        logMessage: 'Overclocked instruments for Saharan dust plume event (+45 Bonus Science!).'
      },
      {
        id: 'nominal-pass',
        label: 'Maintain Nominal Conservation Schedule (+10 Sci)',
        detail: 'Protects spacecraft longevity through Year 3 end-of-mission.',
        budgetDeltaM: 0,
        fuelDeltaKg: 0,
        scienceDelta: 10,
        healthDelta: 0,
        logMessage: 'Completed nominal Saharan observation pass (+10 Sci, zero hardware strain).'
      }
    ]
  }
];