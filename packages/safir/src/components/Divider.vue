<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  label?: string
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
const classes = computed(() => cn('relative', props.class))
</script>

<template>
  <div v-if="label" :class="classes">
    <div class="absolute inset-0 flex items-center">
      <span class="w-full border-t border-zinc-200" />
    </div>
    <div class="relative flex justify-center text-xs uppercase">
      <span class="bg-white px-2 text-zinc-500">{{ label }}</span>
    </div>
  </div>
  <hr v-else :class="cn('border-zinc-200', props.class)" />
</template>
