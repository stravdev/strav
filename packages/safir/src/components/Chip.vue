<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils/cn.ts'
import { XMarkIcon } from '@heroicons/vue/20/solid'

const chipVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-zinc-100 text-zinc-900',
        info: 'bg-blue-50 text-blue-700',
        success: 'bg-green-50 text-green-700',
        warning: 'bg-yellow-50 text-yellow-700',
        destructive: 'bg-red-50 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type ChipVariants = VariantProps<typeof chipVariants>

interface Props {
  variant?: ChipVariants['variant']
  removable?: boolean
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  remove: []
}>()

const classes = computed(() => cn(chipVariants({ variant: props.variant }), props.class))
</script>

<template>
  <span :class="classes">
    <slot />
    <button
      v-if="removable"
      type="button"
      class="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10"
      @click="emit('remove')"
    >
      <XMarkIcon class="h-3 w-3" />
    </button>
  </span>
</template>
