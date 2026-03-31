<script setup lang="ts">
import { ref, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  side: 'top',
})

const visible = ref(false)

const sideClasses: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}
</script>

<template>
  <div
    class="relative inline-flex"
    @mouseenter="visible = true"
    @mouseleave="visible = false"
    @focusin="visible = true"
    @focusout="visible = false"
  >
    <slot />
    <Transition
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-100"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        role="tooltip"
        :class="cn(
          'absolute z-50 whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1 text-xs text-zinc-50 shadow-md',
          sideClasses[side],
          props.class,
        )"
      >
        {{ content }}
      </div>
    </Transition>
  </div>
</template>
