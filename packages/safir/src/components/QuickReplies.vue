<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  replies: string[]
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [value: string]
}>()
</script>

<template>
  <div :class="cn('flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none', props.class)">
    <button
      v-for="reply in replies"
      :key="reply"
      type="button"
      class="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
      @click="emit('select', reply)"
    >
      {{ reply }}
    </button>
  </div>
</template>
