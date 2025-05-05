"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebaseConfig"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PackageOpen, Warehouse } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

// Eliminamos las importaciones de imágenes y usamos rutas directas a la carpeta public
const CATEGORIAS = [
  { id: "rebosados", nombre: "Rebosados", imagen: "/images/inventario/rebosados.JPG" },
  { id: "pollo", nombre: "Pollo", imagen: "/images/inventario/pollo.jpg" },
  { id: "pescado", nombre: "Pescado", imagen: "/images/inventario/pescado.JPG" },
  { id: "mariscos", nombre: "Mariscos", imagen: "/images/inventario/mariscos.jpg" },
  { id: "papas", nombre: "Papas", imagen: "/images/inventario/papas.jpg" },
  { id: "otros productos", nombre: "Otros Productos", imagen: "/images/inventario/otros.jpg" },
]

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

export default function InventarioPage() {
  const [categoriaActiva, setCategoriaActiva] = useState("rebosados")
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stockSettings, setStockSettings] = useState<StockSettings>({
    lowThreshold: 5,
    mediumThreshold: 15,
    highThreshold: 25,
  })

  // Load stock settings from Firebase (igual que en ProductosPage)
  useEffect(() => {
    const loadStockSettings = async () => {
      try {
        const docRef = doc(db, "settings", "stockThresholds")
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setStockSettings(docSnap.data() as StockSettings)
        }
      } catch (error) {
        console.error("Error loading stock settings:", error)
      }
    }
    loadStockSettings()
  }, [])

  // Cargar productos desde Firestore (incluyendo stockThresholds)
  useEffect(() => {
    const obtenerProductos = async () => {
      try {
        setLoading(true)
        const querySnapshot = await getDocs(collection(db, "Productos"))
        const productosObtenidos: Producto[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          const producto = {
            id: data.id || Number.parseInt(doc.id) || 0,
            nombre: data.nombre || "",
            descripcion: data.descripcion || "",
            precio: data.precio || 0,
            cantidad: data.cantidad || 0,
            imagenUrl: data.imagenUrl || "",
            categoria: data.categoria || "otros productos",
            stockThresholds: data.stockThresholds, // Incluimos los umbrales
          } as Producto

          productosObtenidos.push(producto)
        })

        setProductos(productosObtenidos)
        setError(null)
      } catch (err) {
        console.error("Error al obtener productos:", err)
        setError("Error al cargar los productos. Por favor, intenta de nuevo.")
      } finally {
        setLoading(false)
      }
    }

    obtenerProductos()
  }, [])

  // Filtrar productos por categoría y búsqueda
  useEffect(() => {
    let filtrados = productos; // Inicialmente, mostramos todos los productos

    // Filtrar por búsqueda (ahora en todas las categorías)
    if (busqueda) {
      filtrados = filtrados.filter((producto) =>
        producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
      );
    } else {
      // Si no hay búsqueda, filtrar por la categoría activa
      filtrados = filtrados.filter((producto) => producto.categoria === categoriaActiva);
    }

    setProductosFiltrados(filtrados);
  }, [categoriaActiva, productos, busqueda]);

  // Function to get stock level color (copiado de ProductosPage)
  const getStockLevelColor = (cantidad: number, thresholds?: { low: number; medium: number; high: number }) => {
    const low = thresholds?.low || stockSettings.lowThreshold
    const medium = thresholds?.medium || stockSettings.mediumThreshold
    const high = thresholds?.high || stockSettings.highThreshold

    if (cantidad <= low) return "bg-red-100 text-red-700"
    if (cantidad <= medium) return "bg-yellow-100 text-yellow-700"
    if (cantidad > high) return "bg-green-100 text-green-700"
    return "bg-blue-100 text-blue-700"
  }

  // Function to get stock level text (copiado de ProductosPage)
  const getStockLevelText = (cantidad: number, thresholds?: { low: number; medium: number; high: number }) => {
    const low = thresholds?.low || stockSettings.lowThreshold
    const medium = thresholds?.medium || stockSettings.mediumThreshold
    const high = thresholds?.high || stockSettings.highThreshold

    if (cantidad <= low) return "Stock Bajo"
    if (cantidad <= medium) return "Stock Medio"
    if (cantidad > high) return "Stock Alto"
    return "Stock Normal"
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-muted-foreground">Gestiona el stock de productos por categoría</p>
        </div>
      </div>

      {/* Vista de categorías en tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-8">
        {CATEGORIAS.map((categoria) => (
          <Card
            key={categoria.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              categoriaActiva === categoria.id ? "border-primary border-2" : ""
            } h-auto min-h-[220px]`} // Aumentamos un poco la altura mínima
            onClick={() => setCategoriaActiva(categoria.id)}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
              <div className="w-full h-32 relative mb-4 rounded-md overflow-hidden"> {/* Aumentamos la altura de la imagen */}
                <Image
                  src={categoria.imagen || "/placeholder.svg"}
                  alt={categoria.nombre}
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold text-center">{categoria.nombre}</h3>
              <p className="text-sm text-muted-foreground mt-1 text-center">
                {productos.filter((p) => p.categoria === categoria.id).length} productos
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Barra de búsqueda debajo de las tarjetas */}
      <div className="mb-6">
        <Input
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full md:w-64"
        />
      </div>

      {/* Lista de productos por categoría */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center space-x-4 border-b pb-4">
          <Warehouse className="w-6 h-6 text-primary" />
          <CardTitle className="text-xl">
            Inventario de {CATEGORIAS.find((c) => c.id === categoriaActiva)?.nombre || "Productos"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <Alert variant="default" className="bg-gray-50">
              <PackageOpen className="h-4 w-4" />
              <AlertDescription className="ml-2">No hay productos que coincidan con tu búsqueda en esta categoría</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {productosFiltrados.map((producto) => (
                <div
                  key={producto.id}
                  className="flex justify-between items-center p-4 bg-white border rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {producto.imagenUrl ? (
                      <div className="w-16 h-16 relative rounded-md overflow-hidden">
                        <Image
                          src={producto.imagenUrl || "/placeholder.svg"}
                          alt={producto.nombre}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <PackageOpen className="w-10 h-10 text-primary/70" />
                    )}
                    <div>
                      <p className="font-medium text-gray-800">{producto.nombre}</p>
                      <p className="text-gray-600 text-sm">{producto.descripcion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStockLevelColor(
                        producto.cantidad,
                        producto.stockThresholds
                      )}`}
                    >
                      {getStockLevelText(producto.cantidad, producto.stockThresholds)}: {producto.cantidad}
                    </div>
                    <span className="text-sm font-semibold text-primary">${producto.precio}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}