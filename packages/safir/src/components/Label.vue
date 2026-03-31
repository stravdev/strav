<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  for?: string
  required?: boolean
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
const classes = computed(() => cn('text-sm font-medium leading-none', props.class))
</script>

<template>
  <label :for="props.for" :class="classes">
    <slot />
    <span v-if="required" class="ml-0.5 text-red-500">*</span>
  </label>
</template>
