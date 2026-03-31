<script setup lang="ts">
import { watch, onMounted, onUnmounted, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'
import { XMarkIcon } from '@heroicons/vue/20/solid'

interface Props {
  modelValue: boolean
  title?: string
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
        class="fixed inset-0 z-50 bg-black/50"
        @click="onBackdropClick"
      >
        <Transition
          enter-active-class="transition-transform duration-300 ease-out"
          leave-active-class="transition-transform duration-200 ease-in"
          enter-from-class="translate-y-full"
          leave-to-class="translate-y-full"
          appear
        >
          <div
            v-if="modelValue"
            :class="cn(
              'fixed inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-xl bg-white shadow-xl',
              props.class,
            )"
            @click.stop
          >
            <div class="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <div class="mx-auto mb-2 h-1 w-8 rounded-full bg-zinc-300" />
            </div>
            <div v-if="title" class="flex items-center justify-between px-4 py-3">
              <h2 class="text-base font-semibold">{{ title }}</h2>
              <button
                class="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                @click="close"
              >
                <XMarkIcon class="h-4 w-4" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-3">
              <slot />
            </div>

            <div v-if="$slots.footer" class="border-t border-zinc-100 px-4 py-3">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
