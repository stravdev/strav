<script setup lang="ts">
import { type HTMLAttributes, type Component } from 'vue'
import { cn } from '../utils/cn.ts'
import { ChevronRightIcon } from '@heroicons/vue/20/solid'

interface Props {
  modelValue?: boolean
  title: string
  icon?: Component
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function toggle() {
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <div :class="cn('border-b border-zinc-200', props.class)">
    <button
      type="button"
      class="flex w-full items-center gap-2 py-3 text-left text-sm font-medium transition-colors hover:text-zinc-600"
      :aria-expanded="modelValue"
      @click="toggle"
    >
      <ChevronRightIcon
        :class="cn(
          'h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200',
          modelValue && 'rotate-90',
        )"
      />
      <component v-if="icon" :is="icon" class="h-4 w-4 shrink-0 text-zinc-500" />
      <span>{{ title }}</span>
    </button>
    <div
      v-if="modelValue"
      class="pb-3 pl-6 text-sm text-zinc-600"
    >
      <slot />
    </div>
  </div>
</template>
