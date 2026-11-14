export type MusicScene = 'earth' | 'space' | 'mars';
const tracks: Record<MusicScene, string> = {
  earth: new URL('./assets/music/snowfall.ogg', import.meta.url).href,
  space: new URL('./assets/music/space.flac', import.meta.url).href,
  mars: new URL('./assets/music/happy-tune.mp3', import.meta.url).href,
};

/** One lazily loaded media element. User gestures unlock playback; hidden/paused games stay quiet. */
export function createMusic() {
  const audio = new Audio();
  audio.preload = 'none'; audio.loop = true; audio.volume = .18;
  let enabled = true, unlocked = false, paused = false, disposed = false;
  let scene: MusicScene | null = null;
  const play = () => {
    if (!disposed && unlocked && enabled && !paused && !document.hidden && scene) void audio.play().catch(() => {});
    else audio.pause();
  };
  const visibility = () => play();
  document.addEventListener('visibilitychange', visibility);
  return {
    unlock() { unlocked = true; play(); },
    select(next: MusicScene) { if (next !== scene) { scene = next; audio.pause(); audio.src = tracks[next]; } play(); },
    setEnabled(value: boolean) { enabled = value; audio.muted = !value; play(); },
    setPaused(value: boolean) { paused = value; play(); },
    dispose() { disposed = true; audio.pause(); audio.removeAttribute('src'); audio.load(); document.removeEventListener('visibilitychange', visibility); },
  };
}
