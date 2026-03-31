<script setup lang="ts">
import { type HTMLAttributes, type Component } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  icon?: Component
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('relative flex gap-3 pb-6 last:pb-0', props.class)">
    <!-- Vertical line -->
    <div class="absolute left-[11px] top-6 bottom-0 w-px bg-zinc-200 last:hidden" />

    <!-- Dot / Icon -->
    <div class="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white">
      <component v-if="icon" :is="icon" class="h-3.5 w-3.5 text-zinc-500" />
      <span v-else class="h-2 w-2 rounded-full bg-zinc-400" />
    </div>

    <!-- Content -->
    <div class="flex-1 pt-0.5 text-sm">
      <slot />
    </div>
  </div>
</template>
