const phases = new Set(['ready', 'running', 'paused', 'won', 'lost']);
const stations = ['habitat', 'solar', 'greenhouse'];
const resources = ['power', 'oxygen', 'supplies'];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finite(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function integer(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

function text(value, max = 240) {
  return typeof value === 'string' && value.length <= max ? value : null;
}

function copyResources(value, { min = 0, max = 100 } = {}) {
  if (!isRecord(value)) return null;
  const result = {};
  for (const key of resources) {
    if (!finite(value[key], min, max)) return null;
    result[key] = value[key];
  }
  return result;
}

function copyEffect(value) {
  if (!isRecord(value)) return null;
  const result = {};
  if (value.resources !== undefined) {
    if (!isRecord(value.resources)) return null;
    const effectResources = {};
    for (const key of resources) {
      if (value.resources[key] !== undefined) {
        if (!finite(value.resources[key], -100, 100)) return null;
        effectResources[key] = value.resources[key];
      }
    }
    result.resources = effectResources;
  }
  for (const key of ['shielding', 'science']) {
    if (value[key] !== undefined) {
      if (!finite(value[key], -100, 100)) return null;
      result[key] = value[key];
    }
  }
  return result;
}

function copyTaskRun(value) {
  if (!isRecord(value) || !integer(value.session, 0, 1_000_000) || !finite(value.elapsed, 0, 10_000_000)) return null;
  if (!Array.isArray(value.completedIds) || value.completedIds.length > 100) return null;
  if (!value.completedIds.every(id => typeof id === 'string' && /^[a-z0-9:_-]{1,100}$/.test(id))) return null;
  const result = {
    session: value.session,
    elapsed: value.elapsed,
    completedIds: [...value.completedIds],
    protections: {},
  };
  if (value.stormPrep !== undefined) {
    if (!isRecord(value.stormPrep) || !['shutters','secured','dusty'].every(key => typeof value.stormPrep[key] === 'boolean')) return null;
    result.stormPrep = {shutters:value.stormPrep.shutters,secured:value.stormPrep.secured,dusty:value.stormPrep.dusty};
  }
  if (value.radiationExposure !== undefined) {
    if (!finite(value.radiationExposure, 0, 100)) return null;
    result.radiationExposure = value.radiationExposure;
  }
  if (value.cooldowns !== undefined) {
    if (!isRecord(value.cooldowns)) return null;
    const cooldowns = {};
    for (const [id, until] of Object.entries(value.cooldowns)) {
      if (!['air', 'shelter', 'power', 'plants', 'survey'].includes(id) || !finite(until, 0, 10_000_000)) return null;
      cooldowns[id] = until;
    }
    result.cooldowns = cooldowns;
  }
  if (value.activeTaskId !== undefined) {
    if (typeof value.activeTaskId !== 'string' || !/^[a-z0-9-]{1,80}$/.test(value.activeTaskId)) return null;
    result.activeTaskId = value.activeTaskId;
  }
  if (value.protections !== undefined && !isRecord(value.protections)) return null;
  for (const station of stations) {
    const seconds = value.protections?.[station];
    if (seconds !== undefined) {
      if (!finite(seconds, 0, 10_000_000)) return null;
      result.protections[station] = seconds;
    }
  }
  return result;
}

function copyTurn(value) {
  if (!isRecord(value) || !integer(value.turn, 0, 100_000) || !integer(value.shift, 0, 100_000)) return null;
  const fields = ['eventId', 'eventTitle', 'choiceId', 'choiceLabel', 'explanation'];
  const result = { turn: value.turn, shift: value.shift };
  for (const field of fields) {
    const item = text(value[field], field === 'explanation' ? 500 : 160);
    if (item === null) return null;
    result[field] = item;
  }
  if (value.hazardNotice !== undefined) {
    const notice = text(value.hazardNotice, 500);
    if (notice === null) return null;
    result.hazardNotice = notice;
  }
  const meter = copyResources(value.resources);
  if (!meter || !finite(value.science, 0, 100_000) || !finite(value.shielding, 0, 100)) return null;
  result.resources = meter;
  result.science = value.science;
  result.shielding = value.shielding;
  return result;
}

function copyDebrief(value) {
  if (!isRecord(value) || !['won', 'depleted', 'low_science'].includes(value.verdict)) return null;
  const title = text(value.title, 160);
  const summary = text(value.summary, 800);
  if (title === null || summary === null) return null;
  const result = { verdict: value.verdict, title, summary };
  if (value.primaryCause !== undefined) {
    const cause = text(value.primaryCause, 400);
    if (cause === null) return null;
    result.primaryCause = cause;
  }
  for (const field of ['recommendations', 'lessons']) {
    if (value[field] !== undefined) {
      if (!Array.isArray(value[field]) || value[field].length > 20 || !value[field].every(item => text(item, 400) !== null)) return null;
      result[field] = [...value[field]];
    }
  }
  if (value.stars !== undefined) {
    if (!integer(value.stars, 0, 3)) return null;
    result.stars = value.stars;
  }
  if (value.score !== undefined) {
    if (!finite(value.score, 0, 100_000)) return null;
    result.score = value.score;
  }
  return result;
}

function copyPending(value) {
  if (!Array.isArray(value) || value.length > 20) return null;
  const items = [];
  for (const item of value) {
    if (!isRecord(item) || !integer(item.dueTurn, 0, 100_000)) return null;
    const description = text(item.description, 400);
    const effect = copyEffect(item.effect);
    if (description === null || !effect) return null;
    items.push({ dueTurn: item.dueTurn, description, effect });
  }
  return items;
}

function copyState(value) {
  if (!isRecord(value) || !phases.has(value.phase) || !integer(value.turn, 0, 100_000) || value.taskRun === undefined) return null;
  const meter = copyResources(value.resources);
  if (!meter || !finite(value.shielding, 0, 100) || !finite(value.science, 0, 100_000)) return null;
  const result = { phase: value.phase, turn: value.turn, resources: meter, shielding: value.shielding, science: value.science };
  const taskRun = copyTaskRun(value.taskRun);
  if (!taskRun) return null;
  result.taskRun = taskRun;
  if (value.rover !== undefined) {
    const r=value.rover;
    if (!isRecord(r)||!isRecord(r.pose)||!finite(r.pose.x,-73,73)||!finite(r.pose.z,-73,73)||!finite(r.pose.y,0,5)||!finite(r.heading,-1_000_000,1_000_000)||!finite(r.battery,0,100))return null;
    result.rover={pose:{x:r.pose.x,y:r.pose.y,z:r.pose.z},heading:r.heading,battery:r.battery,driving:false};
  }
  if (value.fieldSample !== undefined) {
    const f=value.fieldSample;
    if(!isRecord(f)||!['digging','collected','researching','researched'].includes(f.stage)||typeof f.runId!=='string'||!/^[a-z0-9:_-]{1,100}$/.test(f.runId)||!finite(f.elapsed,0,6)||!integer(f.researchStep,0,3)||(f.remote!==undefined&&typeof f.remote!=='boolean'))return null;
    result.fieldSample={stage:f.stage,runId:f.runId,elapsed:f.elapsed,researchStep:f.researchStep,remote:!!f.remote};
  }
  if (value.log !== undefined) {
    if (!Array.isArray(value.log) || value.log.length > 100 || !value.log.every(item => text(item, 500) !== null)) return null;
    result.log = [...value.log];
  }
  if (value.history !== undefined) {
    if (!Array.isArray(value.history) || value.history.length > 32) return null;
    const history = value.history.map(copyTurn);
    if (history.some(item => item === null)) return null;
    result.history = history;
  }
  if (value.debrief !== undefined) {
    const debrief = copyDebrief(value.debrief);
    if (!debrief) return null;
    result.debrief = debrief;
  }
  if (value.pendingDelayedEffects !== undefined) {
    const pending = copyPending(value.pendingDelayedEffects);
    if (!pending) return null;
    result.pendingDelayedEffects = pending;
  }
  for (const key of ['lastHazardNotice', 'upcomingHazardNotice']) {
    if (value[key] !== undefined) {
      const notice = text(value[key], 500);
      if (notice === null) return null;
      result[key] = notice;
    }
  }
  return result;
}

export function normalizeProgressSnapshot(value) {
  if (!isRecord(value) || value.version !== 1 || !integer(value.missionSeed, 0, 0xffff_ffff)) return null;
  const state = copyState(value.state);
  if (!state) return null;
  let activity = null;
  if (value.activity !== undefined && value.activity !== null) {
    if (!isRecord(value.activity) || typeof value.activity.taskId !== 'string' || !/^[a-z0-9-]{1,80}$/.test(value.activity.taskId) || !integer(value.activity.progress, 0, 100)) return null;
    activity = { taskId: value.activity.taskId, progress: value.activity.progress };
  }
  return { version: 1, missionSeed: value.missionSeed, state, activity };
}
