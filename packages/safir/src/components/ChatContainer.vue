<script setup lang="ts">
import { ref, onMounted, watch, nextTick, type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  autoScroll?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  autoScroll: true,
})

const emit = defineEmits<{
  scrollTop: []
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const isAtBottom = ref(true)

function scrollToBottom() {
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight
  }
}

function onScroll() {
  if (!containerRef.value) return

  const { scrollTop, scrollHeight, clientHeight } = containerRef.value
  isAtBottom.value = scrollHeight - scrollTop - clientHeight < 32

  if (scrollTop === 0) {
    emit('scrollTop')
  }
}

onMounted(() => {
  if (props.autoScroll) {
    scrollToBottom()
  }
})

// Watch for slot content changes via MutationObserver
onMounted(() => {
  if (!containerRef.value) return

  const observer = new MutationObserver(() => {
    if (props.autoScroll && isAtBottom.value) {
      nextTick(scrollToBottom)
    }
  })

  observer.observe(containerRef.value, { childList: true, subtree: true })
})

defineExpose({ scrollToBottom })
</script>

<template>
  <div
    ref="containerRef"
    :class="cn('flex flex-1 flex-col overflow-y-auto', props.class)"
    @scroll="onScroll"
  >
    <slot />
  </div>
</template>
