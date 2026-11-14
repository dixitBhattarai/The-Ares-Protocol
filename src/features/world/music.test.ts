import { afterEach, expect, it, vi } from 'vitest';
import { createMusic } from './music';
class FakeAudio {
  src = ''; muted = false; paused = true; preload = ''; loop = false; volume = 0;
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });
  load = vi.fn();
  removeAttribute(name: string) { if (name === 'src') this.src = ''; }
}
afterEach(() => vi.unstubAllGlobals());
it('loads one selected track, gates autoplay, and respects mute/pause/visibility', () => {
  const audio = new FakeAudio();
  const doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('Audio', class { constructor() { return audio; } });
  vi.stubGlobal('document', doc);
  const music = createMusic(); music.select('earth');
  expect(audio.play).not.toHaveBeenCalled();
  music.unlock(); expect(audio.paused).toBe(false);
  music.setEnabled(false); expect(audio.muted).toBe(true); expect(audio.paused).toBe(true);
  music.setEnabled(true); music.setPaused(true); expect(audio.paused).toBe(true);
  music.setPaused(false); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); expect(audio.paused).toBe(true);
  doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); expect(audio.paused).toBe(false);
  music.select('space'); expect(audio.src).toContain('space.flac');
  music.dispose(); expect(audio.src).toBe(''); expect(audio.load).toHaveBeenCalledOnce();
  const calls = audio.play.mock.calls.length;
  doc.dispatchEvent(new Event('visibilitychange')); expect(audio.play.mock.calls.length).toBe(calls);
});
