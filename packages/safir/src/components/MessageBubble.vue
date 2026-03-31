<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  side?: 'user' | 'agent'
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  side: 'agent',
})

const classes = computed(() =>
  cn(
    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
    props.side === 'user'
      ? 'ml-auto bg-zinc-900 text-zinc-50'
      : 'mr-auto bg-zinc-100 text-zinc-900',
    props.class,
  ),
)
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
