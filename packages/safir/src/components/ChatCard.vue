<script setup lang="ts">
import { computed, type HTMLAttributes, type Component } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils/cn.ts'

const cardVariants = cva(
  'rounded-lg border px-4 py-3 text-sm',
  {
    variants: {
      variant: {
        default: 'border-zinc-200 bg-white',
        info: 'border-blue-200 bg-blue-50',
        success: 'border-green-200 bg-green-50',
        warning: 'border-yellow-200 bg-yellow-50',
        destructive: 'border-red-200 bg-red-50',
        accent: 'border-purple-200 bg-purple-50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type CardVariants = VariantProps<typeof cardVariants>

interface Props {
  variant?: CardVariants['variant']
  title?: string
  icon?: Component
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const classes = computed(() => cn(cardVariants({ variant: props.variant }), props.class))
</script>

<template>
  <div :class="classes">
    <div v-if="title || icon" class="mb-2 flex items-center gap-2">
      <component v-if="icon" :is="icon" class="h-4 w-4 shrink-0" />
      <span v-if="title" class="font-medium">{{ title }}</span>
    </div>
    <div>
      <slot />
    </div>
    <div v-if="$slots.action" class="mt-3">
      <slot name="action" />
    </div>
  </div>
</template>
