<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Header from '@/components/Header.vue';
import Footer from '@/components/Footer.vue';
import GameCard from '@/components/GameCard.vue';
import BaseModal from '@/components/BaseModal.vue';
import BaseButton from '@/components/BaseButton.vue';
import { useI18n } from '@/composables/useI18n';

const router = useRouter();
const { t, saveCustomLocale, validateDict } = useI18n();

const modalOpen = ref(false);
const textareaValue = ref('');
const alertMsg = ref('');
const alertType = ref<'error' | 'success' | ''>('');

function openModal() {
  modalOpen.value = true;
  textareaValue.value = '';
  alertMsg.value = '';
  alertType.value = '';
}

function closeModal() {
  modalOpen.value = false;
}

function importLang() {
  try {
    const dict = JSON.parse(textareaValue.value);
    const result = validateDict(dict);
    if (!result.ok) {
      alertType.value = 'error';
      alertMsg.value = t('customLang.missingKeys') + ': ' + result.missing.join(', ');
      return;
    }
    saveCustomLocale('custom', dict);
    alertType.value = 'success';
    alertMsg.value = t('customLang.success');
    setTimeout(() => {
      modalOpen.value = false;
    }, 1000);
  } catch {
    alertType.value = 'error';
    alertMsg.value = t('customLang.invalidJson');
  }
}
</script>

<template>
  <div class="flex flex-col min-h-screen container-x">
    <Header />

    <main class="flex flex-col items-center flex-1 py-20 text-center">
      <h1 class="m-0 text-6xl font-extrabold tracking-tight">
        {{ t('home.title') }}
      </h1>
      <p class="m-6 mb-16 text-xl" style="color: var(--color-fg-muted, #6b7280)">
        {{ t('home.subtitle') }}
      </p>

      <div class="grid w-full gap-6" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); max-width: 1200px;">
        <GameCard icon="🧱" :title="t('home.tetris.title')" :description="t('home.tetris.description')"
          @play="router.push('/tetris')" />
        <GameCard icon="🔢" :title="t('home.sudoku.title')" :description="t('home.sudoku.description')"
          @play="router.push('/sudoku')" />
        <GameCard icon="🔲" :title="t('home.twenty48.title')" :description="t('home.twenty48.description')"
          @play="router.push('/twenty48')" />
      </div>
    </main>

    <Footer :on-custom-lang-click="openModal" />

    <BaseModal v-if="modalOpen" :title="t('customLang.title')" @close="closeModal">
      <textarea v-model="textareaValue" class="textarea" :placeholder="t('customLang.placeholder')" />
      <div v-if="alertMsg" :class="['alert', `alert-${alertType}`]">
        {{ alertMsg }}
      </div>

      <template #actions>
        <BaseButton variant="ghost" @click="closeModal">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton variant="primary" @click="importLang">
          {{ t('customLang.import') }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
