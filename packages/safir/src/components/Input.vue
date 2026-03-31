<script setup lang="ts">
import { computed, useId, type HTMLAttributes, type Component } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  class?: HTMLAttributes['class']
  modelValue?: string
  placeholder?: string
  type?: string
  disabled?: boolean
  label?: string
  error?: string
  icon?: Component
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const id = useId()

const inputClasses = computed(() =>
  cn(
    'flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50',
    props.icon && 'pl-9',
    props.error && 'border-red-500 focus-visible:ring-red-500',
    props.class,
  ),
)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="id" class="text-sm font-medium leading-none">
      {{ label }}
    </label>
    <div class="relative">
      <component
        v-if="icon"
        :is="icon"
        class="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
      />
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="inputClasses"
        @input="onInput"
      />
    </div>
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
