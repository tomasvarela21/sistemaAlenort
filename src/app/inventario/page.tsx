"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebaseConfig"
import { collection, getDocs } from "firebase/firestore"
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
}

export default function InventarioPage() {
  const [categoriaActiva, setCategoriaActiva] = useState("rebosados")
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar productos desde Firestore
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
    let filtrados = productos.filter((producto) => producto.categoria === categoriaActiva)

    if (busqueda) {
      filtrados = filtrados.filter((producto) => producto.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    }

    setProductosFiltrados(filtrados)
  }, [categoriaActiva, productos, busqueda])

  // Función para obtener el color según el nivel de stock
  const getStockColor = (cantidad: number) => {
    if (cantidad <= 5) return "text-red-600 bg-red-100"
    if (cantidad <= 15) return "text-yellow-600 bg-yellow-100"
    return "text-green-600 bg-green-100"
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
        <div>
          <Input
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full md:w-64"
          />
        </div>
      </div>

      {/* Vista de categorías en tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {CATEGORIAS.map((categoria) => (
          <Card
            key={categoria.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              categoriaActiva === categoria.id ? "border-primary border-2" : ""
            }`}
            onClick={() => setCategoriaActiva(categoria.id)}
          >
            <CardContent className="p-4 flex flex-col items-center">
              <div className="w-full h-40 relative mb-4 rounded-md overflow-hidden">
                <Image
                  src={categoria.imagen || "/placeholder.svg"}
                  alt={categoria.nombre}
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold">{categoria.nombre}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {productos.filter((p) => p.categoria === categoria.id).length} productos
              </p>
            </CardContent>
          </Card>
        ))}
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
              <AlertDescription className="ml-2">No hay productos en esta categoría</AlertDescription>
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
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStockColor(producto.cantidad)}`}>
                      {producto.cantidad} unidades
                    </span>
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
