# NASA science link — 15 November 2026

The latest user request assigns a coordinated missions/UI NASA integration. The normal feature owners retain ownership after handoff. No simulation balances or dependency files are changed here.

## Integration

`createScienceClient()` in `science-client.ts` provides `load({signal?,force?})` and `clearCache()`. The shell should create one client, store `archivedScienceSnapshot()` initially, and load on opening the science console. Pass `snapshot`, `loading` and optional short `sampleStatus` to `ui/ScienceConsole.vue`; handle its `refresh` and `close` events. Abort on close/unmount or guard stale request generations. The component performs no fetch or balance changes. A successful complete response is cached for five minutes; explicit Refresh bypasses it. No polling loop is installed.

DONKI requests the prior seven UTC days with NASA's public `DEMO_KEY`. The Image and Video Library search requests Mars sand/Curiosity images. No private browser key or environment value is serialized. Browser credentials are omitted. Each request has an 8-second timeout by default and respects cancellation. The two feeds succeed/fail independently. A successful empty search is an empty result, not permission to invent an event or substitute an older event as current. Failed solar requests retain the bundled archive's exact record/date/source. Failed imagery remains unavailable; no fictional NASA photo is substituted.

`fresh` means a response retrieved now. Its observation/image date can be years old. The console labels this “NASA RESPONSE”, not “live Mars conditions”. External text is rendered as text, markup is stripped from image metadata, and links/thumbnails accept official HTTPS hosts only. Image metadata retains NASA ID, original item link, date and per-item credit. No assumption that every NASA-hosted image is public domain is made; the item page is linked for image-specific restrictions. The solar diagram is explicitly an illustration.

## Evidence and limits

- Parser/client tests: 14 passed, including source timestamps, preferred CME analysis, empty/invalid records, bad thumbnail/catalog URLs, credits, cached/forced loads, partial HTTP 429, offline/invalid data, timeout and abort.
- Typecheck passed. Production build passed.
- Native read-only HTTPS checks to `api.nasa.gov` and `images-api.nasa.gov` both returned `Tunnel connection failed: 403 Forbidden` under the managed environment's enforced restricted policy. Runtime metadata showed no NASA variable/secret bindings; only names/presence were inspected. This is a network restriction, not proof that an API key is needed. The public demo key is enough to exercise the integration when egress is allowed.
- Required API/asset domains: `api.nasa.gov`, `images-api.nasa.gov`, `images-assets.nasa.gov`. Source links also use `ccmc.gsfc.nasa.gov` and `images.nasa.gov`.
- The existing DONKI/InSight archives were inherited from this repository and are not newly independently verified by a blocked network request. The UI says so. No medical dose, Mars impact forecast, crop-growth outcome or sandbox sample chemistry is computed from CME speed.
- `nasa-apis-extra-raw.json` is unused and had no request provenance; its legacy APOD/EONET/NeoWs-looking entries now carry an explicit unverified-placeholder warning. The raw DONKI/InSight files remain unchanged. OSDR, RadLab, Mars Trek and CSA links remain further reading, not falsely claimed live integrations.
