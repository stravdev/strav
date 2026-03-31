<script setup lang="ts">
import { ref, nextTick, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'
import { PencilIcon } from '@heroicons/vue/20/solid'

interface Props {
  modelValue: string
  placeholder?: string
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editing = ref(false)
const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

async function startEditing() {
  draft.value = props.modelValue
  editing.value = true
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

function save() {
  editing.value = false
  if (draft.value !== props.modelValue) {
    emit('update:modelValue', draft.value)
  }
}

function cancel() {
  editing.value = false
  draft.value = props.modelValue
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    save()
  } else if (e.key === 'Escape') {
    cancel()
  }
}
</script>

<template>
  <div :class="cn('group inline-flex items-center gap-1.5', props.class)">
    <input
      v-if="editing"
      ref="inputRef"
      v-model="draft"
      :placeholder="placeholder"
      class="rounded-md border border-zinc-200 bg-transparent px-2 py-0.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
      @keydown="onKeydown"
      @blur="save"
    />
    <template v-else>
      <span class="text-sm">{{ modelValue || placeholder }}</span>
      <button
        type="button"
        class="rounded-sm p-0.5 text-zinc-400 opacity-0 transition-opacity hover:text-zinc-600 group-hover:opacity-100"
        @click="startEditing"
      >
        <PencilIcon class="h-3.5 w-3.5" />
      </button>
    </template>
  </div>
</template>
