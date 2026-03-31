<script setup lang="ts">
import { type HTMLAttributes } from 'vue'
import { cn } from '../utils/cn.ts'

interface Props {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <div :class="cn('relative space-y-0', props.class)">
    <slot />
  </div>
</template>
