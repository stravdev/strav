<script setup lang="ts">
import { ref, watch, nextTick, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'
import { ArrowUpIcon } from '@heroicons/vue/20/solid'

interface Props {
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Type a message...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

function resize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function onInput(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  emit('update:modelValue', value)
  nextTick(resize)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function send() {
  if (!props.modelValue?.trim() || props.disabled || props.loading) return
  emit('send')
}

watch(() => props.modelValue, () => nextTick(resize))

const canSend = ref(false)
watch(
  () => props.modelValue,
  (v) => { canSend.value = !!v?.trim() },
  { immediate: true },
)
</script>

<template>
  <div :class="cn('flex items-end gap-2 border-t border-zinc-200 bg-white px-4 py-3', props.class)">
    <textarea
      ref="textareaRef"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled || loading"
      rows="1"
      class="flex-1 resize-none rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
      @input="onInput"
      @keydown="onKeydown"
    />
    <button
      type="button"
      :disabled="!canSend || disabled || loading"
      :class="cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
        canSend && !disabled && !loading
          ? 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800'
          : 'bg-zinc-100 text-zinc-400',
      )"
      @click="send"
    >
      <ArrowUpIcon class="h-4 w-4" />
    </button>
  </div>
</template>
