import type { MissionData } from '../../contracts';
import donkiSnapshot from './data/donki-cme-snapshot.json';
import insightWeatherRaw from './data/insight-mars-weather-raw.json';

const sol675 = insightWeatherRaw['675'];
const donkiObservation = donkiSnapshot.observation;
const donkiMetadata = donkiSnapshot.metadata;

export function loadMission(): MissionData {
  return {
    id: 'mars-outpost-alpha',
    title: 'Ares Outpost Alpha: Six Shifts on Mars',
    maxTurns: 6,
    scienceTarget: 3,
    initialResources: { power: 70, oxygen: 70, supplies: 70 },
    dataMode: 'archived',
    sources: [
      {
        id: 'nasa-donki-cme-snapshot',
        title: `NASA DONKI CME observation (${donkiObservation.startTime.slice(0, 10)})`,
        url: donkiMetadata.queryUrl,
        retrievedAt: donkiMetadata.retrievedAt,
        observedAt: donkiObservation.startTime,
        mode: 'archived',
        units: `CME analysis speed ${donkiObservation.speedKmPerSecond} km/s (${donkiObservation.analysisType} analysis)`,
        licenseNotes: 'NASA CCMC / DONKI open data. NASA non-endorsement statement: NASA data, imagery, and technical information may not be used to state or imply the endorsement by NASA or by any NASA employee of a commercial product, service, or activity, or used in any manner that might mislead.',
        mapping: 'The archived CME observation is shown as context for the authored shelter drill in Shifts 2–3; it is not a measurement of Mars conditions, crew dose, or the game reserve losses.',
      },
      {
        id: 'nasa-insight-weather',
        title: 'NASA InSight Mars Weather Service API',
        url: 'https://api.nasa.gov/insight_weather/?feedtype=json&ver=1.0',
        retrievedAt: '2026-11-14T05:40:00Z',
        observedAt: '2020-10-19T00:00Z',
        mode: 'archived',
        units: `Pressure ${sol675.PRE.av} Pa, Temp ${sol675.AT.av} C, Wind ${sol675.HWS.av} m/s`,
        licenseNotes: 'NASA / JPL-Caltech open data. Non-endorsement applies.',
        mapping: 'Grounds Shift 1 MOXIE CO2 pressure constraints and Shift 6 weather telemetry.',
      },
      {
        id: 'csa-space-food-toolkit',
        title: 'CSA Deep Space Food Production Toolkit',
        url: 'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/',
        retrievedAt: '2026-11-14T05:40:00Z',
        observedAt: '2026-01-01T00:00Z',
        mode: 'archived',
        units: 'Controlled Environment Agriculture (photoperiod, nutrient loop)',
        licenseNotes: 'Canadian Space Agency open educational material. Non-endorsement applies.',
        mapping: 'Informs Shift 4 greenhouse LED power draw vs stored supply consumption.',
      },
      {
        id: 'nasa-dsn-light-delay',
        title: 'NASA Deep Space Network (DSN) Light-Time Delay',
        url: 'https://www.nasa.gov/directorates/somd/space-communications-navigation-program/deep-space-network/',
        retrievedAt: '2026-11-14T05:40:00Z',
        observedAt: '2026-01-01T00:00Z',
        mode: 'archived',
        units: 'Speed of light c (3 to 22 min one-way latency)',
        licenseNotes: 'NASA SCaN / DSN educational record. Non-endorsement applies.',
        mapping: 'Informs Shift 5 1-turn delayed science validation from Earth.',
      },
    ],
    events: [
      {
        id: 'shift-1-oxygen-vs-science',
        title: 'Oxygen Production vs Science Equipment',
        description: `InSight telemetry records ${sol675.PRE.av} Pa atmospheric pressure at Elysium Planitia. Decide whether to run MOXIE CO2 electrolysis or power surface science sensors.`,
        sourceIds: ['nasa-insight-weather'],
        choices: [
          {
            id: 'oxygen',
            label: 'Run oxygen generation',
            explanation: 'Making breathable air uses power and supplies to keep the habitat atmosphere safe.',
            effect: { resources: { power: -12, oxygen: 18, supplies: -5 } },
          },
          {
            id: 'research',
            label: 'Deploy science instruments',
            explanation: 'Surface sensor array draws battery power to study Martian soil and mineral samples.',
            effect: { resources: { power: -8, oxygen: -8, supplies: -5 }, science: 1 },
          },
          {
            id: 'shield',
            label: 'Reinforce habitat shelter',
            explanation: 'Stack regolith sandbags around crew modules early to begin radiation protection.',
            effect: { resources: { power: -6, oxygen: -4, supplies: -15 }, shielding: 15 },
          },
        ],
      },
      {
        id: 'shift-2-shelter-vs-exploration',
        title: 'Shelter Preparation vs Exploration',
        description: `DONKI recorded a CME on ${donkiObservation.startTime} with an estimated speed of ${donkiObservation.speedKmPerSecond} km/s. This shelter drill is an authored what-if, not a measured Mars hazard. Prepare shelter or explore?`,
        sourceIds: ['nasa-donki-cme-snapshot'],
        choices: [
          {
            id: 'shield',
            label: 'Fortify storm shelter',
            explanation: 'Use construction supplies and battery power to harden the storm bunker.',
            effect: { resources: { power: -6, oxygen: -4, supplies: -15 }, shielding: 15 },
          },
          {
            id: 'research',
            label: 'Extend rover exploration',
            explanation: 'Drive the rover to explore the nearby crater, collecting geological science data.',
            effect: { resources: { power: -8, oxygen: -8, supplies: -5 }, science: 1 },
          },
          {
            id: 'oxygen',
            label: 'Maintain oxygen scrubbers',
            explanation: 'Run a preventative maintenance cycle on habitat oxygen scrubbers.',
            effect: { resources: { power: -12, oxygen: 18, supplies: -5 } },
          },
        ],
      },
      {
        id: 'shift-3-solar-weather-alert',
        title: 'Solar Weather Hazard Response',
        description: `Respond to an authored solar-weather shelter drill inspired by the DONKI CME observed ${donkiObservation.startTime} (${donkiObservation.speedKmPerSecond} km/s). The modeled reserve losses are not measured Mars damage or crew radiation dose.`,
        sourceIds: ['nasa-donki-cme-snapshot'],
        hazard: {
          minShielding: 15,
          mitigatedLoss: { power: -4, oxygen: -2 },
          unmitigatedLoss: { power: -22, oxygen: -18, supplies: -10 },
          mitigatedNotice: 'Solar radiation hazard: Outpost shelter shielded critical equipment from heavy radiation.',
          unmitigatedNotice: 'Solar radiation hazard: Insufficient shielding (<15) caused heavy damage to solar arrays and life support.',
        },
        choices: [
          {
            id: 'research',
            label: 'Record solar particle telemetry',
            explanation: 'Monitor high-energy proton flux with radiation sensors, capturing rare space weather science.',
            effect: { resources: { power: -8, oxygen: -8, supplies: -5 }, science: 1 },
          },
          {
            id: 'shield',
            label: 'Emergency bunker lockdown',
            explanation: 'Retract external sensors, activate emergency shielding, and keep the crew sealed in the bunker.',
            effect: { resources: { power: -6, oxygen: -4, supplies: -15 }, shielding: 15 },
          },
          {
            id: 'oxygen',
            label: 'Pressurize emergency air banks',
            explanation: 'Isolate life support circuits to prevent air leaks during severe electrical fluctuations.',
            effect: { resources: { power: -12, oxygen: 18, supplies: -5 } },
          },
        ],
      },
      {
        id: 'shift-4-greenhouse-vs-battery',
        title: 'Greenhouse Food Production vs Battery Conservation',
        description: 'Stored rations are being consumed. Cultivating hydroponic crops requires power and supplies to yield food and botanical data, while conserving power draws down stored supplies.',
        sourceIds: ['csa-space-food-toolkit'],
        choices: [
          {
            id: 'research',
            label: 'Cultivate greenhouse crops',
            explanation: 'Power growth LED lamps to accelerate edible crop production and advance plant science.',
            effect: { resources: { power: -8, oxygen: -8, supplies: -5 }, science: 1 },
          },
          {
            id: 'shield',
            label: 'Conserve battery & insulate dome',
            explanation: 'Dim grow lamps to conserve battery power, consuming stored rations and reinforcing greenhouse thermal insulation.',
            effect: { resources: { power: -6, oxygen: -4, supplies: -15 }, shielding: 15 },
          },
          {
            id: 'oxygen',
            label: 'Aerate hydroponic bioreactor',
            explanation: 'Run oxygen diffusers through hydroponic water loops to maintain root oxygenation.',
            effect: { resources: { power: -12, oxygen: 18, supplies: -5 } },
          },
        ],
      },
      {
        id: 'shift-5-comms-vs-autonomous',
        title: 'Interplanetary Communications vs Autonomous Science',
        description: 'Radio signals travel at the speed of light, taking time to cross interplanetary space. Transmitting findings to Earth has a 1-turn delay; autonomous science produces immediate data.',
        sourceIds: ['nasa-dsn-light-delay'],
        choices: [
          {
            id: 'research',
            label: 'Autonomous surface science',
            explanation: 'Run automated robotic assays locally, producing immediate scientific results without waiting for Earth.',
            effect: { resources: { power: -8, oxygen: -8, supplies: -5 }, science: 1 },
          },
          {
            id: 'comms',
            label: 'Transmit telemetry to Earth',
            explanation: 'Beam raw telemetry to Earth science team. Due to light travel time, verification arrives next shift.',
            effect: { resources: { power: -10, oxygen: -4, supplies: -4 } },
            delayedEffect: {
              delayTurns: 1,
              description: 'Earth mission control received planetary telemetry and verified scientific discovery.',
              effect: { science: 2 },
            },
          },
          {
            id: 'oxygen',
            label: 'Buffer life-support reserves',
            explanation: 'Direct energy toward recharging oxygen scrubbers to protect the crew during comms operations.',
            effect: { resources: { power: -12, oxygen: 18, supplies: -5 } },
          },
          {
            id: 'shield',
            label: 'Harden antenna & shelter',
            explanation: 'Secure antenna tracking motors against dust accumulation and inspect storm shelter seals.',
            effect: { resources: { power: -6, oxygen: -4, supplies: -15 }, shielding: 15 },
          },
        ],
      },
      {
        id: 'shift-6-final-science-vs-reserves',
        title: 'Final Science Push vs Reserve Stabilization',
        description: `With ${sol675.HWS.av} m/s winds and ${sol675.AT.av}°C temperature readings from InSight, decide whether to make a final science push or stabilize outpost life support.`,
        sourceIds: ['nasa-insight-weather', 'nasa-donki-cme-snapshot'],
        choices: [
          {
            id: 'research',
            label: 'Final mission science push',
            explanation: 'Commit maximum operational power to complete final planetary surveys before shift handoff.',
            effect: { resources: { power: -8, oxygen: -8, supplies: -5 }, science: 1 },
          },
          {
            id: 'oxygen',
            label: 'Stabilize air reserves',
            explanation: 'Top off habitat oxygen tanks to guarantee a healthy survival margin for the outpost.',
            effect: { resources: { power: -12, oxygen: 18, supplies: -5 } },
          },
          {
            id: 'shield',
            label: 'Winterize habitat structures',
            explanation: 'Lock down external systems and reinforce structural joints against oncoming seasonal dust storms.',
            effect: { resources: { power: -6, oxygen: -4, supplies: -15 }, shielding: 15 },
          },
        ],
      },
    ],
  };
}