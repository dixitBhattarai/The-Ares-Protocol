import type { GameAction } from '../../contracts';

export type ActionEmitter = (event: 'action', action: GameAction) => void;

export function emitStart(emit: ActionEmitter): void {
  emit('action', { type: 'START' });
}

export function emitChoose(emit: ActionEmitter, choiceId: string): void {
  emit('action', { type: 'CHOOSE', choiceId });
}

export function emitPause(emit: ActionEmitter): void {
  emit('action', { type: 'PAUSE' });
}

export function emitResume(emit: ActionEmitter): void {
  emit('action', { type: 'RESUME' });
}

export function emitRestart(emit: ActionEmitter): void {
  emit('action', { type: 'RESTART' });
}
