import { ref, type Ref } from 'vue'

export interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'destructive'
  duration?: number
}

export interface ToastItem extends ToastOptions {
  id: number
}

const toasts: Ref<ToastItem[]> = ref([])
let nextId = 0

export function useToast() {
  function toast(options: ToastOptions) {
    const id = nextId++
    const duration = options.duration ?? 5000
    const item: ToastItem = { ...options, id }

    toasts.value.push(item)

    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }

    return id
  }

  function dismiss(id: number) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  return { toasts, toast, dismiss }
}
