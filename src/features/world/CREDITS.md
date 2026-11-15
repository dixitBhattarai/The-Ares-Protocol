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

## Supplied environment models — 14 Nov 2026

The team supplied the local GLBs below. NASA filenames are cross-referenced against the official NASA resource pages; original hashes are recorded for provenance, without claiming a byte-for-byte match to a current upstream download. `tools/prepare-environment.py` reproduces the optimization in a separate Blender process: textures capped at 1024, JPEG quality 85, Moon mesh reduced from 520,192 to 29,997 faces. Editable .blend copies and unused city conversions remain ignored local artifacts; raw Downloads files are unchanged. All six shipped models total approximately 9.25 MB, down from approximately 52.5 MB.

| Asset | Creator / source | Usage and changes |
| --- | --- | --- |
| curiosity.glb | NASA/JPL-Caltech, https://science.nasa.gov/resource/curiosity-rover-3d-model/ | Curiosity_static.glb; texture optimization; scenic rover outside the playable boundary |
| earth-globe.glb | NASA/JPL-Caltech, https://science.nasa.gov/learn/heat/resource/earth-3d-model/ | Earth_1_12756.glb; texture optimization; transfer view |
| mars-globe.glb | NASA/JPL-Caltech, https://science.nasa.gov/resource/planet-mars-3d-model/ | 24881_Mars_1_6792.glb; texture optimization; transfer view |
| moon.glb | RenderX, https://sketchfab.com/3d-models/moon-26cc0b7878bb4d919b68e2be399db466 | CC BY 4.0 per embedded asset copyright; reduced mesh/textures; transfer view |
| olympus-mons.glb | SebastianSosnowski, https://sketchfab.com/3d-models/mars-olympus-mons-53679864b41a43b0ae0459ce99d6adf0 | CC BY 4.0 per embedded copyright; textures reduced; distant decorative terrain tile |
| warehouse.glb | Nicholas-3D (Nicholas01), https://sketchfab.com/3d-models/warehouse-fbx-model-free-daa7fd3ff88945298d00045ca40a4c03 | CC BY 4.0 per embedded copyright; textures reduced; Earth scenery outside playable boundary |

CC BY 4.0: https://creativecommons.org/licenses/by/4.0/. All placements are authored, scaled game compositions, not NASA facility/geographic reconstructions or true-scale planetary distances. No NASA endorsement is implied. Runtime loader owns geometry/material/texture disposal, including late results after teardown. Earth/Mars retain colored/textured sphere fallbacks if the model requests fail; scenery failure leaves the playable level intact.

City exclusions: modern_city_block.glb identifies akselmot and Sketchfab Standard in embedded copyright (team source https://sketchfab.com/3d-models/modern-city-block-c80dba249d9547cbb48d00828d23cfa7). low-poly_city_night.glb identifies smooth998 and Sketchfab Standard, source https://sketchfab.com/3d-models/low-poly-city-night-885d8034bc02407fb48cf7f0dfe61d67. The supplied Free3D huge-city URL does not establish that file's provenance. These two files are not shipped as directly downloadable public-repo GLBs; permission for that redistribution has not been established. The duplicate warehouse download is not bundled twice.

### Environment SHA-256 hashes

- curiosity.glb: f324d8bd33f57dab9fc5c4b62dffa7ea35893acd6bf847269fe6d70a5d9b4aba
- earth-globe.glb: e156bd539f1f21f9d9376f32d3b58da192820ec1d4a3692adb46af022bd3a7bb
- mars-globe.glb: defa8d2778d324b499247d958f04fef86f11b5f62ffa44cea566a207b1009961
- moon.glb: c993b824d2d1f4be6a452cb49aa39ddd389f4d95bb1b7a58a654c37feb259155
- olympus-mons.glb: 3143804ada0789deb7562d0f8ec04729efe55de4785fcc72e9e20376a0952f15
- warehouse.glb: 473952a774316d84f42d8df1bf9f1aa800efee1b1e85d255067358ffc78d374e

Original team-supplied Downloads files:

- Curiosity_static.glb: 69b31066d3d00f2d7ae09239c26b2be44e4d3a717fe7fc94df01568a1bda2c94
- Earth_1_12756.glb: 05a5aea99db8ab472487a06debc3b5d0b2cae7636a1a6b9ecfa40b7d1722ba23
- 24881_Mars_1_6792.glb: 0d27fc65fe3e6a5847cf0cd3a5c951538afdd49bd0513607d8a70e8ab1d8d7ac
- moon.glb: d4775243b50c9d18faa34bfa7276b9f7947fb6662e5898d8589e67db0b3436ac
- mars_-_olympus_mons.glb: 4997e01da55085c03b0f28e1e9d526f08b7f45ad2f9a45d49fa60f6311c15d66
- warehouse_fbx_model_free.glb: 6df746483419b9f027c270bf36278e6cfb763f307083ae92f9857c1f9ab87241


## BrainMesh Space Man suit exhibit — 14 Nov 2026

“Space Man” by BrainMesh, generated with Sloyd, licensed under CC BY 4.0. Source: https://www.sloyd.ai/free-3d-models/model/space-man-wh63ab6b . License: https://creativecommons.org/licenses/by/4.0/ . Published 18 Aug 2025; source/license verified 14 Nov 2026. Team-supplied wh63ab6b.glb contains a static mesh, no skeleton or animation clips.

Optimized in a separate Blender process: textures capped at 1024, JPEG quality 85; source 5,381,988 bytes, game asset 470,152 bytes. Model scaled to 1.55m and displayed in the solar station's existing equipment collider footprint. It is a fictional suit exhibit, not flight-certified equipment or a NASA-provided model. The animated player and Mixamo → NASA → authored fallback remain unchanged. Editable source saved locally in ignored output/playwright/space-man/space-man.blend; rendered preview inspected.

- Source SHA-256: 2efcc2938d9fe8024d4651a368afbd0c08d0d7becc995842628f586b022bf31f
- Output SHA-256: feed1392cdfec47fe7df8e07f4e16eeaa98012cc1ef5dae4d6f4e737cde7434c

Continuous Ares launch: rocket, pad, tower, exhaust and cloud sprites authored in code for this project. Earth uses the existing src/assets/earth_atmos_2048.jpg imagery already bundled with the game; no new downloads or third-party model license introduced. Scene scale, booster staging and 8x time compression are authored presentation.

EVA helmet/visor geometry, procedural reflected-horizon texture and backpack detailing authored in code for this project (15 Nov 2026). Jump/landing overlays authored on the existing credited Mixamo/NASA/procedural rigs; no additional third-party animation download. Olympus uses the existing credited model with scenic scale, placement and atmospheric material adjustments.

15 Nov station polish: facade/window geometry, ribbed greenhouse canopy, photovoltaic cell arrays, vents/skylight, machine valves/cables/gauges, plant leaves and static console waveform artwork authored procedurally for this game. These decorative screens are not NASA observations or live telemetry. No new downloaded assets or license changes; existing NASA/Mixamo/Sketchfab credits and fallback chain remain.

15 Nov: dust-front texture/particles/sheets, haze transitions and full-body jump overlays authored in code. Dust fronts are visualizations of authored game hazards, not real weather forecasts or measured Mars wind/dose values. Extended Earth launch uses the existing credited Earth image with compressed scenic scale/orientation; no new imagery/model/animation license introduced.
