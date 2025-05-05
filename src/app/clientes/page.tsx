"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { db } from "@/lib/firebaseConfig"
import { collection, getDocs, doc, updateDoc, setDoc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PencilIcon, UserPlusIcon, Users, CheckCircle, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Cliente {
  id: number
  nombreCliente: string
  direccionCliente: string
  emailCliente?: string
  telefonoCliente?: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [activeTab, setActiveTab] = useState("lista")

  // Estados para nuevo cliente
  const [nombreCliente, setNombreCliente] = useState("")
  const [direccionCliente, setDireccionCliente] = useState("")
  const [emailCliente, setEmailCliente] = useState("")
  const [telefonoCliente, setTelefonoCliente] = useState("")

  // Estados para edición
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)
  const [nombreClienteEdit, setNombreClienteEdit] = useState("")
  const [direccionClienteEdit, setDireccionClienteEdit] = useState("")
  const [emailClienteEdit, setEmailClienteEdit] = useState("")
  const [telefonoClienteEdit, setTelefonoClienteEdit] = useState("")

  // Estado para mensajes
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" })

  useEffect(() => {
    cargarClientes()
  }, [])

  // Cargar clientes desde Firestore
  const cargarClientes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "Clientes"))
      const clientesObtenidos: Cliente[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        clientesObtenidos.push({
          id: data.id || Number.parseInt(doc.id),
          nombreCliente: data.nombreCliente || "",
          direccionCliente: data.direccionCliente || "",
          emailCliente: data.emailCliente || "",
          telefonoCliente: data.telefonoCliente || "",
        })
      })

      // Ordenar por ID
      clientesObtenidos.sort((a, b) => a.id - b.id)
      setClientes(clientesObtenidos)
    } catch (error) {
      console.error("Error al obtener los clientes: ", error)
      mostrarMensaje("Error al cargar los clientes", "error")
    }
  }

  // Obtener el siguiente ID disponible
  const obtenerSiguienteId = async () => {
    try {
      // Intentar obtener el contador de clientes
      const counterRef = doc(db, "counters", "clientesCounter")
      const counterSnap = await getDoc(counterRef)

      if (counterSnap.exists()) {
        const lastId = counterSnap.data().lastId
        // Actualizar el contador
        await updateDoc(counterRef, { lastId: lastId + 1 })
        return lastId + 1
      } else {
        // Si no existe el contador, crearlo
        await setDoc(counterRef, { lastId: 1 })
        return 1
      }
    } catch (error) {
      console.error("Error al obtener el siguiente ID:", error)

      // Método alternativo: usar el ID más alto existente + 1
      if (clientes.length > 0) {
        return Math.max(...clientes.map((c) => c.id)) + 1
      }
      return 1
    }
  }

  // Registrar nuevo cliente
  const registrarCliente = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombreCliente || !direccionCliente) {
      mostrarMensaje("Por favor complete los campos obligatorios", "error")
      return
    }

    try {
      const nuevoId = await obtenerSiguienteId()

      const nuevoCliente = {
        id: nuevoId,
        nombreCliente,
        direccionCliente,
        emailCliente,
        telefonoCliente,
      }

      // Guardar en Firestore
      await setDoc(doc(db, "Clientes", nuevoId.toString()), nuevoCliente)

      // Actualizar estado local
      setClientes([...clientes, nuevoCliente])

      // Limpiar formulario
      limpiarFormulario()
      mostrarMensaje("Cliente registrado con éxito", "success")

      // Cambiar a la pestaña de lista
      setActiveTab("lista")
    } catch (error) {
      console.error("Error al registrar cliente:", error)
      mostrarMensaje("Error al registrar el cliente", "error")
    }
  }

  // Iniciar edición de cliente
  const iniciarEdicion = (cliente: Cliente) => {
    setClienteEditando(cliente)
    setNombreClienteEdit(cliente.nombreCliente)
    setDireccionClienteEdit(cliente.direccionCliente)
    setEmailClienteEdit(cliente.emailCliente || "")
    setTelefonoClienteEdit(cliente.telefonoCliente || "")
    setActiveTab("editar")
  }

  // Guardar cambios de cliente
  const guardarCambiosCliente = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clienteEditando || !nombreClienteEdit || !direccionClienteEdit) {
      mostrarMensaje("Por favor complete los campos obligatorios", "error")
      return
    }

    try {
      const clienteActualizado = {
        ...clienteEditando,
        nombreCliente: nombreClienteEdit,
        direccionCliente: direccionClienteEdit,
        emailCliente: emailClienteEdit,
        telefonoCliente: telefonoClienteEdit,
      }

      // Actualizar en Firestore
      await updateDoc(doc(db, "Clientes", clienteEditando.id.toString()), clienteActualizado)

      // Actualizar estado local
      setClientes(clientes.map((c) => (c.id === clienteEditando.id ? clienteActualizado : c)))

      mostrarMensaje("Cliente actualizado con éxito", "success")

      // Cambiar a la pestaña de lista
      setActiveTab("lista")
      setClienteEditando(null)
    } catch (error) {
      console.error("Error al actualizar cliente:", error)
      mostrarMensaje("Error al actualizar el cliente", "error")
    }
  }

  // Limpiar formulario
  const limpiarFormulario = () => {
    setNombreCliente("")
    setDireccionCliente("")
    setEmailCliente("")
    setTelefonoCliente("")
  }

  // Mostrar mensaje
  const mostrarMensaje = (texto: string, tipo: string) => {
    setMensaje({ texto, tipo })
    setTimeout(() => {
      setMensaje({ texto: "", tipo: "" })
    }, 5000)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
        <div className="w-64">
          <div className="relative w-full">
            <Input
              placeholder="Buscar cliente..."
              className="w-full pr-8"
              onChange={(e) => {
                const searchTerm = e.target.value.toLowerCase()
                if (searchTerm === "") {
                  cargarClientes()
                } else {
                  const clientesFiltrados = clientes.filter(
                    (cliente) =>
                      cliente.nombreCliente.toLowerCase().includes(searchTerm) ||
                      cliente.direccionCliente.toLowerCase().includes(searchTerm) ||
                      (cliente.emailCliente && cliente.emailCliente.toLowerCase().includes(searchTerm)) ||
                      (cliente.telefonoCliente && cliente.telefonoCliente.includes(searchTerm)),
                  )
                  setClientes(clientesFiltrados)
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={() => cargarClientes()}
            >
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {mensaje.texto && (
        <Alert
          className={`mb-6 ${mensaje.tipo === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"}`}
        >
          {mensaje.tipo === "error" ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <AlertDescription>{mensaje.texto}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="lista" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Lista de Clientes
          </TabsTrigger>
          <TabsTrigger value="nuevo" className="flex items-center gap-2">
            <UserPlusIcon className="h-4 w-4" />
            Nuevo Cliente
          </TabsTrigger>
          <TabsTrigger value="editar" disabled={!clienteEditando} className="flex items-center gap-2">
            <PencilIcon className="h-4 w-4" />
            Editar Cliente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Clientes Registrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.length > 0 ? (
                      clientes.map((cliente) => (
                        <TableRow key={cliente.id}>
                          <TableCell>{cliente.id}</TableCell>
                          <TableCell className="font-medium">{cliente.nombreCliente}</TableCell>
                          <TableCell>{cliente.direccionCliente}</TableCell>
                          <TableCell>{cliente.emailCliente || "-"}</TableCell>
                          <TableCell>{cliente.telefonoCliente || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => iniciarEdicion(cliente)}
                              className="h-8 w-8 p-0"
                            >
                              <PencilIcon className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          No hay clientes registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nuevo">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Registrar Nuevo Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={registrarCliente} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombreCliente" className="required">
                      Nombre del Cliente
                    </Label>
                    <Input
                      id="nombreCliente"
                      value={nombreCliente}
                      onChange={(e) => setNombreCliente(e.target.value)}
                      placeholder="Nombre completo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="direccionCliente" className="required">
                      Dirección
                    </Label>
                    <Input
                      id="direccionCliente"
                      value={direccionCliente}
                      onChange={(e) => setDireccionCliente(e.target.value)}
                      placeholder="Dirección completa"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailCliente">Email</Label>
                    <Input
                      id="emailCliente"
                      type="email"
                      value={emailCliente}
                      onChange={(e) => setEmailCliente(e.target.value)}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefonoCliente">Teléfono</Label>
                    <Input
                      id="telefonoCliente"
                      value={telefonoCliente}
                      onChange={(e) => setTelefonoCliente(e.target.value)}
                      placeholder="Número de teléfono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      limpiarFormulario()
                      setActiveTab("lista")
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Registrar Cliente</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editar">
          {clienteEditando && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Editar Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={guardarCambiosCliente} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombreClienteEdit" className="required">
                        Nombre del Cliente
                      </Label>
                      <Input
                        id="nombreClienteEdit"
                        value={nombreClienteEdit}
                        onChange={(e) => setNombreClienteEdit(e.target.value)}
                        placeholder="Nombre completo"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="direccionClienteEdit" className="required">
                        Dirección
                      </Label>
                      <Input
                        id="direccionClienteEdit"
                        value={direccionClienteEdit}
                        onChange={(e) => setDireccionClienteEdit(e.target.value)}
                        placeholder="Dirección completa"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emailClienteEdit">Email</Label>
                      <Input
                        id="emailClienteEdit"
                        type="email"
                        value={emailClienteEdit}
                        onChange={(e) => setEmailClienteEdit(e.target.value)}
                        placeholder="correo@ejemplo.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefonoClienteEdit">Teléfono</Label>
                      <Input
                        id="telefonoClienteEdit"
                        value={telefonoClienteEdit}
                        onChange={(e) => setTelefonoClienteEdit(e.target.value)}
                        placeholder="Número de teléfono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setClienteEditando(null)
                        setActiveTab("lista")
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">Guardar Cambios</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

