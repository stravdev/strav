<script setup lang="ts">
import { computed, useId, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

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
  <div :class="cn('flex items-center justify-between gap-2', props.class)">
    <div v-if="label || description" class="select-none" @click="toggle">
      <label v-if="label" :for="id" class="cursor-pointer text-sm font-medium leading-none">{{ label }}</label>
      <p v-if="description" class="mt-1 text-xs text-zinc-500">{{ description }}</p>
    </div>
    <button
      :id="id"
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      :class="cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50',
        modelValue ? 'bg-zinc-900' : 'bg-zinc-200',
      )"
      @click="toggle"
    >
      <span
        :class="cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          modelValue ? 'translate-x-4' : 'translate-x-0',
        )"
      />
    </button>
  </div>
</template>
