<script setup lang="ts">
import { computed, type HTMLAttributes, type Component } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils/cn.ts'
import {
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/20/solid'

const alertVariants = cva(
  'relative rounded-lg border px-4 py-3 text-sm',
  {
    variants: {
      variant: {
        default: 'border-zinc-200 bg-white text-zinc-950',
        info: 'border-blue-200 bg-blue-50 text-blue-900',
        success: 'border-green-200 bg-green-50 text-green-900',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
        destructive: 'border-red-200 bg-red-50 text-red-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type AlertVariants = VariantProps<typeof alertVariants>

const variantIcons: Record<string, Component> = {
  default: InformationCircleIcon,
  info: InformationCircleIcon,
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  destructive: XCircleIcon,
}

interface Props {
  title?: string
  variant?: AlertVariants['variant']
  showIcon?: boolean
  icon?: Component
  dismissible?: boolean
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  dismiss: []
}>()

const classes = computed(() => cn(alertVariants({ variant: props.variant }), props.class))

const resolvedIcon = computed(() => {
  if (props.icon) return props.icon
  if (props.showIcon) return variantIcons[props.variant || 'default']
  return null
})
</script>

<template>
  <div :class="classes" role="alert">
    <div :class="cn('flex gap-3', dismissible && 'pr-8')">
      <component v-if="resolvedIcon" :is="resolvedIcon" class="mt-0.5 h-4 w-4 shrink-0" />
      <div class="min-w-0">
        <h5 v-if="title" class="font-medium leading-none tracking-tight">{{ title }}</h5>
        <div v-if="$slots.default" :class="title && 'mt-1.5'">
          <slot />
        </div>
      </div>
    </div>
    <button
      v-if="dismissible"
      class="absolute right-3 top-3 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-zinc-950"
      @click="emit('dismiss')"
    >
      <XMarkIcon class="h-4 w-4" />
    </button>
  </div>
</template>
