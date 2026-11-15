import type {
  Choice,
  ChoicePresentation,
  DebriefDetails,
  GameAction,
  GameState,
  HazardEffect,
  MissionData,
  MissionEvent,
  PendingDelayedEffect,
  Phase,
  TurnRecord,
} from '../../contracts';
import { reduceFieldSample } from './field-sample';
import { reduceStationGame, taskHazardNotice } from './station-game';
export { STATION_TASKS, taskCompletionId } from './station-game';

export function getChoicePresentation(choice: Choice, event?: MissionEvent): ChoicePresentation {
  if (choice.presentation) return choice.presentation;
  if (choice.id === 'oxygen') {
    return {
      icon: '💨',
      rarity: 'vital',
      badge: 'LIFE SUPPORT',
      summary: event?.id.includes('greenhouse')
        ? 'Aerate hydroponic bioreactor & nutrient solution'
        : 'MOXIE solid oxide electrolysis & air recycling',
    };
  }
  if (choice.id === 'shield') {
    return {
      icon: '🛡️',
      rarity: 'hazard-response',
      badge: 'STORM SHIELD',
      summary: 'Regolith radiation barrier fortification',
    };
  }
  if (choice.id === 'comms') {
    return {
      icon: '📡',
      rarity: 'experimental',
      badge: 'DEEP SPACE',
      summary: 'Interplanetary light-delay science telemetry',
    };
  }
  return {
    icon: '🔬',
    rarity: 'standard',
    badge: 'SURFACE SCIENCE',
    summary: 'Planetary geology & rover sensor surveys',
  };
}

export function getUpcomingHazardNotice(mission: MissionData, turn: number): string | undefined {
  if (!mission.events.length) return undefined;
  const currentEvent = mission.events[turn % mission.events.length];
  if (currentEvent?.hazard) {
    return `⚠️ Space Weather Alert: Severe storm event active! Solar storm strike imminent; shielding of ${currentEvent.hazard.minShielding} required to mitigate damage.`;
  }
  const nextEvent = mission.events[(turn + 1) % mission.events.length];
  if (nextEvent?.hazard) {
    return `📡 Orbital Sensor Advisory: Coronal mass ejection detected approaching Mars next shift! Reinforce shelter shielding (minimum ${nextEvent.hazard.minShielding}) to protect life support.`;
  }
  if (turn === 1) {
    return '📡 Orbital Sensor Advisory: Solar flare detected! High-energy storm approaching next shift. Reinforce shelter shielding (minimum 15) to prevent severe power and oxygen damage.';
  }
  if (turn === 2) {
    return '⚠️ Space Weather Alert: Solar storm strike imminent! Shelter shielding required to mitigate damage.';
  }
  return undefined;
}

export function createInitialState(mission: MissionData): GameState {
  return {
    ...(mission.gameplayMode === 'station-tasks' ? {taskRun:{session:0,elapsed:0,completedIds:[],protections:{}}} : {}),
    phase: 'ready',
    turn: 0,
    resources: { ...mission.initialResources },
    shielding: 0,
    science: 0,
    log: [],
    history: [],
    pendingDelayedEffects: [],
    upcomingHazardNotice: mission.gameplayMode === 'station-tasks' ? taskHazardNotice(0,mission.hazardSeed) : getUpcomingHazardNotice(mission, 0),
  };
}

export function getCurrentEvent(mission: MissionData, state: Readonly<GameState>): MissionEvent | undefined {
  if (!mission.events.length) return undefined;
  return mission.events[state.turn % mission.events.length];
}

// Pure turn-based reducer. Only this module changes simulation state.
export function reduceGame(state: Readonly<GameState>, action: GameAction, mission: MissionData): GameState {
  if(mission.gameplayMode==='station-tasks') {
    const field=reduceFieldSample(state,action,prepared=>{
      const result=reduceStationGame(prepared,{type:'COMPLETE_TASK',completionId:`${prepared.taskRun!.session}:${prepared.turn}:survey`},mission,()=>createInitialState(mission));
      if(result.turn===prepared.turn)return result;
      const explanation='Collected, sealed and examined a practice regolith sample. Loose grains observed; composition is unknown. +2 science.';
      return {...result,log:[...result.log.slice(0,-1),explanation],history:result.history?.map((record,index)=>index===result.history!.length-1?{...record,choiceLabel:'Collect and examine regolith',explanation}:record)};
    });
    if(field)return field;
    // A carried sample is a multi-location job; a generic completion cannot skip its checks.
    if(action.type==='COMPLETE_TASK'&&state.fieldSample&&state.fieldSample.stage!=='researched'&&state.taskRun?.activeTaskId==='survey')return state;
    return reduceStationGame(state,action,mission,()=>createInitialState(mission));
  }
  if (action.type === 'RESTART') return createInitialState(mission);
  if (action.type === 'START' && state.phase === 'ready') return { ...state, phase: 'running' };
  if (action.type === 'PAUSE' && state.phase === 'running') return { ...state, phase: 'paused' };
  if (action.type === 'RESUME' && state.phase === 'paused') return { ...state, phase: 'running' };
  if (action.type !== 'CHOOSE' || state.phase !== 'running') return state;

  const currentEvent = getCurrentEvent(mission, state);
  const choice = currentEvent?.choices.find(item => item.id === action.choiceId);
  if (!choice || !currentEvent) return state;

  // 1. Immediate choice effects
  const resources = { ...state.resources };
  for (const key of ['power', 'oxygen', 'supplies'] as const) {
    resources[key] = Math.max(0, Math.min(100, resources[key] + (choice.effect.resources?.[key] ?? 0)));
  }
  let science = Math.max(0, state.science + (choice.effect.science ?? 0));
  let shielding = Math.max(0, Math.min(100, state.shielding + (choice.effect.shielding ?? 0)));
  const nextTurn = state.turn + 1;

  // 2. Process pending delayed effects due on or before nextTurn
  const pendingNotes: string[] = [];
  const remainingDelayedEffects: PendingDelayedEffect[] = [];
  for (const pending of (state.pendingDelayedEffects ?? [])) {
    if (pending.dueTurn <= nextTurn) {
      for (const key of ['power', 'oxygen', 'supplies'] as const) {
        resources[key] = Math.max(0, Math.min(100, resources[key] + (pending.effect.resources?.[key] ?? 0)));
      }
      science = Math.max(0, science + (pending.effect.science ?? 0));
      shielding = Math.max(0, Math.min(100, shielding + (pending.effect.shielding ?? 0)));
      pendingNotes.push(pending.description);
    } else {
      remainingDelayedEffects.push(pending);
    }
  }

  // If choice queues a new delayed effect
  if (choice.delayedEffect) {
    remainingDelayedEffects.push({
      dueTurn: nextTurn + choice.delayedEffect.delayTurns,
      description: choice.delayedEffect.description,
      effect: choice.delayedEffect.effect,
    });
  }

  // 3. Environmental Hazard check on current shift
  let hazard: HazardEffect | undefined = currentEvent.hazard;
  // Default canonical space weather hazard on Shift 3 (state.turn === 2) when not explicitly provided
  if (!hazard && state.turn === 2) {
    hazard = {
      minShielding: 15,
      mitigatedLoss: { power: -4, oxygen: -2 },
      unmitigatedLoss: { power: -22, oxygen: -18, supplies: -10 },
      mitigatedNotice: 'Solar radiation hazard: Outpost shelter shielded critical equipment from heavy radiation.',
      unmitigatedNotice: 'Solar radiation hazard: Insufficient shielding (<15) caused heavy damage to solar arrays and life support.',
    };
  }

  let hazardNotice: string | undefined;
  if (hazard) {
    if (shielding >= hazard.minShielding) {
      for (const key of ['power', 'oxygen', 'supplies'] as const) {
        resources[key] = Math.max(0, Math.min(100, resources[key] + (hazard.mitigatedLoss[key] ?? 0)));
      }
      hazardNotice = hazard.mitigatedNotice;
    } else {
      for (const key of ['power', 'oxygen', 'supplies'] as const) {
        resources[key] = Math.max(0, Math.min(100, resources[key] + (hazard.unmitigatedLoss[key] ?? 0)));
      }
      hazardNotice = hazard.unmitigatedNotice;
    }
  }

  // 4. Resource depletion check
  const depletedKeys = (['power', 'oxygen', 'supplies'] as const).filter(key => resources[key] <= 0);
  const isDepleted = depletedKeys.length > 0;

  // 5. Phase and Debrief resolution
  let phase: Phase;
  let debrief: DebriefDetails | undefined;
  if (isDepleted) {
    phase = 'lost';
    const primary = depletedKeys[0];
    const score = Math.round((science * 15) + Math.max(0, Math.min(resources.power, resources.oxygen, resources.supplies)));
    debrief = {
      verdict: 'depleted',
      title: 'Mission Terminated: Reserves Depleted',
      primaryCause: `${primary.toUpperCase()} reached 0 on Shift ${nextTurn}.`,
      summary: `Score: ${score} · The outpost ran out of critical ${primary} during Shift ${nextTurn}. On Mars, power, air, and supplies must all stay above zero to survive.`,
      recommendations: [
        primary === 'oxygen'
          ? 'Prioritize running the oxygen maker (electrolysis) before life-support reserves drop below 25%.'
          : primary === 'power'
            ? 'Conserve battery power and reinforce shelter before solar hazards strike.'
            : 'Monitor supplies closely; repairs, aerating, and construction consume reserves.',
        'Prepare shelter in Shift 2 to avoid severe storm damage in Shift 3.',
      ],
      lessons: [
        'All life-support subsystems are interconnected; a failure in any reserve ends the mission.',
        'Greedy research strategies without infrastructure preparation are unsustainable on Mars.',
      ],
      stars: 0,
      score,
    };
  } else if (nextTurn >= mission.maxTurns) {
    if (science >= mission.scienceTarget) {
      phase = 'won';
      const score = Math.round(resources.power + resources.oxygen + resources.supplies + (science * 25) + (shielding * 0.5));
      let stars = 1;
      if (score >= 230 && science >= 4 && shielding >= 15) {
        stars = 3;
      } else if (score >= 160) {
        stars = 2;
      }
      const starIcons = '⭐'.repeat(stars);
      debrief = {
        verdict: 'won',
        title: 'Outpost Mission Accomplished!',
        summary: `${starIcons} ${stars}-Star Rating (Score: ${score}) · Your crew maintained all life-support reserves across all ${mission.maxTurns} shifts and gathered ${science} / ${mission.scienceTarget} science points!`,
        recommendations: [
          'Outstanding mission planning! You balanced survival maintenance with scientific goals.',
          'Try another run with different decision paths to explore alternative outpost strategies.',
        ],
        lessons: [
          'Mars exploration requires constant balance between keeping systems online and gathering scientific knowledge.',
          'Proactive hazard shielding protects critical solar arrays and atmosphere scrubbers.',
        ],
        stars,
        score,
      };
    } else {
      phase = 'lost';
      const score = Math.round((science * 15) + Math.max(0, Math.min(resources.power, resources.oxygen, resources.supplies)));
      debrief = {
        verdict: 'low_science',
        title: 'Reserves Survived, But Science Goals Incomplete',
        primaryCause: `Collected ${science} / ${mission.scienceTarget} science points.`,
        summary: `Score: ${score} · Your outpost survived all ${mission.maxTurns} shifts, but did not collect enough scientific data (${science} gathered, ${mission.scienceTarget} required).`,
        recommendations: [
          'Conduct scientific research during shifts when reserves are safely above 40%.',
          'Strengthening shelter early minimizes hazard damage later, leaving surplus energy for science.',
        ],
        lessons: [
          'Surviving is necessary, but the ultimate purpose of planetary exploration is scientific discovery.',
          'Calculated risks with healthy safety buffers enable mission success.',
        ],
        stars: 0,
        score,
      };
    }
  } else {
    phase = 'running';
  }

  // 6. Log and History compilation
  const newLog = [...state.log, choice.explanation];
  if (hazardNotice) newLog.push(hazardNotice);
  for (const note of pendingNotes) newLog.push(note);

  const turnRecord: TurnRecord = {
    turn: state.turn,
    shift: nextTurn,
    eventId: currentEvent.id,
    eventTitle: currentEvent.title,
    choiceId: choice.id,
    choiceLabel: choice.label,
    explanation: choice.explanation,
    hazardNotice,
    resources: { ...resources },
    science,
    shielding,
  };

  return {
    ...state,
    phase,
    turn: nextTurn,
    resources,
    shielding,
    science,
    log: newLog,
    history: [...(state.history ?? []), turnRecord],
    debrief,
    pendingDelayedEffects: remainingDelayedEffects,
    lastHazardNotice: hazardNotice,
    upcomingHazardNotice: phase === 'running' ? getUpcomingHazardNotice(mission, nextTurn) : undefined,
  };
}
