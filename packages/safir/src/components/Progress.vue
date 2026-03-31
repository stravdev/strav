<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils/cn.ts'

const progressVariants = cva('h-full rounded-full transition-all', {
  variants: {
    color: {
      default: 'bg-zinc-900',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      destructive: 'bg-red-500',
    },
  },
  defaultVariants: {
    color: 'default',
  },
})

const trackVariants = cva('w-full overflow-hidden rounded-full bg-zinc-100', {
  variants: {
    size: {
      sm: 'h-1.5',
      default: 'h-2.5',
      lg: 'h-4',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

type ProgressVariants = VariantProps<typeof progressVariants>
type TrackVariants = VariantProps<typeof trackVariants>

interface Props {
  value: number
  size?: TrackVariants['size']
  color?: ProgressVariants['color']
  label?: string
  showValue?: boolean
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const clampedValue = computed(() => Math.min(100, Math.max(0, props.value)))
</script>

<template>
  <div :class="cn('space-y-1.5', props.class)">
    <div v-if="label || showValue" class="flex justify-between text-sm">
      <span v-if="label" class="font-medium">{{ label }}</span>
      <span v-if="showValue" class="text-zinc-500">{{ clampedValue }}%</span>
    </div>
    <div :class="trackVariants({ size })" role="progressbar" :aria-valuenow="clampedValue" aria-valuemin="0" aria-valuemax="100">
      <div :class="progressVariants({ color })" :style="{ width: `${clampedValue}%` }" />
    </div>
  </div>
</template>
