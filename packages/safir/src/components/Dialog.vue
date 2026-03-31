<script setup lang="ts">
import { watch, onMounted, onUnmounted, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'
import { XMarkIcon } from '@heroicons/vue/20/solid'

interface Props {
  modelValue: boolean
  title?: string
  description?: string
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    close()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click="onBackdropClick"
      >
        <div
          :class="cn(
            'relative w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-lg',
            props.class,
          )"
        >
          <button
            class="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-zinc-950"
            @click="close"
          >
            <XMarkIcon class="h-4 w-4" />
          </button>

          <div v-if="title || description">
            <h2 v-if="title" class="text-lg font-semibold">{{ title }}</h2>
            <p v-if="description" class="mt-1 text-sm text-zinc-500">{{ description }}</p>
          </div>

          <div :class="(title || description) && 'mt-4'">
            <slot />
          </div>

          <div v-if="$slots.footer" class="mt-6 flex justify-end gap-2">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
