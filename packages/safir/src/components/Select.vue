<script setup lang="ts">
import { computed, useId, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'

interface SelectOption {
  value: string
  label: string
}

interface Props {
  modelValue?: string
  options: (string | SelectOption)[]
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const id = useId()

const normalizedOptions = computed<SelectOption[]>(() =>
  props.options.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt)),
)

const selectClasses = computed(() =>
  cn(
    'flex h-9 w-full appearance-none rounded-md border border-zinc-200 bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50',
    props.error && 'border-red-500 focus-visible:ring-red-500',
  ),
)

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div :class="cn('space-y-1.5', props.class)">
    <label v-if="label" :for="id" class="text-sm font-medium leading-none">{{ label }}</label>
    <div class="relative">
      <select
        :id="id"
        :value="modelValue"
        :disabled="disabled"
        :class="selectClasses"
        @change="onChange"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in normalizedOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <ChevronDownIcon class="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
    </div>
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
