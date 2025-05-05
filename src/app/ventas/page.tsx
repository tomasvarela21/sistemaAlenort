"use client"

import React from "react"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebaseConfig"
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  getDoc,
  increment,
  setDoc,
  onSnapshot,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import {
  ShoppingCart,
  Users,
  Package,
  DollarSign,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Venta {
  id: number
  cliente: string
  producto: string
  cantidad: number
  vendedor: string
  fecha: string
  precio: number
  total: number
  direccionCliente?: string
  estado?: string
  transaccionId?: number
  fechaEntrega?: string
  horarioEntrega?: string
  repartidor?: string
}

interface Cliente {
  id: number
  nombreCliente: string
  emailCliente?: string
  telefonoCliente?: string
  direccionCliente: string
}

interface Vendedor {
  Nombre: string
}

interface Producto {
  nombre: string
  precio: number
  cantidad: number
}

interface Pedido {
  id: number
  cliente: string
  producto: string
  cantidad: number
  fechaEntrega: string
  direccionCliente: string
  estado: string
  fechaCreacion: string
  horarioEntrega?: string
  repartidor?: string
  transaccionId?: number
}

interface CartItem {
  producto: string
  cantidad: number
  precio: number
  total: number
}

interface VentaAgrupada {
  transaccionId: number
  cliente: string
  vendedor: string
  fecha: string
  total: number
  productos: Venta[]
  direccionCliente?: string
  estado?: string
  fechaEntrega?: string
  horarioEntrega?: string
  repartidor?: string
}

const ESTADOS = {
  PENDIENTE_PROGRAMACION: "pendiente_programacion",
  PROGRAMADA: "programada",
  EN_REPARTO: "en_reparto",
  COMPLETADA: "completada",
} as const

export default function VentasPage() {
  // Modificamos estas líneas para evitar los errores de ESLint

  const [ventas, setVentas] = useState<Venta[]>([])
  const [ventasAgrupadas, setVentasAgrupadas] = useState<VentaAgrupada[]>([])
  const [cliente, setCliente] = useState<string>("")
  const [producto, setProducto] = useState<string>("")
  const [cantidad, setCantidad] = useState<number | "">(1)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [vendedor, setVendedor] = useState<string>("")
  const [fecha, setFecha] = useState<string>(new Date().toLocaleDateString())
  const [precioProducto, setPrecioProducto] = useState<number>(0)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [pedidosCliente, setPedidosCliente] = useState<Pedido[]>([])
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null)
  const [mostrarPedidos, setMostrarPedidos] = useState<boolean>(false)
  const [direccionCliente, setDireccionCliente] = useState<string>("")
  const [expandedTransactions, setExpandedTransactions] = useState<number[]>([])

  // Estados para los buscadores
  const [clienteSearch, setClienteSearch] = useState("")
  const [productoSearch, setProductoSearch] = useState("")
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([])
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([])

  // Carrito de compras
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [totalCarrito, setTotalCarrito] = useState<number>(0)

  // Obtener ventas desde la base de datos
  useEffect(() => {
    const obtenerVentas = async () => {
      try {
        // Configurar listener en tiempo real
        const unsubscribe = onSnapshot(collection(db, "Ventas"), (querySnapshot) => {
          const ventasObtenidas: Venta[] = querySnapshot.docs.map((doc) => doc.data() as Venta)
          setVentas(ventasObtenidas)

          // Agrupar ventas por transaccionId
          const ventasPorTransaccion = new Map<number, Venta[]>()

          ventasObtenidas.forEach((venta) => {
            const transaccionId = venta.transaccionId || venta.id
            if (!ventasPorTransaccion.has(transaccionId)) {
              ventasPorTransaccion.set(transaccionId, [])
            }
            ventasPorTransaccion.get(transaccionId)?.push(venta)
          })

          // Crear array de ventas agrupadas
          const agrupadas: VentaAgrupada[] = []

          ventasPorTransaccion.forEach((productos, transaccionId) => {
            if (productos.length > 0) {
              // Verificar si algún producto de la transacción está marcado como entregado
              const entregado = productos.some((p) => p.estado === "entregada")

              const primerProducto = productos[0]
              const totalTransaccion = productos.reduce((sum, venta) => sum + venta.total, 0)

              // Si algún producto está entregado, marcar toda la transacción como completada
              const estadoTransaccion = entregado ? "completada" : primerProducto.estado

              agrupadas.push({
                transaccionId,
                cliente: primerProducto.cliente,
                vendedor: primerProducto.vendedor,
                fecha: primerProducto.fecha,
                total: totalTransaccion,
                productos,
                direccionCliente: primerProducto.direccionCliente,
                estado: estadoTransaccion,
                fechaEntrega: primerProducto.fechaEntrega,
                horarioEntrega: primerProducto.horarioEntrega,
                repartidor: primerProducto.repartidor,
              })
            }
          })

          // Ordenar por ID de transacción (más reciente primero)
          agrupadas.sort((a, b) => b.transaccionId - a.transaccionId)
          setVentasAgrupadas(agrupadas)
        })

        return () => unsubscribe()
      } catch (error) {
        console.error("Error al obtener las ventas: ", error)
      }
    }

    obtenerVentas()
  }, [])

  // Resto del código permanece igual...

  // Obtener clientes desde la base de datos
  useEffect(() => {
    const obtenerClientes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Clientes"))
        const clientesObtenidos: Cliente[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          // Asegurarse de que el cliente tenga todos los campos necesarios
          clientesObtenidos.push({
            id: data.id || Number.parseInt(doc.id),
            nombreCliente: data.nombreCliente || "",
            emailCliente: data.emailCliente || "",
            telefonoCliente: data.telefonoCliente || "",
            direccionCliente: data.direccionCliente || "",
          })
        })

        console.log("Clientes obtenidos:", clientesObtenidos)
        setClientes(clientesObtenidos)
        setClientesFiltrados(clientesObtenidos)
      } catch (error) {
        console.error("Error al obtener los clientes: ", error)
      }
    }

    obtenerClientes()
  }, [])

  // Obtener productos y precios de la base de datos
  useEffect(() => {
    const obtenerProductos = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Productos"))
        const productos: Producto[] = querySnapshot.docs.map((doc) => ({
          nombre: doc.data().nombre,
          precio: doc.data().precio,
          cantidad: doc.data().cantidad,
        }))
        setProductosDisponibles(productos)
        setProductosFiltrados(productos)
      } catch (error) {
        console.error("Error al obtener los productos: ", error)
      }
    }

    obtenerProductos()
  }, [])

  // Obtener vendedores desde la base de datos
  useEffect(() => {
    const obtenerVendedores = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Vendedores"))
        const vendedoresObtenidos: Vendedor[] = querySnapshot.docs.map((doc) => doc.data() as Vendedor)
        setVendedores(vendedoresObtenidos)
      } catch (error) {
        console.error("Error al obtener los vendedores: ", error)
      }
    }

    obtenerVendedores()
  }, [])

  // Obtener pedidos desde la base de datos
  useEffect(() => {
    const obtenerPedidos = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Pedidos"))
        const pedidosObtenidos: Pedido[] = querySnapshot.docs.map((doc) => doc.data() as Pedido)
        setPedidos(pedidosObtenidos)
      } catch (error) {
        console.error("Error al obtener los pedidos: ", error)
      }
    }

    obtenerPedidos()
  }, [])

  // Actualizar el precio del producto al seleccionar uno
  const actualizarPrecioProducto = (productoSeleccionado: string) => {
    const productoEncontrado = productosDisponibles.find((prod) => prod.nombre === productoSeleccionado)
    if (productoEncontrado) {
      setPrecioProducto(productoEncontrado.precio)
    }
  }

  // Filtrar pedidos por cliente
  useEffect(() => {
    if (cliente) {
      const pedidosFiltrados = pedidos.filter((pedido) => pedido.cliente === cliente && pedido.estado === "pendiente")
      setPedidosCliente(pedidosFiltrados)
      setMostrarPedidos(pedidosFiltrados.length > 0)

      // Actualizar la dirección del cliente
      const clienteSeleccionado = clientes.find((c) => c.nombreCliente === cliente)
      if (clienteSeleccionado) {
        setDireccionCliente(clienteSeleccionado.direccionCliente)
      }
    } else {
      setPedidosCliente([])
      setMostrarPedidos(false)
      setDireccionCliente("")
    }
  }, [cliente, pedidos, clientes])

  // Manejar la selección de un pedido
  const seleccionarPedido = (pedido: Pedido) => {
    setPedidoSeleccionado(pedido)
    setProducto(pedido.producto)
    setCantidad(pedido.cantidad)
    actualizarPrecioProducto(pedido.producto)
  }

  // Calcular el total del carrito
  useEffect(() => {
    const total = cartItems.reduce((sum, item) => sum + item.total, 0)
    setTotalCarrito(total)
  }, [cartItems])

  // Agregar producto al carrito
  const agregarAlCarrito = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!producto || !cantidad || Number(cantidad) <= 0 || !precioProducto) {
      alert("Por favor seleccione un producto y una cantidad válida")
      return
    }

    // Verificar stock disponible
    const productoEncontrado = productosDisponibles.find((prod) => prod.nombre === producto)
    if (!productoEncontrado || productoEncontrado.cantidad < Number(cantidad)) {
      alert(`No hay suficiente stock. Stock disponible: ${productoEncontrado?.cantidad || 0}`)
      return
    }

    // Calcular el total
    const total = precioProducto * Number(cantidad)

    // Verificar si el producto ya está en el carrito
    const itemExistente = cartItems.findIndex((item) => item.producto === producto)

    if (itemExistente !== -1) {
      // Actualizar cantidad si ya existe
      const nuevaCantidad = cartItems[itemExistente].cantidad + Number(cantidad)

      // Verificar que la nueva cantidad no exceda el stock
      if (nuevaCantidad > productoEncontrado.cantidad) {
        alert(`No hay suficiente stock. Stock disponible: ${productoEncontrado.cantidad}`)
        return
      }

      const nuevoTotal = precioProducto * nuevaCantidad

      const nuevosItems = [...cartItems]
      nuevosItems[itemExistente] = {
        ...nuevosItems[itemExistente],
        cantidad: nuevaCantidad,
        total: nuevoTotal,
      }

      setCartItems(nuevosItems)
    } else {
      // Agregar nuevo item al carrito
      const nuevoItem: CartItem = {
        producto,
        cantidad: Number(cantidad),
        precio: precioProducto,
        total,
      }

      setCartItems([...cartItems, nuevoItem])
    }

    // Limpiar el formulario
    setProducto("")
    setProductoSearch("")
    setCantidad(1) // Reiniciar a 1 en lugar de 0
    setPrecioProducto(0)
  }

  // Eliminar producto del carrito
  const eliminarDelCarrito = (index: number) => {
    const nuevosItems = cartItems.filter((_, i) => i !== index)
    setCartItems(nuevosItems)
  }

  // Actualizar cantidad de un producto en el carrito
  const actualizarCantidadCarrito = (index: number, nuevaCantidad: number | "") => {
    const item = cartItems[index]
    const productoEncontrado = productosDisponibles.find((prod) => prod.nombre === item.producto)

    if (!productoEncontrado) return

    // Si es string vacío, permitir temporalmente
    if (nuevaCantidad === "") {
      const nuevosItems = [...cartItems]
      nuevosItems[index] = {
        ...item,
        cantidad: 0, // Temporalmente 0 para la interfaz
        total: 0,
      }
      setCartItems(nuevosItems)
      return
    }

    // Verificar que la cantidad no sea menor a 1 ni mayor al stock disponible
    let cantidadFinal = nuevaCantidad
    if (nuevaCantidad < 1) {
      cantidadFinal = 1
    } else if (nuevaCantidad > productoEncontrado.cantidad) {
      cantidadFinal = productoEncontrado.cantidad
      alert(`No hay suficiente stock. Stock disponible: ${productoEncontrado.cantidad}`)
    }

    const nuevoTotal = item.precio * cantidadFinal

    const nuevosItems = [...cartItems]
    nuevosItems[index] = {
      ...item,
      cantidad: cantidadFinal,
      total: nuevoTotal,
    }

    setCartItems(nuevosItems)
  }

  // Obtener un nuevo ID para la venta
  const obtenerNuevoId = async () => {
    const docRef = doc(db, "counters", "ventasCounters")
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const lastId = docSnap.data().LastId

      // Actualizar el LastId para el siguiente uso
      await updateDoc(docRef, {
        LastId: increment(1),
      })

      return lastId + 1 // Devuelve el nuevo ID incrementado
    } else {
      // Si no existe el contador, lo creamos
      await setDoc(docRef, { LastId: 1 })
      return 1
    }
  }

  // Confirmar compra
  const confirmarCompra = async () => {
    if (!cliente || !vendedor || cartItems.length === 0) {
      alert("Por favor seleccione un cliente, un vendedor y agregue productos al carrito")
      return
    }

    try {
      // Obtener un ID de transacción único para agrupar todos los productos de esta venta
      const transaccionId = await obtenerNuevoId()

      // Registrar cada venta del carrito
      for (const item of cartItems) {
        // Obtener la referencia actual del producto
        const productosRef = collection(db, "Productos")
        const q = query(productosRef, where("nombre", "==", item.producto))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          alert(`Producto ${item.producto} no encontrado`)
          return
        }

        const productoDoc = querySnapshot.docs[0]
        const productoActual = productoDoc.data() as Producto

        // Verificar si hay suficiente stock
        if (productoActual.cantidad < item.cantidad) {
          alert(`No hay suficiente stock de ${item.producto}. Stock disponible: ${productoActual.cantidad}`)
          return
        }

        // Obtener un nuevo ID para la venta
        const nuevoId = await obtenerNuevoId()

        // Crear el objeto de venta
        const nuevaVenta: Venta = {
          id: nuevoId,
          transaccionId: transaccionId, // Agregar el ID de transacción para agrupar
          cliente,
          producto: item.producto,
          cantidad: item.cantidad,
          vendedor,
          fecha,
          precio: item.precio,
          total: item.total,
          direccionCliente,
          estado: "pendiente_programacion", // Nuevo estado para indicar que falta programar la entrega
        }

        // Registrar la venta
        await setDoc(doc(db, "Ventas", nuevoId.toString()), nuevaVenta)

        // Actualizar el stock del producto
        const nuevaCantidad = productoActual.cantidad - item.cantidad
        await updateDoc(productoDoc.ref, {
          cantidad: nuevaCantidad,
        })

        // Actualizar el inventario también
        try {
          const inventarioRef = collection(db, "Inventario")
          const qInventario = query(inventarioRef, where("producto", "==", item.producto))
          const inventarioSnapshot = await getDocs(qInventario)

          if (!inventarioSnapshot.empty) {
            const inventarioDoc = inventarioSnapshot.docs[0]
            const inventarioActual = inventarioDoc.data()

            await updateDoc(inventarioDoc.ref, {
              cantidad: (inventarioActual.cantidad || 0) - item.cantidad,
            })
          }
        } catch (error) {
          console.error("Error al actualizar el inventario: ", error)
        }

        // Actualizar el estado local de ventas
        setVentas((prevVentas) => [...prevVentas, nuevaVenta])

        // Actualizar el estado local de productos disponibles
        setProductosDisponibles(
          productosDisponibles.map((prod) =>
            prod.nombre === item.producto ? { ...prod, cantidad: nuevaCantidad } : prod,
          ),
        )
      }

      // Actualizar las ventas agrupadas
      const nuevaVentaAgrupada: VentaAgrupada = {
        transaccionId,
        cliente,
        vendedor,
        fecha,
        total: totalCarrito,
        productos: cartItems.map((item, index) => ({
          id: transaccionId + index,
          transaccionId,
          cliente,
          producto: item.producto,
          cantidad: item.cantidad,
          vendedor,
          fecha,
          precio: item.precio,
          total: item.total,
          direccionCliente,
          estado: "pendiente_programacion",
        })),
        direccionCliente,
        estado: "pendiente_programacion",
      }

      setVentasAgrupadas((prevVentas) => [nuevaVentaAgrupada, ...prevVentas])

      // Si se seleccionó un pedido, actualizar su estado a "completado"
      if (pedidoSeleccionado) {
        await updateDoc(doc(db, "Pedidos", pedidoSeleccionado.id.toString()), {
          estado: "completado",
        })

        // Actualizar el estado local de pedidos
        setPedidos(pedidos.map((p) => (p.id === pedidoSeleccionado.id ? { ...p, estado: "completado" } : p)))
        setPedidosCliente(pedidosCliente.filter((p) => p.id !== pedidoSeleccionado.id))
      }

      // Limpiar el carrito y el formulario
      setCartItems([])
      setCliente("")
      setClienteSearch("")
      setVendedor("")
      setPedidoSeleccionado(null)
      setMostrarPedidos(false)

      alert("Compra registrada con éxito")
    } catch (error) {
      console.error("Error al registrar la compra: ", error)
      alert("Error al registrar la compra")
    }
  }

  // Manejar la expansión/colapso de una transacción
  const toggleTransactionExpand = (transaccionId: number) => {
    setExpandedTransactions((prev) =>
      prev.includes(transaccionId) ? prev.filter((id) => id !== transaccionId) : [...prev, transaccionId],
    )
  }

  // Generar PDF de una venta
  const generarPDFVenta = async (venta: VentaAgrupada) => {
    try {
      // Crear un nuevo documento PDF
      const pdfDoc = await PDFDocument.create()
      let page = pdfDoc.addPage([595.276, 841.89]) // Tamaño A4

      // Configuración de fuentes
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      // Configuración inicial
      const fontSize = 10
      const fontSizeSmall = 8
      const fontSizeLarge = 14
      const margin = 50
      let y = page.getHeight() - margin

      // Logo (puedes reemplazar con tu logo en base64)
      // const logoImage = await pdfDoc.embedPng(logoBase64)
      // page.drawImage(logoImage, { x: margin, y: y - 50, width: 100, height: 50 })

      // Título del comprobante
      page.drawText("COMPROBANTE DE VENTA", {
        x: margin,
        y,
        size: fontSizeLarge,
        font: boldFont,
        color: rgb(0, 0, 0),
      })
      y -= 30

      // Información de la empresa
      page.drawText("Empresa: Alenort", { x: margin, y, size: fontSize, font })
      y -= 15
      page.drawText("Dirección: Av Juan B. Justo 1111, San Miguel de Tucumán", { x: margin, y, size: fontSize, font })
      y -= 15
      page.drawText("Teléfono: 381 234-1252", { x: margin, y, size: fontSize, font })
      y -= 15

      // Línea divisoria
      page.drawLine({
        start: { x: margin, y },
        end: { x: page.getWidth() - margin, y },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      y -= 20

      // Información del comprobante
      page.drawText(`N° Comprobante: ${venta.transaccionId}`, { x: margin, y, size: fontSize, font: boldFont })
      page.drawText(`Fecha: ${venta.fecha}`, { x: 300, y, size: fontSize, font: boldFont })
      y -= 20

      // Información del cliente
      page.drawText("Cliente:", { x: margin, y, size: fontSize, font: boldFont })
      y -= 15
      page.drawText(`Nombre: ${venta.cliente}`, { x: margin + 20, y, size: fontSize, font })
      y -= 15
      page.drawText(`Dirección: ${venta.direccionCliente || "No especificada"}`, {
        x: margin + 20,
        y,
        size: fontSize,
        font,
      })
      y -= 20

      // Información del vendedor
      page.drawText(`Vendedor: ${venta.vendedor}`, { x: margin, y, size: fontSize, font: boldFont })
      y -= 30

      // Tabla de productos
      // Encabezado de la tabla
      page.drawText("Producto", { x: margin, y, size: fontSize, font: boldFont })
      page.drawText("Cantidad", { x: margin + 250, y, size: fontSize, font: boldFont })
      page.drawText("Precio Unit.", { x: margin + 350, y, size: fontSize, font: boldFont })
      page.drawText("Total", { x: margin + 450, y, size: fontSize, font: boldFont })
      y -= 20

      // Línea divisoria
      page.drawLine({
        start: { x: margin, y },
        end: { x: page.getWidth() - margin, y },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      })
      y -= 15

      // Productos
      venta.productos.forEach((producto) => {
        if (y < 100) {
          // Si nos quedamos sin espacio, agregamos nueva página
          const newPage = pdfDoc.addPage([595.276, 841.89])
          page = newPage
          y = page.getHeight() - margin
        }

        page.drawText(producto.producto, { x: margin, y, size: fontSize, font })
        page.drawText(producto.cantidad.toString(), { x: margin + 250, y, size: fontSize, font })
        page.drawText(`$${producto.precio.toFixed(2)}`, { x: margin + 350, y, size: fontSize, font })
        page.drawText(`$${producto.total.toFixed(2)}`, { x: margin + 450, y, size: fontSize, font })
        y -= 15
      })

      // Línea divisoria final
      y -= 10
      page.drawLine({
        start: { x: margin, y },
        end: { x: page.getWidth() - margin, y },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      })
      y -= 20

      // Totales
      page.drawText("Total:", { x: margin + 350, y, size: fontSize, font: boldFont })
      page.drawText(`$${venta.total.toFixed(2)}`, { x: margin + 450, y, size: fontSize, font: boldFont })
      y -= 30

      // Estado
      page.drawText(`Estado: ${venta.estado === "completada" ? "COMPLETADA" : "PENDIENTE"}`, {
        x: margin,
        y,
        size: fontSize,
        font: boldFont,
        color: venta.estado === "completada" ? rgb(0, 0.5, 0) : rgb(0.8, 0.5, 0),
      })
      y -= 30

      // Pie de página
      page.drawText("Gracias por su compra!", {
        x: margin,
        y,
        size: fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      })
      y -= 15
      page.drawText("Este comprobante no es válido como factura", {
        x: margin,
        y,
        size: fontSizeSmall,
        font,
        color: rgb(0.5, 0.5, 0.5),
      })

      // Guardar y descargar
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Comprobante_Venta_${venta.transaccionId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error al generar el PDF:", error)
      alert("Error al generar el comprobante en PDF")
    }
  }

  // Filtrar clientes según la búsqueda
  useEffect(() => {
    const filtrados = clientes.filter((c) => c.nombreCliente.toLowerCase().includes(clienteSearch.toLowerCase()))
    setClientesFiltrados(filtrados)
  }, [clienteSearch, clientes])

  // Filtrar productos según la búsqueda
  useEffect(() => {
    const filtrados = productosDisponibles.filter((p) => p.nombre.toLowerCase().includes(productoSearch.toLowerCase()))
    setProductosFiltrados(filtrados)
  }, [productoSearch, productosDisponibles])

  // Manejar selección de cliente
  const handleClienteSelect = (nombreCliente: string) => {
    setCliente(nombreCliente)
    setClienteSearch("")
  }

  // Manejar selección de producto
  const handleProductoSelect = (nombreProducto: string) => {
    setProducto(nombreProducto)
    actualizarPrecioProducto(nombreProducto)
    setProductoSearch("")
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card className="bg-blue-50">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-blue-500 p-3 mr-4">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Ventas</p>
              <h3 className="text-2xl font-bold">{ventasAgrupadas.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-green-500 p-3 mr-4">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Ventas del Día</p>
              <h3 className="text-2xl font-bold">
                $
                {ventasAgrupadas
                  .filter((v) => v.fecha === new Date().toLocaleDateString())
                  .reduce((acc, v) => acc + v.total, 0)
                  .toLocaleString()}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-purple-500 p-3 mr-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Clientes</p>
              <h3 className="text-2xl font-bold">{clientes.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-orange-500 p-3 mr-4">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Productos</p>
              <h3 className="text-2xl font-bold">{productosDisponibles.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              Nueva Venta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={agregarAlCarrito} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cliente" className="text-sm font-medium">
                  Cliente
                </Label>
                <div className="relative">
                  <Input
                    id="clienteSearch"
                    placeholder="Buscar cliente..."
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className="w-full"
                  />
                  {clienteSearch && clientesFiltrados.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {clientesFiltrados.map((c) => (
                        <div
                          key={c.id}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleClienteSelect(c.nombreCliente)}
                        >
                          {c.nombreCliente}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {cliente && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md">
                    <p className="text-sm">
                      Cliente seleccionado: <strong>{cliente}</strong>
                    </p>
                  </div>
                )}
              </div>

              {mostrarPedidos && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Pedidos Pendientes</Label>
                  <div className="rounded-lg border p-4 space-y-4">
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        Este cliente tiene pedidos pendientes. Seleccione uno para completar la venta.
                      </AlertDescription>
                    </Alert>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {pedidosCliente.map((pedido) => (
                        <div
                          key={pedido.id}
                          className={`p-3 rounded-md border cursor-pointer transition-colors ${
                            pedidoSeleccionado?.id === pedido.id ? "bg-primary/10 border-primary" : "hover:bg-muted"
                          }`}
                          onClick={() => seleccionarPedido(pedido)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{pedido.producto}</p>
                              <p className="text-sm text-muted-foreground">Cantidad: {pedido.cantidad}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                Entrega:{" "}
                                {new Date(pedido.fechaEntrega).toLocaleDateString("es-ES", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  timeZone: "UTC",
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">ID: {pedido.id}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="producto" className="text-sm font-medium">
                  Producto
                </Label>
                <div className="relative">
                  <Input
                    id="productoSearch"
                    placeholder="Buscar producto..."
                    value={productoSearch}
                    onChange={(e) => setProductoSearch(e.target.value)}
                    className="w-full"
                  />
                  {productoSearch && productosFiltrados.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {productosFiltrados.map((p, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleProductoSelect(p.nombre)}
                        >
                          <span>{p.nombre}</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            ${p.precio} (Stock: {p.cantidad})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {producto && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md">
                    <p className="text-sm">
                      Producto seleccionado: <strong>{producto}</strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cantidad" className="text-sm font-medium">
                    Cantidad
                  </Label>
                  <Input
                    type="number"
                    id="cantidad"
                    value={cantidad}
                    onChange={(e) => {
                      const value = e.target.value
                      setCantidad(value === "" ? "" : Number(value))
                    }}
                    min={1}
                    max={producto && productosDisponibles.find((prod) => prod.nombre === producto)?.cantidad}
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precio" className="text-sm font-medium">
                    Precio Unitario
                  </Label>
                  <Input type="number" id="precio" value={precioProducto} disabled className="w-full bg-gray-50" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendedor" className="text-sm font-medium">
                  Vendedor
                </Label>
                <Select onValueChange={(value) => setVendedor(value)} value={vendedor} required>
                  <SelectTrigger id="vendedor" className="w-full">
                    <SelectValue placeholder="Seleccionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map((vendedor, index) => (
                      <SelectItem key={index} value={vendedor.Nombre}>
                        {vendedor.Nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha" className="text-sm font-medium">
                  Fecha
                </Label>
                <Input type="text" id="fecha" value={fecha} disabled className="w-full bg-gray-50" />
              </div>

              {pedidoSeleccionado && (
                <div className="p-3 rounded-md bg-green-50 border border-green-200">
                  <p className="text-sm text-green-800 font-medium">Completando pedido #{pedidoSeleccionado.id}</p>
                </div>
              )}

              <CardFooter className="px-0 pt-6">
                <Button type="submit" className="w-full">
                  Agregar al Carrito
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              Carrito de Compras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              {cartItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cartItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.producto}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => {
                                const value = e.target.value
                                actualizarCantidadCarrito(index, value === "" ? "" : Number(value))
                              }}
                              min={1}
                              max={productosDisponibles.find((prod) => prod.nombre === item.producto)?.cantidad || 999}
                              className="w-20 text-center"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">${item.precio}</TableCell>
                        <TableCell className="text-right">${item.total}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => eliminarDelCarrito(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">
                        Total:
                      </TableCell>
                      <TableCell className="text-right font-bold">${totalCarrito}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>El carrito está vacío</p>
                  <p className="text-sm">Agregue productos para realizar una venta</p>
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <Button className="w-full mt-4" onClick={confirmarCompra} disabled={!cliente || !vendedor}>
                Confirmar Compra
              </Button>
            )}

            {(!cliente || !vendedor) && cartItems.length > 0 && (
              <Alert className="mt-4 bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Seleccione un cliente y un vendedor para confirmar la compra
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Historial de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventasAgrupadas.map((venta) => (
                  <React.Fragment key={venta.transaccionId}>
                    <TableRow>
                      <TableCell>{venta.transaccionId}</TableCell>
                      <TableCell className="font-medium">{venta.cliente}</TableCell>
                      <TableCell>{venta.vendedor}</TableCell>
                      <TableCell>{venta.fecha}</TableCell>
                      <TableCell className="text-right">${venta.total}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            venta.estado === ESTADOS.COMPLETADA
                              ? "bg-green-100 text-green-800"
                              : venta.estado === ESTADOS.PENDIENTE_PROGRAMACION
                                ? "bg-amber-100 text-amber-800"
                                : venta.estado === ESTADOS.PROGRAMADA
                                  ? "bg-blue-100 text-blue-800"
                                  : venta.estado === ESTADOS.EN_REPARTO
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {venta.estado === ESTADOS.COMPLETADA
                            ? "Completada"
                            : venta.estado === ESTADOS.PENDIENTE_PROGRAMACION
                              ? "Pendiente de programación"
                              : venta.estado === ESTADOS.PROGRAMADA
                                ? "Programada"
                                : venta.estado === ESTADOS.EN_REPARTO
                                  ? "En reparto"
                                  : "Pendiente"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleTransactionExpand(venta.transaccionId)}
                          >
                            {expandedTransactions.includes(venta.transaccionId) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => generarPDFVenta(venta)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedTransactions.includes(venta.transaccionId) && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={7} className="p-0">
                          <div className="p-2">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead>Producto</TableHead>
                                  <TableHead className="text-center">Cantidad</TableHead>
                                  <TableHead className="text-right">Precio</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {venta.productos.map((producto, idx) => (
                                  <TableRow key={idx} className="border-b-0 hover:bg-transparent">
                                    <TableCell>{producto.producto}</TableCell>
                                    <TableCell className="text-center">{producto.cantidad}</TableCell>
                                    <TableCell className="text-right">${producto.precio}</TableCell>
                                    <TableCell className="text-right">${producto.total}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
