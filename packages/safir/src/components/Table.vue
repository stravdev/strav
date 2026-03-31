<script setup lang="ts">
import { type HTMLAttributes, type Component } from 'vue'
import { cn } from '../utils/cn.ts'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/vue/20/solid'

interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string
}

interface Props {
  columns: TableColumn[]
  rows: Record<string, any>[]
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  striped?: boolean
  hoverable?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  hoverable: true,
})

const emit = defineEmits<{
  sort: [key: string]
}>()

function onSort(column: TableColumn) {
  if (column.sortable) {
    emit('sort', column.key)
  }
}

const alignClasses: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}
</script>

<template>
  <div :class="cn('overflow-x-auto rounded-lg border border-zinc-200', props.class)">
    <table class="w-full text-sm">
      <thead class="border-b border-zinc-200 bg-zinc-50">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :class="cn(
              'px-4 py-3 font-medium text-zinc-500',
              alignClasses[col.align || 'left'],
              col.sortable && 'cursor-pointer select-none hover:text-zinc-900',
            )"
            :style="col.width ? { width: col.width } : undefined"
            @click="onSort(col)"
          >
            <div :class="cn('flex items-center gap-1', col.align === 'right' && 'justify-end', col.align === 'center' && 'justify-center')">
              {{ col.label }}
              <template v-if="col.sortable && sortBy === col.key">
                <ChevronUpIcon v-if="sortDir === 'asc'" class="h-3.5 w-3.5" />
                <ChevronDownIcon v-else class="h-3.5 w-3.5" />
              </template>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-if="rows.length > 0">
          <tr
            v-for="(row, index) in rows"
            :key="index"
            :class="cn(
              'border-b border-zinc-100 last:border-0',
              striped && index % 2 === 1 && 'bg-zinc-50/50',
              hoverable && 'hover:bg-zinc-50',
            )"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="cn('px-4 py-3', alignClasses[col.align || 'left'])"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </template>
        <tr v-else>
          <td :colspan="columns.length" class="px-4 py-8 text-center text-zinc-400">
            <slot name="empty">No data available</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
