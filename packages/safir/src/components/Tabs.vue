<script setup lang="ts">
import { type HTMLAttributes, type Component } from 'vue'
import { cn } from '../utils/cn.ts'

interface TabItem {
  key: string
  label: string
  icon?: Component
  disabled?: boolean
}

interface Props {
  modelValue: string
  tabs: TabItem[]
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function selectTab(tab: TabItem) {
  if (!tab.disabled) {
    emit('update:modelValue', tab.key)
  }
}
</script>

<template>
  <div :class="props.class">
    <div class="flex border-b border-zinc-200">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        :disabled="tab.disabled"
        :class="cn(
          'inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
          modelValue === tab.key
            ? 'border-zinc-900 text-zinc-900'
            : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700',
          tab.disabled && 'cursor-not-allowed opacity-50',
        )"
        @click="selectTab(tab)"
      >
        <component v-if="tab.icon" :is="tab.icon" class="h-4 w-4" />
        {{ tab.label }}
      </button>
    </div>
    <div class="py-4">
      <template v-for="tab in tabs" :key="tab.key">
        <div v-if="modelValue === tab.key">
          <slot :name="`tab-${tab.key}`" />
        </div>
      </template>
    </div>
  </div>
</template>
