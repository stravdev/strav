<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  steps: number
  current: number
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('flex items-center gap-1.5', props.class)" role="progressbar" :aria-valuenow="current" :aria-valuemax="steps">
    <span
      v-for="step in steps"
      :key="step"
      :class="cn(
        'h-2 w-2 rounded-full transition-colors',
        step <= current ? 'bg-zinc-900' : 'bg-zinc-200',
      )"
    />
  </div>
</template>
