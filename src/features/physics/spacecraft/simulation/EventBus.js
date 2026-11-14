/**
 * Central Event & Alarm Logging System
 *
 * Ids are a monotonically increasing counter (not wall-clock + Math.random) so that the event stream is
 * reproducible. `simTime` is stamped from `clock()` when one is attached by the engine; `timestamp`
 * (wall clock) is kept for UI convenience only and is never read by the physics.
 */
export class EventBus {
  constructor(clock = null) {
    this.events = [];
    this.maxEvents = 100;
    this.counter = 0;
    this.clock = clock; // () => simulation time [s]
    // Identical consecutive alarms (same system + message) within this window are coalesced so a
    // per-step warning cannot flood the log at 10 Hz.
    this.dedupeWindowS = 5.0;
  }

  emit(type, system, message, metadata = {}) {
    const simTime = this.clock ? this.clock() : null;

    if (type === 'WARNING' || type === 'CRITICAL') {
      const dup = this.events.find(e => e.system === system && e.message === message && e.type === type);
      if (dup && simTime !== null && dup.simTime !== null && simTime - dup.simTime < this.dedupeWindowS) {
        dup.count = (dup.count || 1) + 1;
        return dup;
      }
    }

    const event = {
      id: `evt_${++this.counter}`,
      simTime,
      timestamp: Date.now(),
      type, // 'INFO', 'WARNING', 'CRITICAL', 'COMMAND'
      system,
      message,
      metadata,
      count: 1,
      acknowledged: false
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }
    return event;
  }

  acknowledge(eventId) {
    const evt = this.events.find(e => e.id === eventId);
    if (evt) {
      evt.acknowledged = true;
      return true;
    }
    return false;
  }

  getActiveAlerts() {
    return this.events.filter(e => (e.type === 'WARNING' || e.type === 'CRITICAL') && !e.acknowledged);
  }

  getAllEvents() {
    return this.events;
  }

  clear() {
    this.events = [];
  }
}
