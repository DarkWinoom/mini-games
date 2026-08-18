<script setup lang="ts">
import { useRouter } from 'vue-router';
import Header from '@/components/Header.vue';
import Footer from '@/components/Footer.vue';
import BaseButton from '@/components/BaseButton.vue';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <div class="flex flex-col min-h-screen container-x">
    <Header />
    <main class="flex items-center justify-center flex-1 text-center">
      <div>
        <h1 class="m-0 mb-4 text-5xl font-extrabold tracking-tight">
          {{ t('tetris.title') }}
        </h1>
        <p class="text-lg text-gray-500 dark:text-white/70">
          Coming in stage 6
        </p>
        <BaseButton variant="ghost" class="mt-6" @click="router.push('/')">
          ← {{ t('common.back') }}
        </BaseButton>
      </div>
    </main>
    <Footer :on-custom-lang-click="() => { }" />
  </div>
</template>
