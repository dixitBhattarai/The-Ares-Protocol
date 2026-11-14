# World assets and music provenance

## Adobe Mixamo character and motion

`assets/astra.glb`: Astra character (downloaded as `Ch48_nonPBR.fbx`), Breathing Idle, and Walking (description: Walking With A Swagger), downloaded from https://www.mixamo.com/ on 2026-11-14 through the user's signed-in session. Walking was exported In Place; clips use 30 fps, no keyframe reduction, without skin. Character was exported as binary FBX in T-pose.

Converted with Blender 5.1 to a game-embedded GLB with two clips (Idle, Walk), 65 joints and three JPEG diffuse maps capped at 1024 pixels. Simplified materials use authored roughness. Source FBXs remain outside this repository. `tools/prepare-mixamo.py` documents reproduction; an editable blend is saved alongside local preview artifacts, outside tracked game assets. Runtime removes horizontal hip drift and crossfades clips; the physics root remains separate.

Adobe's usage FAQ: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html (checked 2026-11-14). Assets are incorporated into this game, not offered as a standalone character/animation library. Astra is a fictional suit, not NASA equipment. The NASA suit remains the first asset-failure fallback, followed by authored procedural geometry.

Animation approach reference: https://github.com/mrdoob/three.js/blob/master/examples/webgl_animation_skinning_blending.html — Three.js contributors, MIT (https://github.com/mrdoob/three.js/blob/master/LICENSE). This project uses AnimationMixer and crossfading in its existing App-owned render loop, without the example's GUI or separate animation loop.

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

All room architecture, consoles, plants, paths, gameplay scenes and fallback astronaut geometry are authored procedural game assets. Interiors and flight timings/scales are fictionalized, not exact spacecraft reconstructions. The NASA suit source mesh is unmodified; an authored automatic skeleton and skin weights are applied at runtime for a basic procedural gait. This animation is not NASA-supplied motion or motion capture. Movement still follows Rapier poses. Text uses system fonts. Hashes/source metadata are in assets/manifest.json.
