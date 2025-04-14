"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebaseConfig"
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, increment } from "firebase/firestore"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Edit2, Trash2, Plus, Save } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import Image from "next/image"

interface Producto {
  id: number
  nombre: string
  descripcion: string
  precio: number
  cantidad: number
  imagenUrl: string
  categoria: string
  stockThresholds?: {
    low: number
    medium: number
    high: number
  }
}

interface StockSettings {
  lowThreshold: number
  mediumThreshold: number
  highThreshold: number
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [nombreProducto, setNombreProducto] = useState("")
  const [descripcionProducto, setDescripcionProducto] = useState("")
  const [precioProducto, setPrecioProducto] = useState(0)
  const [cantidadProducto, setCantidadProducto] = useState(1)
  const [imagenUrlProducto, setImagenUrlProducto] = useState("")
  const [categoriaProducto, setCategoriaProducto] = useState("rebosados")
  const [productoEditado, setProductoEditado] = useState<Producto | null>(null)
  const [showAlert, setShowAlert] = useState(false)

  // Configuración de umbrales de stock específicos para el producto en edición
  const [lowThresholdProducto, setLowThresholdProducto] = useState<number>(5)
  const [mediumThresholdProducto, setMediumThresholdProducto] = useState<number>(15)
  const [highThresholdProducto, setHighThresholdProducto] = useState<number>(25)

  const [stockSettings, setStockSettings] = useState<StockSettings>({
    lowThreshold: 5,
    mediumThreshold: 15,
    highThreshold: 25,
  })

  // Load stock settings from Firebase
  useEffect(() => {
    const loadStockSettings = async () => {
      try {
        const docRef = doc(db, "settings", "stockThresholds")
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setStockSettings(docSnap.data() as StockSettings)
        } else {
          // If settings don't exist, create them with default values
          await setDoc(docRef, stockSettings)
        }
      } catch (error) {
        console.error("Error loading stock settings:", error)
      }
    }
    loadStockSettings()
  }, [stockSettings])

  // Load products from Firebase
  useEffect(() => {
    const obtenerProductos = async () => {
      const querySnapshot = await getDocs(collection(db, "Productos"))
      const productosObtenidos: Producto[] = []
      querySnapshot.forEach((doc) => {
        productosObtenidos.push(doc.data() as Producto)
      })
      setProductos(productosObtenidos)
    }

    obtenerProductos()
  }, [])

  // Function to get stock level color
  const getStockLevelColor = (cantidad: number, thresholds?: { low: number; medium: number; high: number }) => {
    const low = thresholds?.low || stockSettings.lowThreshold
    const medium = thresholds?.medium || stockSettings.mediumThreshold
    const high = thresholds?.high || stockSettings.highThreshold

    if (cantidad <= low) return "bg-red-100 text-red-700"
    if (cantidad <= medium) return "bg-yellow-100 text-yellow-700"
    if (cantidad > high) return "bg-green-100 text-green-700"
    return "bg-blue-100 text-blue-700"
  }

  // Function to get stock level text
  const getStockLevelText = (cantidad: number, thresholds?: { low: number; medium: number; high: number }) => {
    const low = thresholds?.low || stockSettings.lowThreshold
    const medium = thresholds?.medium || stockSettings.mediumThreshold
    const high = thresholds?.high || stockSettings.highThreshold

    if (cantidad <= low) return "Stock Bajo"
    if (cantidad <= medium) return "Stock Medio"
    if (cantidad > high) return "Stock Alto"
    return "Stock Normal"
  }

  // Function to get new ID
  const obtenerNuevoId = async () => {
    const docRef = doc(db, "counters", "productosCounters")
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const lastId = docSnap.data().LastId
      await updateDoc(docRef, { LastId: increment(1) })
      return lastId + 1
    } else {
      await setDoc(docRef, { LastId: 1 })
      return 1
    }
  }

  // Function to add new product
  const agregarProducto = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const nuevoId = await obtenerNuevoId()

      const nuevoProducto: Producto = {
        id: nuevoId,
        nombre: nombreProducto || "Sin nombre",
        descripcion: descripcionProducto || "Sin descripción",
        precio: precioProducto || 0,
        cantidad: cantidadProducto || 1,
        imagenUrl: imagenUrlProducto || "",
        categoria: categoriaProducto || "otros productos",
        stockThresholds: {
          low: lowThresholdProducto,
          medium: mediumThresholdProducto,
          high: highThresholdProducto,
        },
      }

      console.log("Nuevo Producto:", nuevoProducto)
      await setDoc(doc(db, "Productos", String(nuevoId)), nuevoProducto)
      console.log("Producto agregado exitosamente")

      setProductos([...productos, nuevoProducto])
      setShowAlert(true)

      // Reset form
      setNombreProducto("")
      setDescripcionProducto("")
      setPrecioProducto(0)
      setCantidadProducto(1)
      setImagenUrlProducto("")
      setLowThresholdProducto(stockSettings.lowThreshold)
      setMediumThresholdProducto(stockSettings.mediumThreshold)
      setHighThresholdProducto(stockSettings.highThreshold)
    } catch (error) {
      console.error("Error al agregar producto:", error)
    }
  }

  // Function to edit product
  const editarProducto = (index: number) => {
    const producto = productos[index]
    setProductoEditado(producto)
    setNombreProducto(producto.nombre)
    setDescripcionProducto(producto.descripcion)
    setPrecioProducto(producto.precio)
    setCantidadProducto(producto.cantidad)
    setImagenUrlProducto(producto.imagenUrl)
    setCategoriaProducto(producto.categoria || "otros productos")

    // Cargar los umbrales de stock específicos del producto o usar los valores predeterminados
    setLowThresholdProducto(producto.stockThresholds?.low || stockSettings.lowThreshold)
    setMediumThresholdProducto(producto.stockThresholds?.medium || stockSettings.mediumThreshold)
    setHighThresholdProducto(producto.stockThresholds?.high || stockSettings.highThreshold)
  }

  // Function to save edited product
  const guardarCambios = async (e: React.FormEvent) => {
    e.preventDefault()

    if (productoEditado) {
      const productoActualizado: Producto = {
        ...productoEditado,
        nombre: nombreProducto,
        descripcion: descripcionProducto,
        precio: precioProducto,
        cantidad: cantidadProducto,
        imagenUrl: imagenUrlProducto,
        categoria: categoriaProducto,
        stockThresholds: {
          low: lowThresholdProducto,
          medium: mediumThresholdProducto,
          high: highThresholdProducto,
        },
      }

      try {
        await updateDoc(doc(db, "Productos", productoEditado.id.toString()), {
          nombre: productoActualizado.nombre,
          descripcion: productoActualizado.descripcion,
          precio: productoActualizado.precio,
          cantidad: productoActualizado.cantidad,
          imagenUrl: productoActualizado.imagenUrl,
          categoria: productoActualizado.categoria,
          stockThresholds: productoActualizado.stockThresholds,
        })

        setProductos(productos.map((producto) => (producto.id === productoEditado.id ? productoActualizado : producto)))

        // Reset form and edit state
        setProductoEditado(null)
        setNombreProducto("")
        setDescripcionProducto("")
        setPrecioProducto(0)
        setCantidadProducto(1)
        setImagenUrlProducto("")
        setCategoriaProducto("rebosados")
        setLowThresholdProducto(stockSettings.lowThreshold)
        setMediumThresholdProducto(stockSettings.mediumThreshold)
        setHighThresholdProducto(stockSettings.highThreshold)
      } catch (error) {
        console.error("Error al actualizar producto:", error)
      }
    }
  }

  // Function to delete product
  const eliminarProducto = async (index: number) => {
    const producto = productos[index]
    try {
      await deleteDoc(doc(db, "Productos", producto.id.toString()))
      setProductos(productos.filter((p) => p.id !== producto.id))
    } catch (error) {
      console.error("Error al eliminar producto:", error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Gestión de Productos</h1>
      </div>

      {/* Product Form */}
      <Card className="border-2 border-gray-100">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center space-x-2">
            {productoEditado ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            <h2 className="text-2xl font-semibold">{productoEditado ? "Editar Producto" : "Agregar Producto"}</h2>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={productoEditado ? guardarCambios : agregarProducto} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nombreProducto">Nombre del Producto</Label>
                <Input
                  id="nombreProducto"
                  value={nombreProducto}
                  onChange={(e) => setNombreProducto(e.target.value)}
                  required
                  className="focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcionProducto">Descripción</Label>
                <Input
                  id="descripcionProducto"
                  value={descripcionProducto}
                  onChange={(e) => setDescripcionProducto(e.target.value)}
                  required
                  className="focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precioProducto">Precio ($)</Label>
                <Input
                  id="precioProducto"
                  type="number"
                  value={precioProducto}
                  onChange={(e) => setPrecioProducto(Number(e.target.value))}
                  required
                  className="focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cantidadProducto">Cantidad</Label>
                <Input
                  id="cantidadProducto"
                  type="number"
                  value={cantidadProducto}
                  onChange={(e) => setCantidadProducto(Number(e.target.value))}
                  required
                  min={1}
                  className="focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoriaProducto">Categoría</Label>
                <Select value={categoriaProducto} onValueChange={setCategoriaProducto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rebosados">Rebosados</SelectItem>
                    <SelectItem value="pollo">Pollo</SelectItem>
                    <SelectItem value="pescado">Pescado</SelectItem>
                    <SelectItem value="mariscos">Mariscos</SelectItem>
                    <SelectItem value="papas">Papas</SelectItem>
                    <SelectItem value="otros productos">Otros Productos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imagenUrlProducto">URL de Imagen</Label>
                <Input
                  id="imagenUrlProducto"
                  value={imagenUrlProducto}
                  onChange={(e) => setImagenUrlProducto(e.target.value)}
                  className="focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Configuración de umbrales de stock específicos para este producto */}
            <div className="border p-4 rounded-lg bg-gray-50">
              <h3 className="font-medium mb-3">Configuración de Niveles de Stock para este Producto</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configura niveles de stock específicos para este producto según su temporada de ventas.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lowThresholdProducto">Nivel Bajo</Label>
                  <Input
                    id="lowThresholdProducto"
                    type="number"
                    value={lowThresholdProducto}
                    onChange={(e) => setLowThresholdProducto(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mediumThresholdProducto">Nivel Medio</Label>
                  <Input
                    id="mediumThresholdProducto"
                    type="number"
                    value={mediumThresholdProducto}
                    onChange={(e) => setMediumThresholdProducto(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="highThresholdProducto">Nivel Alto</Label>
                  <Input
                    id="highThresholdProducto"
                    type="number"
                    value={highThresholdProducto}
                    onChange={(e) => setHighThresholdProducto(Number(e.target.value))}
                    min={1}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 text-base">
              {productoEditado ? (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Agregar Producto
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Lista de Productos</h2>
          <div className="h-1 flex-1 mx-4 bg-gradient-to-r from-primary/20 to-transparent" />
        </div>

        {productos.length > 0 ? (
          <div className="grid gap-6">
            {productos.map((producto, index) => (
              <div
                key={producto.id}
                className="group relative bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold text-gray-900">{producto.nombre}</h3>
                      <p className="text-gray-600">{producto.descripcion}</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-medium">
                        ${producto.precio}
                      </div>
                      <div
                        className={`px-3 py-1 rounded-lg font-medium ${getStockLevelColor(producto.cantidad, producto.stockThresholds)}`}
                      >
                        {getStockLevelText(producto.cantidad, producto.stockThresholds)}: {producto.cantidad}
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 font-medium">
                        {producto.categoria
                          ? producto.categoria.charAt(0).toUpperCase() + producto.categoria.slice(1)
                          : "Sin categoría"}
                      </div>
                    </div>

                    {/* Mostrar los umbrales de stock específicos si existen */}
                    {producto.stockThresholds && (
                      <div className="text-xs text-gray-500">
                        Umbrales de stock: Bajo ≤ {producto.stockThresholds.low}, Medio ≤{" "}
                        {producto.stockThresholds.medium}, Alto &gt; {producto.stockThresholds.high}
                      </div>
                    )}
                  </div>

                  {producto.imagenUrl && (
                    <div className="relative flex-shrink-0">
                      <Image
                        src={producto.imagenUrl || "/placeholder.svg"}
                        alt={producto.nombre}
                        width={128}
                        height={128}
                        className="object-cover rounded-lg shadow-sm"
                        unoptimized={true}
                      />
                    </div>
                  )}

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => editarProducto(index)} className="gap-1">
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => eliminarProducto(index)} className="gap-1">
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-black-50 rounded-xl border-2 border-dashed">
            <p className="text-black text-lg">No hay productos disponibles.</p>
          </div>
        )}
      </div>

      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent className="bg-yellow-600">
          <AlertDialogHeader>
            <AlertDialogTitle>¡Producto Agregado!</AlertDialogTitle>
            <AlertDialogDescription>El producto ha sido agregado correctamente al inventario.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end">
            <AlertDialogCancel onClick={() => setShowAlert(false)}>Cerrar</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
