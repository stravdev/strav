<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  title?: string
  description?: string
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
const classes = computed(() => cn('rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow', props.class))
</script>

<template>
  <div :class="classes">
    <div v-if="title || description" class="border-b border-zinc-100 px-6 py-4">
      <h3 v-if="title" class="text-lg font-semibold leading-none tracking-tight">{{ title }}</h3>
      <p v-if="description" class="mt-1.5 text-sm text-zinc-500">{{ description }}</p>
    </div>
    <div class="px-6 py-4">
      <slot />
    </div>
    <div v-if="$slots.footer" class="border-t border-zinc-100 px-6 py-4">
      <slot name="footer" />
    </div>
  </div>
</template>
