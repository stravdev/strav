<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  width?: string
  height?: string
  rounded?: 'none' | 'sm' | 'default' | 'full'
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  rounded: 'default',
})

const roundedClasses: Record<string, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  default: 'rounded-md',
  full: 'rounded-full',
}

const classes = computed(() =>
  cn('animate-pulse bg-zinc-200', roundedClasses[props.rounded], props.class),
)

const style = computed(() => ({
  width: props.width,
  height: props.height,
}))
</script>

<template>
  <div :class="classes" :style="style" />
</template>
