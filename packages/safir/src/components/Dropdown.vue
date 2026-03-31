<script setup lang="ts">
import { ref, onMounted, onUnmounted, type HTMLAttributes, type Component } from 'vue'
import { cn } from '../utils/cn.ts'

interface DropdownItem {
  label?: string
  icon?: Component
  action?: string
  disabled?: boolean
  separator?: boolean
}

interface Props {
  items: DropdownItem[]
  align?: 'left' | 'right'
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  align: 'left',
})

const emit = defineEmits<{
  select: [item: DropdownItem]
}>()

const open = ref(false)
const containerRef = ref<HTMLElement>()

function toggle() {
  open.value = !open.value
}

function selectItem(item: DropdownItem) {
  if (item.disabled) return
  emit('select', item)
  open.value = false
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))

const alignClasses: Record<string, string> = {
  left: 'left-0',
  right: 'right-0',
}
</script>

<template>
  <div ref="containerRef" class="relative inline-flex">
    <div @click="toggle">
      <slot />
    </div>
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      leave-active-class="transition-all duration-100 ease-in"
      enter-from-class="scale-95 opacity-0"
      leave-to-class="scale-95 opacity-0"
    >
      <div
        v-if="open"
        :class="cn(
          'absolute top-full z-50 mt-1 min-w-[160px] rounded-md border border-zinc-200 bg-white py-1 shadow-lg',
          alignClasses[align],
          props.class,
        )"
      >
        <template v-for="(item, index) in items" :key="index">
          <div v-if="item.separator" class="my-1 border-t border-zinc-100" />
          <button
            v-else
            :disabled="item.disabled"
            :class="cn(
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50',
            )"
            @click="selectItem(item)"
          >
            <component v-if="item.icon" :is="item.icon" class="h-4 w-4 text-zinc-500" />
            <span>{{ item.label }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>
