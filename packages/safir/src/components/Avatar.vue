<script setup lang="ts">
import { ref, computed, type HTMLAttributes } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils/cn.ts'

const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 text-xs',
        default: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

type AvatarVariants = VariantProps<typeof avatarVariants>

interface Props {
  src?: string
  alt?: string
  name?: string
  size?: AvatarVariants['size']
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const imgError = ref(false)

const initials = computed(() => {
  if (!props.name) return '?'
  return props.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

const classes = computed(() => cn(avatarVariants({ size: props.size }), props.class))

function onError() {
  imgError.value = true
}
</script>

<template>
  <span :class="classes">
    <img
      v-if="src && !imgError"
      :src="src"
      :alt="alt || name"
      class="h-full w-full object-cover"
      @error="onError"
    />
    <span v-else class="font-medium text-zinc-600">{{ initials }}</span>
  </span>
</template>
