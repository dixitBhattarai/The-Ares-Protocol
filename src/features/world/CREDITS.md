# World assets and music provenance

NASA source: https://science.nasa.gov/3d-resources/ and its official mirror https://github.com/nasa/NASA-3D-Resources (retrieved 2026-11-14).
Usage guidance: https://www.nasa.gov/nasa-brand-center/images-and-media/
NASA is acknowledged as the source of the following unmodified source files. Runtime transforms resize them for the fictional game; NASA does not endorse the project. These models are references, not claims that EO-1 or Opportunity carried the player to Mars.

| Local asset | NASA mirror path |
| --- | --- |
| assets/astronaut.glb | 3D Models/Astronaut/Astronaut.glb |
| assets/eo1.glb | 3D Models/Earth Observing-1 (EO-1)/Earth Observing-1 (EO-1).glb |
| assets/opportunity.glb | 3D Models/Mars Exploration Rover - Opportunity (MER-B)/Mars Exploration Rover - Opportunity (MER-B).glb |
| assets/earth.jpg | Images and Textures/Earth (A)/Earth (A).jpg |
| assets/mars.jpg | Images and Textures/Mars/Mars.jpg |

The three GLBs require Draco decompression. Local wrapper/WASM files under assets/draco are copied unchanged from the committed Three.js dependency's examples/jsm/libs/draco/gltf. Draco is Copyright Google, Apache License 2.0; Three.js is MIT. See DRACO-LICENSE.txt alongside the decoder assets.

Music supplied by Himamshu, copied unchanged from his Downloads folder. Public credit/license pages were checked 2026-11-14:

- Snowfall by Kistol. https://opengameart.org/content/snowfall — CC0. Credit: Music by Kistol. Original non-looped Snowfall.ogg; repeated playback can include its quiet ending, and is not claimed to be a seamless edited loop.
- Space (orchestral) by lasercheese. https://opengameart.org/content/space-orchestral — CC BY 3.0, https://creativecommons.org/licenses/by/3.0/. Artist links requested: https://soundcloud.com/laserost and https://www.youtube.com/user/Manofunctional. Original space.flac; unedited, played at reduced volume with repetition.
- happy tune by syncopika. https://opengameart.org/content/happy-tune — CC BY 3.0, https://creativecommons.org/licenses/by/3.0/. Credit: syncopika. Original 021914bgm2(happytune).mp3 renamed happy-tune.mp3 only; unedited, played at reduced volume with repetition.

Visible credits are provided by AssetCredits.vue. Music starts only after user interaction and respects mute, pause and hidden-tab state. Audio is loaded on demand; original music files total approximately 10.2 MB, including the 6.6 MB FLAC. No live NASA/API call is required at runtime.

All room architecture, consoles, plants, paths, gameplay scenes and fallback astronaut geometry are authored procedural game assets. Interiors and flight timings/scales are fictionalized, not exact spacecraft reconstructions. NASA suit mesh is static rather than a rigged walking animation; movement still follows Rapier poses. Text uses system fonts. Hashes/source metadata are in assets/manifest.json.
