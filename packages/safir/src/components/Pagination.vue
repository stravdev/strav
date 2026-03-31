<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'

interface Props {
  modelValue: number
  total: number
  perPage: number
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const totalPages = computed(() => Math.ceil(props.total / props.perPage))

const pages = computed(() => {
  const total = totalPages.value
  const current = props.modelValue
  const items: (number | '...')[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) items.push(i)
    return items
  }

  items.push(1)

  if (current > 3) {
    items.push('...')
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    items.push(i)
  }

  if (current < total - 2) {
    items.push('...')
  }

  items.push(total)

  return items
})

function goTo(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:modelValue', page)
  }
}

const buttonClass = 'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <nav :class="cn('flex items-center gap-1', props.class)" aria-label="Pagination">
    <button
      :class="buttonClass"
      :disabled="modelValue <= 1"
      @click="goTo(modelValue - 1)"
    >
      <ChevronLeftIcon class="h-4 w-4" />
    </button>

    <template v-for="(page, index) in pages" :key="index">
      <span v-if="page === '...'" class="inline-flex h-8 w-8 items-center justify-center text-sm text-zinc-400">
        ...
      </span>
      <button
        v-else
        :class="cn(
          buttonClass,
          page === modelValue && 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800',
        )"
        @click="goTo(page)"
      >
        {{ page }}
      </button>
    </template>

    <button
      :class="buttonClass"
      :disabled="modelValue >= totalPages"
      @click="goTo(modelValue + 1)"
    >
      <ChevronRightIcon class="h-4 w-4" />
    </button>
  </nav>
</template>
