"use client"

import React, { useState, useEffect } from "react"
import { db } from "@/lib/firebaseConfig"
import { collection, getDocs, updateDoc, doc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Truck, Calendar, Package, ChevronDown, ChevronUp, Search, CheckCircle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

interface Repartidor {
  id?: string
  Nombre: string
  disponible: boolean
}

export default function RepartosPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [ventasAgrupadas, setVentasAgrupadas] = useState<VentaAgrupada[]>([])
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaAgrupada | null>(null)
  const [repartidores, setRepartidores] = useState<Repartidor[]>([])
  const [repartidor, setRepartidor] = useState<string>("")
  const [expandedTransactions, setExpandedTransactions] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("pendientes")
  const [cargandoRepartidores, setCargandoRepartidores] = useState(true)

  // Obtener ventas desde la base de datos
  useEffect(() => {
    const obtenerVentas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Ventas"))
        const ventasObtenidas: Venta[] = querySnapshot.docs.map((doc) => doc.data() as Venta)

        // Filtrar solo las ventas programadas o en reparto
        const ventasFiltradas = ventasObtenidas.filter(
          (v) => v.estado === "programada" || v.estado === "en_reparto" || v.estado === "entregada",
        )
        setVentas(ventasFiltradas)

        // Agrupar ventas por transaccionId
        const ventasPorTransaccion = new Map<number, Venta[]>()

        ventasFiltradas.forEach((venta) => {
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
            const primerProducto = productos[0]
            const totalTransaccion = productos.reduce((sum, venta) => sum + venta.total, 0)

            agrupadas.push({
              transaccionId,
              cliente: primerProducto.cliente,
              vendedor: primerProducto.vendedor,
              fecha: primerProducto.fecha,
              total: totalTransaccion,
              productos,
              direccionCliente: primerProducto.direccionCliente,
              estado: primerProducto.estado,
              fechaEntrega: primerProducto.fechaEntrega,
              horarioEntrega: primerProducto.horarioEntrega,
              repartidor: primerProducto.repartidor,
            })
          }
        })

        // Ordenar por fecha de entrega (más cercana primero)
        agrupadas.sort((a, b) => {
          if (!a.fechaEntrega) return 1
          if (!b.fechaEntrega) return -1
          return new Date(a.fechaEntrega).getTime() - new Date(b.fechaEntrega).getTime()
        })

        setVentasAgrupadas(agrupadas)
      } catch (error) {
        console.error("Error al obtener las ventas: ", error)
      }
    }

    obtenerVentas()
  }, [])

  // Obtener repartidores
  useEffect(() => {
    const obtenerRepartidores = async () => {
      setCargandoRepartidores(true)
      try {
        console.log("Obteniendo repartidores...")
        const querySnapshot = await getDocs(collection(db, "Repartidores"))

        // Verifica si hay documentos
        if (querySnapshot.empty) {
          console.log("No hay repartidores en la colección")
          setRepartidores([])
          setCargandoRepartidores(false)
          return
        }

        // Mapea los datos asegurándote de incluir el ID del documento
        const repartidoresObtenidos = querySnapshot.docs.map((doc) => {
          const data = doc.data()
          // Asegúrate de que 'disponible' sea un booleano
          return {
            id: doc.id, // Añade el ID del documento
            Nombre: data.Nombre || "Sin Nombre",
            disponible: data.disponible === undefined ? true : Boolean(data.disponible),
          }
        })

        console.log("Repartidores obtenidos:", repartidoresObtenidos)
        setRepartidores(repartidoresObtenidos)
      } catch (error) {
        console.error("Error al obtener los repartidores: ", error)
        // Proporciona información más detallada sobre el error
        if (error instanceof Error) {
          console.error("Mensaje de error:", error.message)
          console.error("Stack trace:", error.stack)
        }
        // Si hay un error, establecer un array vacío
        setRepartidores([])
      } finally {
        setCargandoRepartidores(false)
      }
    }

    obtenerRepartidores()
  }, [])

  // Manejar la expansión/colapso de una transacción
  const toggleTransactionExpand = (transaccionId: number) => {
    setExpandedTransactions((prev) =>
      prev.includes(transaccionId) ? prev.filter((id) => id !== transaccionId) : [...prev, transaccionId],
    )
  }

  // Seleccionar una venta para asignar repartidor
  const seleccionarVenta = (venta: VentaAgrupada) => {
    setVentaSeleccionada(venta)
    setRepartidor(venta.repartidor || "")
  }

  // Asignar repartidor
  const asignarRepartidor = async () => {
    if (!ventaSeleccionada || !repartidor) {
      alert("Por favor seleccione un repartidor")
      return
    }

    try {
      // Actualizar todas las ventas con el mismo transaccionId
      for (const producto of ventaSeleccionada.productos) {
        await updateDoc(doc(db, "Ventas", producto.id.toString()), {
          estado: "en_reparto",
          repartidor: repartidor,
        })
      }

      // Actualizar el estado local
      const ventasActualizadas = ventasAgrupadas.map((v) => {
        if (v.transaccionId === ventaSeleccionada.transaccionId) {
          return {
            ...v,
            estado: "en_reparto",
            repartidor: repartidor,
          }
        }
        return v
      })

      setVentasAgrupadas(ventasActualizadas)

      setVentaSeleccionada(null)
      setRepartidor("")

      alert("Repartidor asignado con éxito")
    } catch (error) {
      console.error("Error al asignar el repartidor: ", error)
      alert("Error al asignar el repartidor")
    }
  }

  // Marcar como entregado
  const marcarComoEntregado = async (venta: VentaAgrupada) => {
    // Verificar si la fecha actual coincide con la fecha de entrega programada
    const fechaActual = new Date().toISOString().split("T")[0]

    if (venta.fechaEntrega !== fechaActual) {
      alert("No se puede marcar como entregado. La entrega está programada para el " + venta.fechaEntrega)
      return
    }

    try {
      // Actualizar todas las ventas con el mismo transaccionId
      for (const producto of venta.productos) {
        await updateDoc(doc(db, "Ventas", producto.id.toString()), {
          estado: "entregada",
        })
      }

      // Actualizar el estado local
      const ventasActualizadas = ventasAgrupadas.map((v) => {
        if (v.transaccionId === venta.transaccionId) {
          return {
            ...v,
            estado: "entregada",
          }
        }
        return v
      })

      setVentasAgrupadas(ventasActualizadas)

      alert("Pedido marcado como entregado")
    } catch (error) {
      console.error("Error al marcar como entregado: ", error)
      alert("Error al marcar como entregado")
    }
  }

  // Filtrar ventas por término de búsqueda y estado
  const ventasFiltradas = ventasAgrupadas.filter((venta) => {
    const matchesSearch =
      venta.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.transaccionId.toString().includes(searchTerm) ||
      (venta.repartidor && venta.repartidor.toLowerCase().includes(searchTerm.toLowerCase()))

    if (activeTab === "pendientes") {
      return matchesSearch && venta.estado === "programada"
    } else if (activeTab === "en_reparto") {
      return matchesSearch && venta.estado === "en_reparto"
    } else if (activeTab === "entregados") {
      return matchesSearch && venta.estado === "entregada"
    }

    return matchesSearch
  })

  // Contar ventas por estado
  const contarVentasPorEstado = (estado: string) => {
    return ventasAgrupadas.filter((v) => v.estado === estado).length
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card className="bg-blue-50">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-blue-500 p-3 mr-4">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pendientes</p>
              <h3 className="text-2xl font-bold">{contarVentasPorEstado("programada")}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-amber-500 p-3 mr-4">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">En Reparto</p>
              <h3 className="text-2xl font-bold">{contarVentasPorEstado("en_reparto")}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-green-500 p-3 mr-4">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Entregados</p>
              <h3 className="text-2xl font-bold">{contarVentasPorEstado("entregada")}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-purple-500 p-3 mr-4">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Entregas Hoy</p>
              <h3 className="text-2xl font-bold">
                {ventasAgrupadas.filter((v) => v.fechaEntrega === new Date().toISOString().split("T")[0]).length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Truck className="h-6 w-6" />
                Gestión de Repartos
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, ID o repartidor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pendientes" value={activeTab} onValueChange={setActiveTab} className="mb-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
                  <TabsTrigger value="en_reparto">En Reparto</TabsTrigger>
                  <TabsTrigger value="entregados">Entregados</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Fecha Entrega</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Repartidor</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventasFiltradas.length > 0 ? (
                      ventasFiltradas.map((venta) => (
                        <React.Fragment key={venta.transaccionId}>
                          <TableRow
                            className={ventaSeleccionada?.transaccionId === venta.transaccionId ? "bg-primary/10" : ""}
                          >
                            <TableCell>{venta.transaccionId}</TableCell>
                            <TableCell className="font-medium">{venta.cliente}</TableCell>
                            <TableCell>{venta.direccionCliente}</TableCell>
                            <TableCell>{venta.fechaEntrega}</TableCell>
                            <TableCell>
                              {venta.horarioEntrega === "mañana"
                                ? "Mañana (8:00 - 12:00)"
                                : venta.horarioEntrega === "tarde"
                                  ? "Tarde (14:00 - 18:00)"
                                  : "-"}
                            </TableCell>
                            <TableCell>{venta.repartidor || "-"}</TableCell>
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

                                {venta.estado === "programada" && (
                                  <Button
                                    variant={
                                      ventaSeleccionada?.transaccionId === venta.transaccionId ? "default" : "outline"
                                    }
                                    size="sm"
                                    onClick={() => seleccionarVenta(venta)}
                                  >
                                    Asignar
                                  </Button>
                                )}

                                {venta.estado === "en_reparto" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700"
                                    onClick={() => marcarComoEntregado(venta)}
                                  >
                                    Entregado
                                  </Button>
                                )}
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
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No hay pedidos{" "}
                          {activeTab === "pendientes"
                            ? "pendientes"
                            : activeTab === "en_reparto"
                              ? "en reparto"
                              : "entregados"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Truck className="h-6 w-6" />
                Asignar Repartidor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ventaSeleccionada && ventaSeleccionada.estado === "programada" ? (
                <div className="space-y-6">
                  <div className="rounded-lg border p-4 bg-muted/20">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">ID:</span>
                        <span className="font-medium">{ventaSeleccionada.transaccionId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Cliente:</span>
                        <span className="font-medium">{ventaSeleccionada.cliente}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Dirección:</span>
                        <span className="font-medium">{ventaSeleccionada.direccionCliente}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Fecha:</span>
                        <span className="font-medium">{ventaSeleccionada.fechaEntrega}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Horario:</span>
                        <span className="font-medium">
                          {ventaSeleccionada.horarioEntrega === "mañana"
                            ? "Mañana (8:00 - 12:00)"
                            : ventaSeleccionada.horarioEntrega === "tarde"
                              ? "Tarde (14:00 - 18:00)"
                              : "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="repartidor" className="text-sm font-medium">
                        Repartidor
                      </Label>
                      <Select
                        onValueChange={setRepartidor}
                        value={repartidor}
                        disabled={cargandoRepartidores || repartidores.length === 0}
                      >
                        <SelectTrigger id="repartidor" className="w-full">
                          <SelectValue
                            placeholder={
                              cargandoRepartidores
                                ? "Cargando repartidores..."
                                : repartidores.length === 0
                                  ? "No hay repartidores disponibles"
                                  : "Seleccionar repartidor"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {cargandoRepartidores ? (
                            <SelectItem value="cargando" disabled>
                              Cargando repartidores...
                            </SelectItem>
                          ) : repartidores.length > 0 ? (
                            repartidores.map((r) => (
                              <SelectItem key={r.id || r.Nombre} value={r.Nombre} disabled={!r.disponible}>
                                {r.Nombre} {!r.disponible && "(No disponible)"}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-repartidores" disabled>
                              No hay repartidores en el sistema
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full mt-4"
                      onClick={asignarRepartidor}
                      disabled={!repartidor || cargandoRepartidores}
                    >
                      {cargandoRepartidores ? "Cargando..." : "Asignar Repartidor"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                  <Truck className="h-12 w-12 mb-4 opacity-20" />
                  <p>Seleccione un pedido pendiente para asignar un repartidor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

