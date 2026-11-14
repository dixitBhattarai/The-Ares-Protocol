import type { GameState, StationId } from '../../contracts';
import type { StationVisual } from './models';

export type ReserveLevel = 'normal' | 'low' | 'critical';
export interface StationStatus {
  reserve: number;
  level: ReserveLevel;
  readout: string;
  description: string;
}

export function displayReserve(value: number): number {
  return Number.isFinite(value) ? Math.round(Math.max(0, Math.min(100, value))) : 0;
}

export function getStationStatus(id: StationId, state: Readonly<GameState>): StationStatus {
  const source = { habitat: 'oxygen', solar: 'power', greenhouse: 'supplies' } as const;
  const names = { habitat: 'Air', solar: 'Power', greenhouse: 'Supplies' };
  const reserve = displayReserve(state.resources[source[id]]);
  // Match the integrated HUD: empty, low (<=20), watch (<=40), ready.
  const level: ReserveLevel = reserve <= 20 ? 'critical' : reserve <= 40 ? 'low' : 'normal';
  const warning = level === 'normal' ? '' : level === 'low' ? 'watch' : reserve === 0 ? 'empty' : 'low';
  const shelter = id === 'habitat' ? ` · Shelter ${displayReserve(state.shielding)}` : '';
  return {
    reserve, level,
    readout: `${names[id]}: ${reserve}${warning ? ` (${warning})` : ''}${shelter}`,
    description: `${names[id]} reserve ${reserve} of 100 game units.${warning ? ` Reserve ${warning}.` : ''}${id === 'habitat' ? ` Shelter score ${displayReserve(state.shielding)} of 100 game units.` : ''}`,
  };
}

/** Changes only render objects; there is no reserve update or hazard calculation. */
export function applyStationStatus(visual: StationVisual, status: StationStatus, power: number, shielding: number, hasEvent = false): void {
  const light = { normal: '#91d0a3', low: '#f1b45d', critical: '#ef8d72' }[status.level];
  visual.indicator.color.set(light);
  visual.indicator.emissive.set(light);
  visual.indicator.emissiveIntensity = .15 + displayReserve(power) / 100 * .4;
  visual.windows.emissiveIntensity = displayReserve(power) / 100 * .4;
  visual.windows.color.set(displayReserve(power) <= 20 ? '#516576' : '#93d8db');
  const beaconColor = hasEvent ? '#ffd087' : light;
  visual.beacon.color.set(beaconColor);
  visual.beacon.emissive.set(beaconColor);
  visual.beacon.emissiveIntensity = .1 + displayReserve(power) / 100 * .5;
  visual.shelterPanels.forEach(panel => { panel.scale.y = .01 + .57 * displayReserve(shielding) / 100; });
}

/** Show only the supplied current outcome, with no inferred or predicted hazard. */
export function getWorldEventNotice(state: Readonly<GameState>): string {
  return state.phase === 'ready' ? '' : state.lastHazardNotice?.trim() ?? '';
}
