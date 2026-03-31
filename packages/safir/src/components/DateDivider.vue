<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  label: string
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('flex items-center gap-3 py-2', props.class)">
    <div class="h-px flex-1 bg-zinc-200" />
    <span class="text-xs font-medium text-zinc-400">{{ label }}</span>
    <div class="h-px flex-1 bg-zinc-200" />
  </div>
</template>
