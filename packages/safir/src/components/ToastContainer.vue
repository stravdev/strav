<script setup lang="ts">
import { cn } from '../utils/cn.ts'
import { useToast } from '../composables/useToast.ts'
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/vue/20/solid'

const { toasts, dismiss } = useToast()

const variantClasses: Record<string, string> = {
  default: 'border-zinc-200 bg-white text-zinc-950',
  success: 'border-green-200 bg-green-50 text-green-900',
  destructive: 'border-red-200 bg-red-50 text-red-900',
}

const variantIcons: Record<string, any> = {
  success: CheckCircleIcon,
  destructive: XCircleIcon,
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2" style="max-width: 380px;">
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="cn(
            'relative rounded-lg border px-4 py-3 shadow-lg',
            variantClasses[toast.variant || 'default'],
          )"
        >
          <div class="flex gap-3 pr-6">
            <component
              v-if="variantIcons[toast.variant || '']"
              :is="variantIcons[toast.variant || '']"
              class="mt-0.5 h-4 w-4 shrink-0"
            />
            <div class="min-w-0">
              <p class="text-sm font-medium">{{ toast.title }}</p>
              <p v-if="toast.description" class="mt-0.5 text-xs opacity-80">{{ toast.description }}</p>
            </div>
          </div>
          <button
            class="absolute right-2 top-2 rounded-sm opacity-70 transition-opacity hover:opacity-100"
            @click="dismiss(toast.id)"
          >
            <XMarkIcon class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
