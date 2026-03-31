<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
const classes = computed(() =>
  cn(
    'inline-flex h-5 items-center rounded border border-zinc-200 bg-zinc-100 px-1.5 font-mono text-[10px] font-medium text-zinc-600',
    props.class,
  ),
)
</script>

<template>
  <kbd :class="classes">
    <slot />
  </kbd>
</template>
