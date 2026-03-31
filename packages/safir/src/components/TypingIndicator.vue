<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('flex items-center gap-1 px-3 py-2', props.class)">
    <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
    <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
    <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
  </div>
</template>
