const LISTA_ESTADOS_RESERVA = [
  "Autorizada",
  "Pendiente por Autorizar",
  "Pendiente por Confirmar",
  "En Proceso de Extracción",
  "Preparando Envío",
  "En Ruta al Solicitante",
  "Recibido en Base",
  "Pendiente de Confirmar Instalación",
  "Rechazada",
  "No Procede",
  "Cerrada"
]

function BotonGestionReservas({ alActualizar }) {
  const [abierto, setAbierto] = S.useState(false)

  return (0, U.jsxs)(S.Fragment, {
    children: [
      (0, U.jsxs)("button", {
        type: "button",
        onClick: () => setAbierto(true),
        className: "rounded-lg bg-[var(--color-navy)] text-white text-sm font-medium px-4 py-2 hover:bg-[var(--color-navy-light)] transition-colors flex items-center gap-1.5 shadow-sm",
        title: "Consultar números de reserva y gestionar estatus de materiales",
        children: [
          (0, U.jsx)("svg", {
            className: "w-4 h-4",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            viewBox: "0 0 24 24",
            children: (0, U.jsx)("path", {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            })
          }),
          "Consultar Reservas"
        ]
      }),
      abierto && (0, U.jsx)(ModalGestionReservas, {
        alCerrar: () => setAbierto(false),
        alActualizar: alActualizar
      })
    ]
  })
}

function ModalGestionReservas({ alCerrar, alActualizar }) {
  const [busqueda, setBusqueda] = S.useState("")
  const [reservaActual, setReservaActual] = S.useState("")
  const [materiales, setMateriales] = S.useState([])
  const [cargando, setCargando] = S.useState(false)
  const [guardandoId, setGuardandoId] = S.useState(null) // id | 'todos' | null
  const [mensaje, setMensaje] = S.useState(null) // { tipo: 'ok'|'error'|'info', texto }
  const [reservasRecientes, setReservasRecientes] = S.useState([])
  const [cargandoRecientes, setCargandoRecientes] = S.useState(false)
  
  // Mapeo local de cambios: id -> { nuevoEstado, limpiarReserva }
  const [edicion, setEdicion] = S.useState({})

  const cargarRecientes = S.useCallback(async () => {
    setCargandoRecientes(true)
    try {
      const { data, error } = await H.from("solicitudes_refaccion")
        .select("numero_reserva, estado, sociedad, base, created_at")
        .not("numero_reserva", "is", null)
        .order("created_at", { ascending: false })
        .limit(300)
      if (error) throw error

      const mapa = new Map()
      for (const fila of data || []) {
        const num = fila.numero_reserva?.trim()
        if (!num) continue
        if (!mapa.has(num)) {
          mapa.set(num, {
            numero: num,
            total: 0,
            sociedad: fila.sociedad || "-",
            base: fila.base || "-",
            estados: new Set()
          })
        }
        const item = mapa.get(num)
        item.total++
        if (fila.estado) item.estados.add(fila.estado)
      }
      setReservasRecientes(Array.from(mapa.values()))
    } catch (err) {
      console.error("Error al cargar reservas recientes:", err)
    } finally {
      setCargandoRecientes(false)
    }
  }, [])

  S.useEffect(() => {
    cargarRecientes()
  }, [cargarRecientes])

  S.useEffect(() => {
    function manejarTecla(e) {
      if (e.key === "Escape") alCerrar()
    }
    window.addEventListener("keydown", manejarTecla)
    return () => window.removeEventListener("keydown", manejarTecla)
  }, [alCerrar])

  async function ejecutarBusqueda(term) {
    const num = (term !== undefined ? term : busqueda).trim()
    if (!num) {
      setMensaje({ tipo: "error", texto: "Ingresa un número de reserva para consultar." })
      return
    }
    setCargando(true)
    setMensaje(null)
    setReservaActual(num)
    try {
      const { data, error } = await H.from("solicitudes_refaccion")
        .select(`
          id, folio, autobus_numero, sociedad, base, falla, estado, numero_reserva, created_at,
          catalogo_componentes ( nombre, clave_material )
        `)
        .eq("numero_reserva", num)
        .order("folio", { ascending: true })

      if (error) throw error

      setMateriales(data || [])
      const mapaEdicion = {}
      ;(data || []).forEach((m) => {
        mapaEdicion[m.id] = {
          nuevoEstado: m.estado,
          limpiarReserva: false
        }
      })
      setEdicion(mapaEdicion)

      if (!data || data.length === 0) {
        setMensaje({ tipo: "info", texto: `No se encontraron materiales con el número de reserva "${num}".` })
      }
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error al consultar la reserva: " + err.message })
    } finally {
      setCargando(false)
    }
  }

  function actualizarEstadoItem(matId, estado) {
    setEdicion((prev) => {
      const prevVal = prev[matId] || {}
      // Si se revierte a un estado previo a asignación de reserva, activar por defecto limpiar reserva
      const esReversion = ["Autorizada", "Pendiente por Autorizar", "Pendiente por Confirmar", "Rechazada", "No Procede"].includes(estado)
      return {
        ...prev,
        [matId]: {
          nuevoEstado: estado,
          limpiarReserva: esReversion ? true : prevVal.limpiarReserva
        }
      }
    })
  }

  function actualizarLimpiarReservaItem(matId, valor) {
    setEdicion((prev) => ({
      ...prev,
      [matId]: {
        ...(prev[matId] || {}),
        limpiarReserva: valor
      }
    }))
  }

  async function guardarCambioItem(mat) {
    const config = edicion[mat.id]
    if (!config) return
    const nuevoEstado = config.nuevoEstado
    const debeLimpiar = config.limpiarReserva

    if (nuevoEstado === mat.estado && !debeLimpiar) {
      setMensaje({ tipo: "info", texto: `El folio ${mat.folio} ya tiene el estatus "${mat.estado}".` })
      return
    }

    setGuardandoId(mat.id)
    setMensaje(null)
    try {
      const payload = { estado: nuevoEstado }
      if (debeLimpiar) {
        payload.numero_reserva = null
      }

      const { error } = await H.from("solicitudes_refaccion")
        .update(payload)
        .eq("id", mat.id)

      if (error) throw error

      setMensaje({
        tipo: "ok",
        texto: `Folio ${mat.folio} (Autobús ${mat.autobus_numero}) actualizado a "${nuevoEstado}"${debeLimpiar ? " y desvinculado de la reserva" : ""}.`
      })

      if (alActualizar) alActualizar()
      await cargarRecientes()
      await ejecutarBusqueda(reservaActual)
    } catch (err) {
      setMensaje({ tipo: "error", texto: `Error al actualizar folio ${mat.folio}: ` + err.message })
    } finally {
      setGuardandoId(null)
    }
  }

  async function cancelarTodaLaReserva() {
    if (!materiales || materiales.length === 0) return
    const confirmar = window.confirm(
      `¿Deseas cancelar la reserva "${reservaActual}"?\n\n` +
      `Se revertirán los ${materiales.length} materiales a estado 'Autorizada' y se les removerá el número de reserva para que puedan volver a procesarse en Almacén.`
    )
    if (!confirmar) return

    setGuardandoId("todos")
    setMensaje(null)
    try {
      const ids = materiales.map((m) => m.id)
      const { error } = await H.from("solicitudes_refaccion")
        .update({
          estado: "Autorizada",
          numero_reserva: null
        })
        .in("id", ids)

      if (error) throw error

      setMensaje({
        tipo: "ok",
        texto: `Reserva "${reservaActual}" cancelada exitosamente. ${materiales.length} materiales revertidos a 'Autorizada' y reserva liberada.`
      })

      if (alActualizar) alActualizar()
      await cargarRecientes()
      await ejecutarBusqueda(reservaActual)
    } catch (err) {
      setMensaje({ tipo: "error", texto: "No se pudo cancelar la reserva completa: " + err.message })
    } finally {
      setGuardandoId(null)
    }
  }

  return (0, U.jsx)("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      backgroundColor: "rgba(11, 18, 32, 0.70)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      boxSizing: "border-box"
    },
    onClick: (e) => {
      if (e.target === e.currentTarget) alCerrar()
    },
    children: (0, U.jsxs)("div", {
      style: {
        position: "relative",
        width: "100%",
        maxWidth: "1100px",
        height: "min(88vh, 820px)",
        maxHeight: "calc(100vh - 32px)",
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e3e6eb",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      },
      children: [
        // Header (Fijo)
        (0, U.jsxs)("div", {
          style: {
            padding: "16px 24px",
            backgroundColor: "#0b1220",
            color: "#ffffff",
            borderBottom: "1px solid #e3e6eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0
          },
          children: [
            (0, U.jsxs)("div", {
              children: [
                (0, U.jsxs)("div", {
                  style: { display: "flex", alignItems: "center", gap: "10px" },
                  children: [
                    (0, U.jsx)("h3", {
                      style: { fontSize: "18px", fontWeight: 600, color: "#ffffff", margin: 0 },
                      children: "Consulta y Gestión de Reservas"
                    }),
                    (0, U.jsx)("span", {
                      style: {
                        backgroundColor: "rgba(15, 158, 142, 0.25)",
                        color: "#2dd4bf",
                        border: "1px solid rgba(45, 212, 191, 0.4)",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        fontSize: "11px",
                        fontWeight: 600
                      },
                      children: "Jefe / Gerente"
                    })
                  ]
                }),
                (0, U.jsx)("p", {
                  style: { fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: "4px 0 0 0" },
                  children: "Consulta el estatus de cada material por número de reserva y revierte manualmente sus estados si se cancela."
                })
              ]
            }),
            (0, U.jsx)("button", {
              type: "button",
              onClick: alCerrar,
              style: {
                borderRadius: "8px",
                padding: "8px",
                color: "rgba(255,255,255,0.7)",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              },
              title: "Cerrar ventana",
              children: (0, U.jsx)("svg", {
                style: { width: "20px", height: "20px" },
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                viewBox: "0 0 24 24",
                children: (0, U.jsx)("path", {
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  d: "M6 18L18 6M6 6l12 12"
                })
              })
            })
          ]
        }),

        // Top Controls: Buscador + Reservas recientes + Alertas (Fijo)
        (0, U.jsxs)("div", {
          style: {
            padding: "16px 24px",
            borderBottom: "1px solid #e3e6eb",
            backgroundColor: "#f8fafc",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          },
          children: [
            // Search Input
            (0, U.jsxs)("form", {
              onSubmit: (e) => {
                e.preventDefault()
                ejecutarBusqueda()
              },
              style: { display: "flex", gap: "10px", alignItems: "center" },
              children: [
                (0, U.jsx)("div", {
                  style: { position: "relative", flex: 1 },
                  children: (0, U.jsx)("input", {
                    type: "text",
                    value: busqueda,
                    onChange: (e) => setBusqueda(e.target.value),
                    placeholder: "Captura o pega el número de reserva (ej. 1002345)...",
                    autoFocus: true,
                    style: {
                      width: "100%",
                      padding: "10px 16px",
                      fontSize: "14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#1a2332",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit"
                    }
                  })
                }),
                (0, U.jsx)("button", {
                  type: "submit",
                  disabled: cargando || !busqueda.trim(),
                  style: {
                    padding: "10px 22px",
                    borderRadius: "8px",
                    backgroundColor: "#0b1220",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 600,
                    border: "none",
                    cursor: cargando || !busqueda.trim() ? "not-allowed" : "pointer",
                    opacity: cargando || !busqueda.trim() ? 0.6 : 1,
                    whiteSpace: "nowrap"
                  },
                  children: cargando ? "Buscando…" : "Buscar Reserva"
                }),
                reservaActual && (0, U.jsx)("button", {
                  type: "button",
                  onClick: () => {
                    setBusqueda("")
                    setReservaActual("")
                    setMateriales([])
                    setMensaje(null)
                  },
                  style: {
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#64748b",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  },
                  children: "Limpiar"
                })
              ]
            }),

            // Reservas recientes sugeridas
            reservasRecientes.length > 0 && (0, U.jsxs)("div", {
              style: { display: "flex", flexDirection: "column", gap: "6px" },
              children: [
                (0, U.jsx)("p", {
                  style: {
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: 0
                  },
                  children: "Reservas recientes registradas:"
                }),
                (0, U.jsx)("div", {
                  style: {
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    maxHeight: "85px",
                    overflowY: "auto",
                    padding: "8px 10px",
                    backgroundColor: "#ffffff",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0"
                  },
                  children: reservasRecientes.slice(0, 15).map((r) => {
                    const estaSeleccionada = reservaActual === r.numero
                    return (0, U.jsxs)("button", {
                      key: r.numero,
                      type: "button",
                      onClick: () => {
                        setBusqueda(r.numero)
                        ejecutarBusqueda(r.numero)
                      },
                      style: {
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        cursor: "pointer",
                        border: estaSeleccionada ? "1px solid #0b1220" : "1px solid #e2e8f0",
                        backgroundColor: estaSeleccionada ? "#0b1220" : "#f8fafc",
                        color: estaSeleccionada ? "#ffffff" : "#1a2332",
                        fontWeight: estaSeleccionada ? 600 : 500,
                        transition: "all 0.15s ease"
                      },
                      children: [
                        (0, U.jsx)("span", { style: { fontFamily: "JetBrains Mono, monospace" }, children: r.numero }),
                        (0, U.jsxs)("span", {
                          style: {
                            padding: "2px 7px",
                            borderRadius: "9999px",
                            fontSize: "10px",
                            fontWeight: 600,
                            backgroundColor: estaSeleccionada ? "rgba(255,255,255,0.2)" : "#e2e8f0",
                            color: estaSeleccionada ? "#ffffff" : "#64748b"
                          },
                          children: [r.total, " mat."]
                        })
                      ]
                    })
                  })
                })
              ]
            }),

            // Mensajes de alerta
            mensaje && (0, U.jsx)("div", {
              style: {
                padding: "10px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: mensaje.tipo === "ok" ? "#e6f5f3" : mensaje.tipo === "error" ? "#fbe7e7" : "#fcf1dd",
                color: mensaje.tipo === "ok" ? "#0f9e8e" : mensaje.tipo === "error" ? "#d63b3b" : "#c9820a",
                border: `1px solid ${mensaje.tipo === "ok" ? "rgba(15,158,142,0.3)" : mensaje.tipo === "error" ? "rgba(214,59,59,0.3)" : "rgba(201,130,10,0.3)"}`
              },
              children: (0, U.jsx)("span", { children: mensaje.texto })
            })
          ]
        }),

        // Body: Scrollable Material Content
        (0, U.jsxs)("div", {
          style: {
            padding: "20px 24px",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          },
          children: [
            // Loading state
            cargando && (0, U.jsx)("div", {
              style: { padding: "48px 0", textAlign: "center", color: "#64748b", fontSize: "14px" },
              children: (0, U.jsx)("p", { children: "Consultando materiales de la reserva en base de datos…" })
            }),

            // Estado vacío inicial
            !cargando && !reservaActual && (0, U.jsxs)("div", {
              style: { padding: "48px 20px", textAlign: "center", color: "#64748b", display: "flex", flexDirection: "column", gap: "8px" },
              children: [
                (0, U.jsx)("p", { style: { fontSize: "15px", fontWeight: 600, color: "#334155", margin: 0 }, children: "Selecciona una reserva reciente o ingresa un número arriba para consultar sus materiales." }),
                (0, U.jsx)("p", { style: { fontSize: "13px", margin: 0 }, children: "Podrás cambiar el estatus de cada material individualmente o cancelar la reserva completa." })
              ]
            }),

            // Detalle de la reserva consultada
            !cargando && reservaActual && materiales.length > 0 && (0, U.jsxs)("div", {
              style: { display: "flex", flexDirection: "column", gap: "16px" },
              children: [
                // Barra de control de la reserva
                (0, U.jsxs)("div", {
                  style: {
                    padding: "16px 20px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px"
                  },
                  children: [
                    (0, U.jsxs)("div", {
                      children: [
                        (0, U.jsxs)("div", {
                          style: { display: "flex", alignItems: "center", gap: "8px" },
                          children: [
                            (0, U.jsx)("span", { style: { fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }, children: "Reserva:" }),
                            (0, U.jsx)("span", { style: { fontFamily: "JetBrains Mono, monospace", fontSize: "17px", fontWeight: 700, color: "#0f172a" }, children: reservaActual }),
                            (0, U.jsxs)("span", {
                              style: {
                                marginLeft: "10px",
                                padding: "3px 10px",
                                borderRadius: "9999px",
                                fontSize: "12px",
                                fontWeight: 600,
                                backgroundColor: "#eff6ff",
                                color: "#1d4ed8"
                              },
                              children: [materiales.length, " ", materiales.length === 1 ? "material" : "materiales"]
                            })
                          ]
                        }),
                        (0, U.jsxs)("p", {
                          style: { fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" },
                          children: [
                            "Sociedad: ",
                            materiales[0]?.sociedad || "-",
                            " · Base: ",
                            materiales[0]?.base || "-"
                          ]
                        })
                      ]
                    }),
                    (0, U.jsxs)("button", {
                      type: "button",
                      onClick: cancelarTodaLaReserva,
                      disabled: guardandoId !== null,
                      style: {
                        padding: "9px 18px",
                        borderRadius: "8px",
                        border: "1px solid #d63b3b",
                        backgroundColor: "#ffffff",
                        color: "#d63b3b",
                        fontSize: "12px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: guardandoId !== null ? "not-allowed" : "pointer",
                        opacity: guardandoId !== null ? 0.5 : 1,
                        transition: "all 0.15s ease"
                      },
                      children: [
                        (0, U.jsx)("svg", {
                          style: { width: "16px", height: "16px" },
                          fill: "none",
                          stroke: "currentColor",
                          strokeWidth: "2",
                          viewBox: "0 0 24 24",
                          children: (0, U.jsx)("path", {
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          })
                        }),
                        guardandoId === "todos" ? "Cancelando reserva…" : "Cancelar Reserva Completa (Revertir todos a Autorizada)"
                      ]
                    })
                  ]
                }),

                // Tabla de materiales
                (0, U.jsx)("div", {
                  style: {
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  },
                  children: (0, U.jsx)("div", {
                    style: { overflowX: "auto" },
                    children: (0, U.jsxs)("table", {
                      style: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" },
                      children: [
                        (0, U.jsx)("thead", {
                          children: (0, U.jsxs)("tr", {
                            style: {
                              borderBottom: "1px solid #e2e8f0",
                              backgroundColor: "#f1f5f9",
                              color: "#475569",
                              fontSize: "11px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em"
                            },
                            children: [
                              (0, U.jsx)("th", { style: { padding: "12px 18px" }, children: "Folio / Unidad" }),
                              (0, U.jsx)("th", { style: { padding: "12px 18px" }, children: "Componente" }),
                              (0, U.jsx)("th", { style: { padding: "12px 18px" }, children: "Estatus Actual" }),
                              (0, U.jsx)("th", { style: { padding: "12px 18px" }, children: "Revertir / Cambiar Estatus" }),
                              (0, U.jsx)("th", { style: { padding: "12px 18px", textAlign: "right" }, children: "Acción" })
                            ]
                          })
                        }),
                        (0, U.jsx)("tbody", {
                          children: materiales.map((mat) => {
                            const config = edicion[mat.id] || { nuevoEstado: mat.estado, limpiarReserva: false }
                            const hayCambio = config.nuevoEstado !== mat.estado || config.limpiarReserva
                            const guardandoEste = guardandoId === mat.id

                            return (0, U.jsxs)("tr", {
                              key: mat.id,
                              style: { borderBottom: "1px solid #f1f5f9", transition: "background-color 0.15s ease" },
                              children: [
                                // Folio & Autobús
                                (0, U.jsxs)("td", {
                                  style: { padding: "14px 18px", whiteSpace: "nowrap" },
                                  children: [
                                    (0, U.jsx)("div", {
                                      style: { fontFamily: "JetBrains Mono, monospace", fontWeight: 600, color: "#0f172a", fontSize: "13px" },
                                      children: mat.folio
                                    }),
                                    (0, U.jsxs)("div", {
                                      style: { fontSize: "12px", color: "#64748b", fontFamily: "JetBrains Mono, monospace", marginTop: "2px" },
                                      children: ["Unidad: ", mat.autobus_numero]
                                    })
                                  ]
                                }),

                                // Componente
                                (0, U.jsxs)("td", {
                                  style: { padding: "14px 18px" },
                                  children: [
                                    (0, U.jsx)("div", {
                                      style: { fontWeight: 500, color: "#1e293b", fontSize: "13px", lineHeight: "1.4" },
                                      children: mat.catalogo_componentes?.nombre || "-"
                                    }),
                                    mat.catalogo_componentes?.clave_material && (0, U.jsxs)("div", {
                                      style: {
                                        display: "inline-block",
                                        fontSize: "11px",
                                        color: "#64748b",
                                        backgroundColor: "#f1f5f9",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        fontFamily: "JetBrains Mono, monospace",
                                        marginTop: "4px"
                                      },
                                      children: ["Clave: ", mat.catalogo_componentes.clave_material]
                                    })
                                  ]
                                }),

                                // Estatus Actual
                                (0, U.jsx)("td", {
                                  style: { padding: "14px 18px", whiteSpace: "nowrap" },
                                  children: (0, U.jsx)(pG, { estado: mat.estado })
                                }),

                                // Revertir / Cambiar Estatus
                                (0, U.jsxs)("td", {
                                  style: { padding: "14px 18px" },
                                  children: [
                                    (0, U.jsx)("select", {
                                      value: config.nuevoEstado,
                                      onChange: (e) => actualizarEstadoItem(mat.id, e.target.value),
                                      disabled: guardandoEste || guardandoId === "todos",
                                      style: {
                                        width: "100%",
                                        minWidth: "220px",
                                        padding: "8px 12px",
                                        fontSize: "12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        backgroundColor: "#ffffff",
                                        color: "#1e293b",
                                        outline: "none",
                                        cursor: "pointer",
                                        boxSizing: "border-box"
                                      },
                                      children: LISTA_ESTADOS_RESERVA.map((est) => (
                                        (0, U.jsx)("option", { value: est, children: est }, est)
                                      ))
                                    }),
                                    (0, U.jsxs)("label", {
                                      style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        marginTop: "8px",
                                        fontSize: "12px",
                                        color: "#64748b",
                                        cursor: "pointer",
                                        userSelect: "none"
                                      },
                                      children: [
                                        (0, U.jsx)("input", {
                                          type: "checkbox",
                                          checked: config.limpiarReserva,
                                          onChange: (e) => actualizarLimpiarReservaItem(mat.id, e.target.checked),
                                          disabled: guardandoEste || guardandoId === "todos",
                                          style: { width: "16px", height: "16px", cursor: "pointer", accentColor: "#0b1220" }
                                        }),
                                        (0, U.jsx)("span", { children: "Quitar número de reserva" })
                                      ]
                                    })
                                  ]
                                }),

                                // Botón Guardar individual
                                (0, U.jsx)("td", {
                                  style: { padding: "14px 18px", whiteSpace: "nowrap", textAlign: "right" },
                                  children: (0, U.jsx)("button", {
                                    type: "button",
                                    onClick: () => guardarCambioItem(mat),
                                    disabled: !hayCambio || guardandoEste || guardandoId !== null,
                                    style: {
                                      padding: "8px 18px",
                                      borderRadius: "8px",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      border: "none",
                                      cursor: hayCambio && !guardandoEste && guardandoId === null ? "pointer" : "not-allowed",
                                      backgroundColor: hayCambio ? "#0b1220" : "#f1f5f9",
                                      color: hayCambio ? "#ffffff" : "#94a3b8",
                                      boxShadow: hayCambio ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                                      transition: "all 0.15s ease"
                                    },
                                    children: guardandoEste ? "Guardando…" : "Aplicar"
                                  })
                                })
                              ]
                            })
                          })
                        })
                      ]
                    })
                  })
                })
              ]
            })
          ]
        }),

        // Footer (Fijo)
        (0, U.jsxs)("div", {
          style: {
            padding: "14px 24px",
            borderTop: "1px solid #e3e6eb",
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#64748b",
            flexShrink: 0
          },
          children: [
            (0, U.jsx)("span", {
              children: "Al revertir un material a 'Autorizada' y quitar la reserva, volverá a estar disponible en Gestión de Almacén."
            }),
            (0, U.jsx)("button", {
              type: "button",
              onClick: alCerrar,
              style: {
                padding: "8px 22px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#1a2332",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              },
              children: "Cerrar"
            })
          ]
        })
      ]
    })
  })
}
