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
import { Calendar, Package, User, ChevronDown, ChevronUp, Search } from "lucide-react"

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

export default function PedidosPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [ventasAgrupadas, setVentasAgrupadas] = useState<VentaAgrupada[]>([])
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaAgrupada | null>(null)
  const [fechaEntrega, setFechaEntrega] = useState<string>("")
  const [horarioEntrega, setHorarioEntrega] = useState<string>("")
  const [expandedTransactions, setExpandedTransactions] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Obtener ventas desde la base de datos
  useEffect(() => {
    const obtenerVentas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Ventas"))
        const ventasObtenidas: Venta[] = querySnapshot.docs.map((doc) => doc.data() as Venta)

        // Filtrar solo las ventas pendientes de programación
        const ventasPendientes = ventasObtenidas.filter((v) => v.estado === "pendiente_programacion")
        setVentas(ventasPendientes)

        // Agrupar ventas por transaccionId
        const ventasPorTransaccion = new Map<number, Venta[]>()

        ventasPendientes.forEach((venta) => {
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
            })
          }
        })

        // Ordenar por ID de transacción (más reciente primero)
        agrupadas.sort((a, b) => b.transaccionId - a.transaccionId)
        setVentasAgrupadas(agrupadas)
      } catch (error) {
        console.error("Error al obtener las ventas: ", error)
      }
    }

    obtenerVentas()
  }, [])

  // Manejar la expansión/colapso de una transacción
  const toggleTransactionExpand = (transaccionId: number) => {
    setExpandedTransactions((prev) =>
      prev.includes(transaccionId) ? prev.filter((id) => id !== transaccionId) : [...prev, transaccionId],
    )
  }

  // Seleccionar una venta para programar entrega
  const seleccionarVenta = (venta: VentaAgrupada) => {
    setVentaSeleccionada(venta)
    setFechaEntrega("")
    setHorarioEntrega("")
  }

  // Programar entrega
  const programarEntrega = async () => {
    if (!ventaSeleccionada || !fechaEntrega || !horarioEntrega) {
      alert("Por favor seleccione una fecha y horario de entrega")
      return
    }

    try {
      // Actualizar todas las ventas con el mismo transaccionId
      for (const producto of ventaSeleccionada.productos) {
        await updateDoc(doc(db, "Ventas", producto.id.toString()), {
          estado: "programada",
          fechaEntrega: fechaEntrega,
          horarioEntrega: horarioEntrega,
        })
      }

      // Actualizar el estado local
      setVentas(ventas.filter((v) => v.transaccionId !== ventaSeleccionada.transaccionId))

      setVentasAgrupadas(ventasAgrupadas.filter((v) => v.transaccionId !== ventaSeleccionada.transaccionId))

      setVentaSeleccionada(null)
      setFechaEntrega("")
      setHorarioEntrega("")

      alert("Entrega programada con éxito")
    } catch (error) {
      console.error("Error al programar la entrega: ", error)
      alert("Error al programar la entrega")
    }
  }

  // Filtrar ventas por término de búsqueda
  const ventasFiltradas = ventasAgrupadas.filter(
    (venta) =>
      venta.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.transaccionId.toString().includes(searchTerm),
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="bg-blue-50">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-blue-500 p-3 mr-4">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pedidos Pendientes</p>
              <h3 className="text-2xl font-bold">{ventasAgrupadas.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-green-500 p-3 mr-4">
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

        <Card className="bg-purple-50">
          <CardContent className="flex items-center p-6">
            <div className="rounded-full bg-purple-500 p-3 mr-4">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Clientes Atendidos</p>
              <h3 className="text-2xl font-bold">{new Set(ventasAgrupadas.map((v) => v.cliente)).size}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6" />
                Pedidos Pendientes de Programación
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Fecha Venta</TableHead>
                      <TableHead>Fecha Entrega</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
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
                            <TableCell>{venta.fecha}</TableCell>
                            <TableCell>{venta.fechaEntrega}</TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  venta.estado === "pendiente_programacion"
                                    ? "bg-amber-100 text-amber-800"
                                    : venta.estado === "programada"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {venta.estado === "pendiente_programacion"
                                  ? "Pendiente de programación"
                                  : venta.estado === "programada"
                                    ? "Programada"
                                    : "Pendiente"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">${venta.total}</TableCell>
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
                                  variant={
                                    ventaSeleccionada?.transaccionId === venta.transaccionId ? "default" : "outline"
                                  }
                                  size="sm"
                                  onClick={() => seleccionarVenta(venta)}
                                >
                                  Programar
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedTransactions.includes(venta.transaccionId) && (
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={8} className="p-0">
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
                        <TableCell colSpan={8} className="h-24 text-center">
                          No hay pedidos pendientes de programación
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
                <Calendar className="h-6 w-6" />
                Programar Entrega
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ventaSeleccionada ? (
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
                        <span className="text-sm font-medium text-muted-foreground">Total:</span>
                        <span className="font-medium">${ventaSeleccionada.total}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fechaEntrega" className="text-sm font-medium">
                        Fecha de Entrega
                      </Label>
                      <Input
                        id="fechaEntrega"
                        type="date"
                        value={fechaEntrega}
                        onChange={(e) => setFechaEntrega(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="horarioEntrega" className="text-sm font-medium">
                        Horario de Entrega
                      </Label>
                      <Select onValueChange={setHorarioEntrega} value={horarioEntrega}>
                        <SelectTrigger id="horarioEntrega" className="w-full">
                          <SelectValue placeholder="Seleccionar horario" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mañana">Mañana (8:00 - 12:00)</SelectItem>
                          <SelectItem value="tarde">Tarde (14:00 - 18:00)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full mt-4"
                      onClick={programarEntrega}
                      disabled={!fechaEntrega || !horarioEntrega}
                    >
                      Programar Entrega
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mb-4 opacity-20" />
                  <p>Seleccione un pedido para programar su entrega</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

