<script setup lang="ts">
defineProps<{ id: string; large?: boolean }>();
</script>
<template>
  <div
    :class="[
      'game-art',
      {
        large,
        'tetris-scene': large && id === 'tetris',
        'tiles-scene': large && id === 'twenty48',
      },
    ]"
    aria-hidden="true"
  >
    <svg v-if="large && id === 'tetris'" viewBox="0 0 220 200">
      <g fill="none" stroke="#8baa8320">
        <path
          d="M13 12H207V188H13ZM13 56H207M13 100H207M13 144H207M57 12V188M101 12V188M145 12V188M189 12V188"
        />
      </g>
      <g stroke="#152820" stroke-width="2">
        <path d="M57 12H101V34H123V56H79V34H57Z" fill="#c8a0a5" />
        <path d="M145 78H167V122H145V144H123V100H145Z" fill="#e6b858" />
        <path d="M13 144H35V166H79V188H13Z" fill="#cc7553" />
        <path d="M79 166H101V144H123V188H79Z" fill="#b4d0b7" />
        <path d="M123 166H145V144H167V166H189V188H123Z" fill="#92b9bc" />
      </g>
    </svg>
    <div v-else-if="large && id === 'twenty48'" class="preview-tiles">
      <span
        v-for="(value, index) in [
          2, 4, 8, 0, 4, 16, 32, 0, 8, 32, 128, 2, 0, 4, 8, 2,
        ]"
        :key="index"
        :class="`preview-tile tile-${value}`"
        >{{ value || "" }}</span
      >
    </div>
    <span v-else-if="id === 'twenty48'" class="number-icon">2048</span>
    <svg v-else-if="id === 'sudoku' || id === 'npuzzle'" viewBox="0 0 32 32">
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="3"
        :fill="id === 'sudoku' ? '#94afa0' : '#caac6c'"
      />
      <text x="16" y="22" text-anchor="middle" font-size="18" fill="#302e29">
        {{ id === "sudoku" ? "9" : "15" }}
      </text>
    </svg>
    <svg v-else-if="id === 'gomoku'" viewBox="0 0 32 32">
      <path d="M3 9H29M3 23H29M9 3V29M23 3V29" stroke="#aa987a" />
      <circle cx="9" cy="9" r="6" fill="#393e32" />
      <circle cx="23" cy="23" r="6" fill="#f7efd8" stroke="#aa987a" />
    </svg>
    <svg v-else-if="id === 'bubble'" viewBox="0 0 32 32">
      <circle cx="9" cy="9" r="7" fill="#bf7963" />
      <circle cx="24" cy="9" r="7" fill="#d3af5f" />
      <circle cx="17" cy="23" r="7" fill="#91b6a4" />
    </svg>
    <svg v-else-if="id === 'snake'" viewBox="0 0 32 32">
      <path d="M4 25H17V8H27" fill="none" stroke="#659079" stroke-width="8" />
      <rect x="24" y="3" width="8" height="9" fill="#a5bea0" />
      <rect x="28" y="4" width="2" height="2" fill="#302e29" />
    </svg>
    <svg v-else viewBox="0 0 32 32">
      <g fill="#b94e36" stroke="#f2ebdd">
        <rect x="11" y="4" width="10" height="10" />
        <rect x="1" y="14" width="10" height="10" />
        <rect x="11" y="14" width="10" height="10" />
        <rect x="21" y="14" width="10" height="10" />
      </g>
    </svg>
  </div>
</template>
