<script setup lang="ts">
import { shallowRef } from "vue";
import BaseModal from "./BaseModal.vue";
import BaseButton from "./BaseButton.vue";
import { useI18n } from "@/composables/useI18n";
const emit = defineEmits<{ close: [] }>();
const { t, validateDict, saveCustomLocale } = useI18n();
const name = shallowRef(""),
  content = shallowRef(""),
  error = shallowRef(false);
function save() {
  try {
    const dict: unknown = JSON.parse(content.value);
    if (
      !name.value.trim() ||
      ["zh-CN", "en-US"].includes(name.value.trim()) ||
      !validateDict(dict).ok
    )
      throw new Error();
    saveCustomLocale(
      name.value.trim(),
      dict as Parameters<typeof saveCustomLocale>[1],
    );
    emit("close");
  } catch {
    error.value = true;
  }
}
</script>
<template>
  <BaseModal :title="t('customLang.title')" @close="emit('close')"
    ><p>{{ t("arcade.importBody") }}</p>
    <label class="text-field"
      >{{ t("arcade.importName")
      }}<input
        v-model="name"
        maxlength="40"
        :aria-label="t('arcade.importName')" /></label
    ><label class="text-field"
      >JSON<textarea
        v-model="content"
        rows="8"
        aria-label="JSON"
        spellcheck="false"
      />
    </label>
    <p v-if="error" role="alert">{{ t("arcade.importError") }}</p>
    <template #actions
      ><BaseButton @click="emit('close')">{{ t("common.close") }}</BaseButton
      ><BaseButton variant="primary" @click="save">{{
        t("common.save")
      }}</BaseButton></template
    ></BaseModal
  >
</template>
