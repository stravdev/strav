<script setup lang="ts">
import { type HTMLAttributes, type Component } from 'vue'
import { cn } from '../utils/cn.ts'
import { ChevronRightIcon } from '@heroicons/vue/20/solid'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: Component
}

interface Props {
  items: BreadcrumbItem[]
  separator?: string
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <nav :class="cn('flex', props.class)" aria-label="Breadcrumb">
    <ol class="flex items-center gap-1.5 text-sm">
      <li v-for="(item, index) in items" :key="index" class="flex items-center gap-1.5">
        <template v-if="index > 0">
          <span v-if="separator" class="text-zinc-400">{{ separator }}</span>
          <ChevronRightIcon v-else class="h-3.5 w-3.5 text-zinc-400" />
        </template>
        <a
          v-if="item.href && index < items.length - 1"
          :href="item.href"
          class="flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <component v-if="item.icon" :is="item.icon" class="h-3.5 w-3.5" />
          {{ item.label }}
        </a>
        <span
          v-else
          :class="cn(
            'flex items-center gap-1',
            index === items.length - 1 ? 'font-medium text-zinc-900' : 'text-zinc-500',
          )"
        >
          <component v-if="item.icon" :is="item.icon" class="h-3.5 w-3.5" />
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
