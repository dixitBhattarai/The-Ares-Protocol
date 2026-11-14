<script setup lang="ts">
import type { GameAction, GameState, MissionData, StationTask } from '../../contracts';
defineProps<{state:Readonly<GameState>;mission:MissionData;tasks:readonly StationTask[];accessible:boolean}>();
defineEmits<{action:[action:GameAction]}>();
</script>
<template>
  <section class="task-board" aria-label="Station work orders">
    <p class="eyebrow">EXPLORE · WORK · PROTECT</p>
    <h2>Your outpost jobs</h2>
    <p>Finish {{ mission.maxTurns }} jobs and keep the base running. Every completed job gives a benefit. You can repeat jobs.</p>
    <p><strong>{{ state.turn }} / {{ mission.maxTurns }} jobs finished</strong> · {{ Math.floor(state.taskRun?.elapsed ?? 0) }}s active time</p>
    <p>Systems use 4 power, 4 air and 3 supplies every 20 seconds. Hazards arrive every 30 seconds, even while exploring. Prepare the matching station to prevent damage.</p>
    <p>Rewards, timers and forecasts are game rules. NASA sources provide science context.</p>
    <p v-if="accessible">Accessible consoles enabled: the same minigames work here without walking.</p>
    <ul>
      <li v-for="task in tasks" :key="task.id">
        <div class="station">{{ task.station }}</div>
        <h3>{{ task.title }}</h3>
        <p class="benefit">{{ task.benefit }}</p><p>{{ task.prevention }}</p>
        <button @click="$emit('action',{type:'START_TASK',taskId:task.id})">Start {{ task.title.toLowerCase() }}</button>
      </li>
    </ul>
    <p role="status" v-if="state.log.length">{{ state.log[state.log.length-1] }}</p>
    <button @click="$emit('action',{type:'PAUSE'})">Pause mission</button>
  </section>
</template>
<style scoped>
.task-board{padding:18px;color:#e6f3ec;font-size:13px;line-height:1.6}.eyebrow,.station{color:#b1ebd4;font-size:11px;text-transform:uppercase;letter-spacing:.08em}h2{font-size:23px}ul{list-style:none;padding:0}li{padding:14px 0;border-top:1px solid #55727b}h3{font-size:17px;margin:4px 0}p{margin:8px 0}.benefit{color:#c5ffc7;font-weight:bold}button{padding:11px;border-radius:8px;background:#a8efdc;color:#123b3d;border:1px solid #c9fff0;font-weight:700;cursor:pointer}button:focus-visible{outline:3px solid #ffd577;outline-offset:3px}
</style>
