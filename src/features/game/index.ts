import type {
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

export function createInitialState(mission: MissionData): GameState {
  return {
    phase: 'ready',
    turn: 0,
    resources: { ...mission.initialResources },
    shielding: 0,
    science: 0,
    log: [],
    history: [],
    pendingDelayedEffects: [],
  };
}

export function getCurrentEvent(mission: MissionData, state: Readonly<GameState>): MissionEvent | undefined {
  if (!mission.events.length) return undefined;
  return mission.events[state.turn % mission.events.length];
}

// Pure turn-based reducer. Only this module changes simulation state.
export function reduceGame(state: Readonly<GameState>, action: GameAction, mission: MissionData): GameState {
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
    debrief = {
      verdict: 'depleted',
      title: 'Mission Terminated: Reserves Depleted',
      primaryCause: `${primary.toUpperCase()} reached 0 on Shift ${nextTurn}.`,
      summary: `The outpost ran out of critical ${primary} during Shift ${nextTurn}. On Mars, power, air, and supplies must all stay above zero to survive.`,
      recommendations: [
        primary === 'oxygen'
          ? 'Prioritize running the oxygen maker before life-support reserves drop below 25%.'
          : primary === 'power'
            ? 'Conserve battery power and reinforce shelter before solar hazards strike.'
            : 'Monitor supplies closely; repairs and construction consume reserves.',
        'Prepare shelter in Shift 2 to avoid severe storm damage in Shift 3.',
      ],
      lessons: [
        'All life-support subsystems are interconnected; a failure in any reserve ends the mission.',
        'Greedy research strategies without infrastructure preparation are unsustainable.',
      ],
    };
  } else if (nextTurn >= mission.maxTurns) {
    if (science >= mission.scienceTarget) {
      phase = 'won';
      debrief = {
        verdict: 'won',
        title: 'Outpost Mission Accomplished!',
        summary: `Your crew maintained all life-support reserves across all ${mission.maxTurns} shifts and gathered ${science} / ${mission.scienceTarget} science points!`,
        recommendations: [
          'Outstanding mission planning! You balanced survival maintenance with scientific goals.',
          'Try another run with different decision paths to explore alternative outpost strategies.',
        ],
        lessons: [
          'Mars exploration requires constant balance between keeping systems online and gathering scientific knowledge.',
          'Proactive hazard shielding protects critical solar arrays and atmosphere scrubbers.',
        ],
      };
    } else {
      phase = 'lost';
      debrief = {
        verdict: 'low_science',
        title: 'Reserves Survived, But Science Goals Incomplete',
        primaryCause: `Collected ${science} / ${mission.scienceTarget} science points.`,
        summary: `Your outpost survived all ${mission.maxTurns} shifts, but did not collect enough scientific data (${science} gathered, ${mission.scienceTarget} required).`,
        recommendations: [
          'Conduct scientific research during shifts when reserves are safely above 40%.',
          'Strengthening shelter early minimizes hazard damage later, leaving surplus energy for science.',
        ],
        lessons: [
          'Surviving is necessary, but the ultimate purpose of planetary exploration is scientific discovery.',
          'Calculated risks with healthy safety buffers enable mission success.',
        ],
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
  };
}
