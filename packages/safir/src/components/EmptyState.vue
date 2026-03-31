<script setup lang="ts">
import { type HTMLAttributes, type Component } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  title: string
  description?: string
  icon?: Component
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('flex flex-col items-center justify-center px-4 py-12 text-center', props.class)">
    <component v-if="icon" :is="icon" class="mb-4 h-10 w-10 text-zinc-400" />
    <h3 class="text-base font-semibold text-zinc-900">{{ title }}</h3>
    <p v-if="description" class="mt-1 text-sm text-zinc-500">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>
