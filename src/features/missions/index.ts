import type { MissionData } from '../../contracts';

export function loadMission(): MissionData {
  return {
    id: 'mars-outpost-alpha',
    title: 'Ares Outpost Alpha: Six Shifts on Mars',
    maxTurns: 6,
    scienceTarget: 3,
    initialResources: { power: 70, oxygen: 70, supplies: 70 },
    dataMode: 'authored-demo',
    sources: [],
    events: [
      {
        id: 'shift-1-oxygen-vs-science',
        title: 'Oxygen Production vs Science Equipment',
        description: 'Outpost power is limited on Sol 1. Decide whether to run the oxygen generator to build breathable air buffers or power surface science sensors.',
        sourceIds: [],
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
        description: 'Orbital telemetry warns of rising solar activity. Prepare radiation shielding for the habitat or extend rover exploration.',
        sourceIds: [],
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
        description: 'A powerful solar particle storm strikes Mars! The outpost must respond while the radiation hazard impacts surface operations.',
        sourceIds: [],
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
        sourceIds: [],
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
        sourceIds: [],
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
        description: 'The expedition shift rotation concludes. Decide whether to make a final science push to reach mission goals or stabilize outpost life support for the incoming crew.',
        sourceIds: [],
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
