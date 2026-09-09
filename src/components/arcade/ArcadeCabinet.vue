<script setup lang="ts">
defineProps<{ title?: string }>();
</script>
<template>
  <div class="cabinet">
    <div class="machine-inner">
      <div class="marquee">
        <div class="marquee-inner">
          <span aria-hidden="true">✦</span
          ><strong>{{ title || "MINI GAMES" }}</strong
          ><span class="stripes" aria-hidden="true"><i /><i /><i /></span
          ><span aria-hidden="true">✦</span>
        </div>
      </div>
      <div class="bezel">
        <div class="screen-meta" aria-hidden="true">
          <span><i class="power" />ARCADE SYSTEM</span><span>MODEL · 007</span>
        </div>
        <div class="screen"><slot /></div>
      </div>
      <div class="control-deck">
        <div class="joystick" aria-hidden="true">
          <span class="stick" /><span class="ball" />
        </div>
        <div class="deck-actions"><slot name="controls" /></div>
      </div>
      <div class="bottom-panel" aria-hidden="true">
        <div class="speaker" />
        <div class="plate">MINI GAMES · FREE PLAY</div>
        <i class="screw" />
      </div>
    </div>
  </div>
</template>
