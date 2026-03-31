<script setup lang="ts">
import { computed, useId, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'
import { CheckIcon } from '@heroicons/vue/20/solid'

interface Props {
  modelValue?: boolean
  label?: string
  description?: string
  disabled?: boolean
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const id = useId()

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <div :class="cn('flex items-start gap-2', props.class)">
    <button
      :id="id"
      type="button"
      role="checkbox"
      :aria-checked="modelValue"
      :disabled="disabled"
      :class="cn(
        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50',
        modelValue && 'border-zinc-900 bg-zinc-900 text-zinc-50',
      )"
      @click="toggle"
    >
      <CheckIcon v-if="modelValue" class="h-3 w-3" />
    </button>
    <div v-if="label || description" class="select-none" @click="toggle">
      <label v-if="label" :for="id" class="cursor-pointer text-sm font-medium leading-none">{{ label }}</label>
      <p v-if="description" class="mt-1 text-xs text-zinc-500">{{ description }}</p>
    </div>
  </div>
</template>
