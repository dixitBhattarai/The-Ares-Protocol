# NASA Space Weather Observation & Mission Data Provenance

## Refreshable Archived DONKI Snapshot

The mission uses `donki-cme-snapshot.json` as a bundled, offline snapshot for the Shift 2 shelter decision and Shift 3 authored shelter drill. To refresh it intentionally, run:

```sh
node src/features/missions/scripts/refresh-donki-snapshot.mjs
```

By default, the script requests the prior seven UTC days from NASA's current DONKI CME API endpoint. An explicit range can be supplied as `START_DATE END_DATE` in `YYYY-MM-DD` form. It uses `NASA_API_KEY` from the environment when set, otherwise NASA's `DEMO_KEY`. The key is never written to the snapshot. The snapshot keeps the full response, the selected latest CME with a usable analysis, exact non-secret endpoint/date parameters, retrieval time, observation time, units and attribution. A failed request or invalid/empty response leaves the previous snapshot unchanged.

Refreshing is a maintainer action, not a game action. `loadMission()` remains synchronous and performs no network request; the shipped snapshot is what players use offline. The selected CME is evidence context only. The shelter drill and all reserve changes are authored mechanics, not claims about Mars conditions or human radiation dose. The older May 2024 record below remains preserved as a historical fixture and is tested separately.

## 1. Primary Observation: Coronal Mass Ejection & Solar Energetic Particle Event (May 2024)

### Observation Metadata
- **Source Database**: NASA Space Weather Database Of Notifications, Knowledge, Information (DONKI)
- **Host Institution**: Community Coordinated Modeling Center (CCMC), NASA Goddard Space Flight Center (GSFC)
- **Primary Event ID**: `2024-05-11T01:36:00-CME-001`
- **Associated Active Region**: NOAA Active Region 13664 (AR 13664), solar coordinates S17W47
- **Associated Flare**: GOES Solar Flare X5.8 (peak soft X-ray flux $5.8 \times 10^{-4}\ \text{W/m}^2$, 0.1–0.8 nm)
- **Observation Timestamp**: `2024-05-11T01:36Z` (coronagraph first appearance)
- **Retrieval Timestamp**: `2026-11-14T05:40:00Z`
- **Query URL**: `https://api.nasa.gov/DONKI/CME?startDate=2024-05-10&endDate=2024-05-11&api_key=DEMO_KEY`
- **Permanent Catalog Link**: `https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30742/-1`
- **Observing Instruments**:
  - SOHO (Solar and Heliospheric Observatory): LASCO C2 and C3 coronagraphs
  - STEREO A (Solar Terrestrial Relations Observatory): SECCHI / COR2 coronagraph
  - SDO (Solar Dynamics Observatory): Atmospheric Imaging Assembly (AIA 193 Å extreme ultraviolet channel)
  - GOES (Geostationary Operational Environmental Satellites): X-ray sensor (XRS)

### Physical Measurements & Units
- **CME Plane-of-Sky Speed**: Up to $1820\ \text{km/s}$ (CME Analysis ID: 30761, Type O, rapid expansion)
- **Angular Half-Width**: $48^\circ$ (partial-to-full halo geometry)
- **Solar Flare Classification**: Class X5.8 (extreme solar flare)
- **Heliiospheric Propagation**: Rapid interplanetary shock propagating outward across the inner solar system, driving solar energetic particles (SEPs) including protons exceeding 10–100 MeV.

---

## 2. Additional Contextual Evidence & Educational References

### A. Oxygen In-Situ Resource Utilization (MOXIE)
- **Source**: NASA Perseverance Rover / Mars 2020 Mission
- **URL**: `https://mars.nasa.gov/mars2020/spacecraft/instruments/moxie/`
- **Operating Timeline**: April 2021 – August 2023 (16 successful oxygen production runs on Mars)
- **Physical Context**: Solid Oxide Electrolysis Cells (SOEC) heating Martian atmospheric carbon dioxide ($\text{CO}_2$) to $800^\circ\text{C}$ to produce high-purity $\text{O}_2$ ($2\text{CO}_2 \to 2\text{CO} + \text{O}_2$) at ~12 grams/hour, drawing ~300 W of electrical power.
- **Game Adaptation**: Shift 1 choice to run oxygen production represents spending electrical battery reserves and consumable life-support supplies to replenish breathable air.

### B. Interplanetary Communications & Light-Travel Delay (DSN)
- **Source**: NASA Deep Space Network (SCaN Program)
- **URL**: `https://www.nasa.gov/directorates/somd/space-communications-navigation-program/deep-space-network/`
- **Physical Context**: Radio signals travel at the speed of light ($c \approx 300{,}000\ \text{km/s}$). Mars-Earth orbital distance varies between 54.6 million km and 401 million km, resulting in one-way communication latency of 3 to 22 minutes (round-trip 6 to 44 minutes).
- **Game Adaptation**: Shift 5 demonstrates that finite light travel speed imposes a 1-turn verification latency for planetary telemetry sent to Earth. Extra power cannot eliminate physical light travel delay.

### C. Controlled Environment Agriculture (CSA Food Production Toolkit)
- **Source**: Canadian Space Agency (CSA) Youth STEM & Food Production Toolkit
- **URL**: `https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/`
- **Physical Context**: Closed-loop hydroponic systems require continuous high-intensity photosynthetic LED lighting and active aeration, consuming significant electrical power to yield edible crops and biomass.
- **Game Adaptation**: Shift 4 dilemma between powering greenhouse lamps (spending power and supplies to advance botany science) versus dimming lamps to conserve battery reserves.

---

## 3. License, Attribution & Caveats

### License & Public Domain Terms
NASA open data and imagery are not protected by copyright under US law (17 U.S.C. § 105) and are provided freely for educational and scientific use.

### Official NASA Non-Endorsement Caveat
> "NASA data, imagery, and technical information may not be used to state or imply the endorsement by NASA or by any NASA employee of a commercial product, service, or activity, or used in any manner that might mislead."

### Scientific Simplifications & Distinctions
1. **Solar Activity vs. Mars Crew Dose**: A coronagraph CME observation or flare classification (X5.8, $1820\ \text{km/s}$) characterizes solar plasma eruption in space. It is **not** a direct measurement of radiation dose (e.g., mGy or mSv) received by a human crew on the surface of Mars. Mars has no intrinsic global dipolar magnetic field and possesses a thin atmosphere (~6–10 hPa, ~1% of Earth's column density), so high-energy solar energetic protons (SEPs) reach the ground. Accurately determining biological dose requires complex particle transport codes (such as NASA's HZETRN or GEANT4).
2. **Game Mechanics**: In *The Ares Protocol*, the May 2024 event is abstracted into an authored space weather hazard occurring on Shift 3:
   - Outpost with storm shelter shielding ($\ge 15$ shielding points, constructed from Martian regolith) mitigates damage: $-4\ \text{Power}, -2\ \text{Oxygen}$.
   - Unshielded outpost ($< 15$ shielding points) suffers severe electrical surge and scrubber damage: $-22\ \text{Power}, -18\ \text{Oxygen}, -10\ \text{Supplies}$.
3. **Reserves**: Game resources (Power, Oxygen, Supplies) are authored educational indicators scaled 0–100, not real-time physical units (liters, kWh, or kilograms).
