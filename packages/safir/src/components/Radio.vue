<script setup lang="ts">
import { useId, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface RadioOption {
  value: string
  label: string
  description?: string
}

interface Props {
  modelValue?: string
  options: RadioOption[]
  label?: string
  disabled?: boolean
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const groupId = useId()

function select(value: string) {
  if (!props.disabled) {
    emit('update:modelValue', value)
  }
}
</script>

<template>
  <fieldset :class="cn('space-y-3', props.class)" :disabled="disabled">
    <legend v-if="label" class="text-sm font-medium leading-none">{{ label }}</legend>
    <div v-for="option in options" :key="option.value" class="flex items-start gap-2">
      <button
        type="button"
        role="radio"
        :aria-checked="modelValue === option.value"
        :class="cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50',
          modelValue === option.value && 'border-zinc-900',
        )"
        @click="select(option.value)"
      >
        <span
          v-if="modelValue === option.value"
          class="h-2 w-2 rounded-full bg-zinc-900"
        />
      </button>
      <div class="select-none" @click="select(option.value)">
        <span class="cursor-pointer text-sm font-medium leading-none">{{ option.label }}</span>
        <p v-if="option.description" class="mt-1 text-xs text-zinc-500">{{ option.description }}</p>
      </div>
    </div>
  </fieldset>
</template>
