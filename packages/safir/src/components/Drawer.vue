<script setup lang="ts">
import { watch, onMounted, onUnmounted, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'
import { XMarkIcon } from '@heroicons/vue/20/solid'

interface Props {
  modelValue: boolean
  title?: string
  description?: string
  side?: 'left' | 'right'
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  side: 'right',
})

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

const sideClasses: Record<string, string> = {
  left: 'inset-y-0 left-0',
  right: 'inset-y-0 right-0',
}

const enterFrom: Record<string, string> = {
  left: '-translate-x-full',
  right: 'translate-x-full',
}
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
          :enter-from-class="enterFrom[side]"
          :leave-to-class="enterFrom[side]"
          appear
        >
          <div
            v-if="modelValue"
            :class="cn(
              'fixed flex h-full w-full max-w-sm flex-col border-zinc-200 bg-white shadow-xl',
              sideClasses[side],
              side === 'left' ? 'border-r' : 'border-l',
              props.class,
            )"
            @click.stop
          >
            <div class="flex items-start justify-between border-b border-zinc-100 px-6 py-4">
              <div>
                <h2 v-if="title" class="text-lg font-semibold">{{ title }}</h2>
                <p v-if="description" class="mt-1 text-sm text-zinc-500">{{ description }}</p>
              </div>
              <button
                class="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                @click="close"
              >
                <XMarkIcon class="h-4 w-4" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-6 py-4">
              <slot />
            </div>

            <div v-if="$slots.footer" class="border-t border-zinc-100 px-6 py-4">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
