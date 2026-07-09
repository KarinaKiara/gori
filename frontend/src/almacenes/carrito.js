import { defineStore } from 'pinia'

export const useCarritoStore = defineStore('carrito', {
  state: () => ({
    items: []
  }),
  getters: {
    total: (state) => {
      return state.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
    },
    totalItems: (state) => {
      return state.items.reduce((sum, item) => sum + item.cantidad, 0)
    }
  },
  actions: {
    agregarProducto(producto) {
      const existente = this.items.find(i => i.id === producto.id)
      if (existente) {
        existente.cantidad++
      } else {
        this.items.push({ ...producto, cantidad: 1 })
      }
    },
    quitarProducto(id) {
      const index = this.items.findIndex(i => i.id === id)
      if (index !== -1) {
        if (this.items[index].cantidad > 1) {
          this.items[index].cantidad--
        } else {
          this.items.splice(index, 1)
        }
      }
    },
    vaciarCarrito() {
      this.items = []
    }
  }
})
