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
    className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-hidden",
    onClick: (e) => {
      if (e.target === e.currentTarget) alCerrar()
    },
    children: (0, U.jsxs)("div", {
      className: "relative w-full max-w-5xl bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[850px]",
      children: [
        // Header
        (0, U.jsxs)("div", {
          className: "flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-navy)] text-white flex-shrink-0",
          children: [
            (0, U.jsxs)("div", {
              children: [
                (0, U.jsxs)("div", {
                  className: "flex items-center gap-2",
                  children: [
                    (0, U.jsx)("h3", {
                      className: "font-[var(--font-display)] text-lg font-semibold",
                      children: "Consulta y Gestión de Reservas"
                    }),
                    (0, U.jsx)("span", {
                      className: "px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-teal)]/20 text-[var(--color-teal)] border border-[var(--color-teal)]/40",
                      children: "Jefe / Gerente"
                    })
                  ]
                }),
                (0, U.jsx)("p", {
                  className: "text-xs text-white/70 mt-0.5",
                  children: "Consulta el estatus de cada material por número de reserva y revierte manualmente sus estados si se cancela."
                })
              ]
            }),
            (0, U.jsx)("button", {
              type: "button",
              onClick: alCerrar,
              className: "rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer",
              title: "Cerrar ventana",
              children: (0, U.jsx)("svg", {
                className: "w-5 h-5",
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

        // Top Controls: Buscador + Reservas recientes + Alertas (fijos arriba)
        (0, U.jsxs)("div", {
          className: "px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/40 flex-shrink-0 space-y-3",
          children: [
            // Search Input
            (0, U.jsxs)("form", {
              onSubmit: (e) => {
                e.preventDefault()
                ejecutarBusqueda()
              },
              className: "flex gap-2 items-center",
              children: [
                (0, U.jsx)("div", {
                  className: "relative flex-1",
                  children: (0, U.jsx)("input", {
                    type: "text",
                    value: busqueda,
                    onChange: (e) => setBusqueda(e.target.value),
                    placeholder: "Captura o pega el número de reserva (ej. 1002345)...",
                    autoFocus: true,
                    className: "tabular w-full rounded-lg border border-[var(--color-border)] px-3.5 py-2 text-sm outline-none focus:border-[var(--color-teal)] bg-white text-[var(--color-text)]"
                  })
                }),
                (0, U.jsx)("button", {
                  type: "submit",
                  disabled: cargando || !busqueda.trim(),
                  className: "rounded-lg bg-[var(--color-navy)] text-white text-sm font-medium px-5 py-2 hover:bg-[var(--color-navy-light)] transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer",
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
                  className: "rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm font-medium px-3 py-2 hover:bg-[var(--color-bg)] transition-colors cursor-pointer",
                  children: "Limpiar"
                })
              ]
            }),

            // Reservas recientes sugeridas
            reservasRecientes.length > 0 && (0, U.jsxs)("div", {
              className: "space-y-1.5",
              children: [
                (0, U.jsx)("p", {
                  className: "text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider",
                  children: "Reservas recientes registradas:"
                }),
                (0, U.jsx)("div", {
                  className: "flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-white/70 rounded-xl border border-[var(--color-border)]/60",
                  children: reservasRecientes.slice(0, 15).map((r) => (
                    (0, U.jsxs)("button", {
                      key: r.numero,
                      type: "button",
                      onClick: () => {
                        setBusqueda(r.numero)
                        ejecutarBusqueda(r.numero)
                      },
                      className: `tabular text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                        reservaActual === r.numero
                          ? "bg-[var(--color-navy)] text-white border-[var(--color-navy)] font-semibold shadow-sm"
                          : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-teal)]"
                      }`,
                      children: [
                        (0, U.jsx)("span", { children: r.numero }),
                        (0, U.jsxs)("span", {
                          className: `text-[10px] px-1.5 py-0.2 rounded-full ${
                            reservaActual === r.numero ? "bg-white/20 text-white" : "bg-gray-100 text-[var(--color-text-muted)]"
                          }`,
                          children: [r.total, " mat."]
                        })
                      ]
                    })
                  ))
                })
              ]
            }),

            // Mensajes de alerta
            mensaje && (0, U.jsx)("div", {
              className: `text-xs rounded-lg px-3.5 py-2.5 flex items-center justify-between ${
                mensaje.tipo === "ok"
                  ? "bg-[var(--color-teal-bg)] text-[var(--color-teal)] border border-[var(--color-teal)]/30"
                  : mensaje.tipo === "error"
                  ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30"
                  : "bg-[var(--color-amber-bg)] text-[var(--color-amber)] border border-[var(--color-amber)]/30"
              }`,
              children: (0, U.jsx)("span", { children: mensaje.texto })
            })
          ]
        }),

        // Body: Contenido con scroll independiente
        (0, U.jsxs)("div", {
          className: "p-6 space-y-4 overflow-y-auto flex-1 min-h-0",
          children: [
            // Loading state
            cargando && (0, U.jsx)("div", {
              className: "py-16 text-center text-sm text-[var(--color-text-muted)] space-y-2",
              children: (0, U.jsx)("p", { children: "Consultando materiales de la reserva en base de datos…" })
            }),

            // Estado vacío inicial
            !cargando && !reservaActual && (0, U.jsxs)("div", {
              className: "py-16 text-center space-y-2 text-[var(--color-text-muted)]",
              children: [
                (0, U.jsx)("p", { className: "text-sm font-medium", children: "Selecciona una reserva reciente o ingresa un número arriba para consultar sus materiales." }),
                (0, U.jsx)("p", { className: "text-xs", children: "Podrás cambiar el estatus de cada material individualmente o cancelar la reserva completa." })
              ]
            }),

            // Detalle de la reserva consultada
            !cargando && reservaActual && materiales.length > 0 && (0, U.jsxs)("div", {
              className: "space-y-4",
              children: [
                // Barra de control de la reserva
                (0, U.jsxs)("div", {
                  className: "flex items-center justify-between flex-wrap gap-3 p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]",
                  children: [
                    (0, U.jsxs)("div", {
                      children: [
                        (0, U.jsxs)("div", {
                          className: "flex items-center gap-2",
                          children: [
                            (0, U.jsx)("span", { className: "text-xs text-[var(--color-text-muted)] uppercase font-semibold", children: "Reserva:" }),
                            (0, U.jsx)("span", { className: "font-[var(--font-mono)] text-base font-bold text-[var(--color-text)]", children: reservaActual }),
                            (0, U.jsxs)("span", {
                              className: "ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700",
                              children: [materiales.length, " ", materiales.length === 1 ? "material" : "materiales"]
                            })
                          ]
                        }),
                        (0, U.jsxs)("p", {
                          className: "text-xs text-[var(--color-text-muted)] mt-1",
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
                      className: "rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] text-xs font-medium px-4 py-2 transition-colors disabled:opacity-50 flex items-center gap-1.5",
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
                  className: "border border-[var(--color-border)] rounded-xl overflow-hidden bg-white shadow-sm",
                  children: (0, U.jsx)("div", {
                    className: "overflow-x-auto",
                    children: (0, U.jsxs)("table", {
                      className: "w-full text-left text-xs",
                      children: [
                        (0, U.jsx)("thead", {
                          children: (0, U.jsxs)("tr", {
                            className: "border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 text-[var(--color-text-muted)] uppercase tracking-wider font-semibold",
                            children: [
                              (0, U.jsx)("th", { className: "px-3.5 py-3", children: "Folio / Unidad" }),
                              (0, U.jsx)("th", { className: "px-3.5 py-3", children: "Componente" }),
                              (0, U.jsx)("th", { className: "px-3.5 py-3", children: "Estatus Actual" }),
                              (0, U.jsx)("th", { className: "px-3.5 py-3", children: "Revertir / Cambiar Estatus" }),
                              (0, U.jsx)("th", { className: "px-3.5 py-3 text-right", children: "Acción" })
                            ]
                          })
                        }),
                        (0, U.jsx)("tbody", {
                          className: "divide-y divide-[var(--color-border)]",
                          children: materiales.map((mat) => {
                            const config = edicion[mat.id] || { nuevoEstado: mat.estado, limpiarReserva: false }
                            const hayCambio = config.nuevoEstado !== mat.estado || config.limpiarReserva
                            const guardandoEste = guardandoId === mat.id

                            return (0, U.jsxs)("tr", {
                              key: mat.id,
                              className: "hover:bg-[var(--color-bg)]/40 transition-colors",
                              children: [
                                // Folio & Autobús
                                (0, U.jsxs)("td", {
                                  className: "px-3.5 py-3 whitespace-nowrap",
                                  children: [
                                    (0, U.jsx)("div", { className: "tabular font-semibold text-[var(--color-text)]", children: mat.folio }),
                                    (0, U.jsxs)("div", { className: "text-[11px] text-[var(--color-text-muted)] tabular", children: ["Unidad: ", mat.autobus_numero] })
                                  ]
                                }),

                                // Componente
                                (0, U.jsxs)("td", {
                                  className: "px-3.5 py-3",
                                  children: [
                                    (0, U.jsx)("div", { className: "font-medium text-[var(--color-text)] line-clamp-1", children: mat.catalogo_componentes?.nombre || "-" }),
                                    mat.catalogo_componentes?.clave_material && (0, U.jsxs)("div", {
                                      className: "text-[10px] text-[var(--color-text-muted)] tabular font-mono",
                                      children: ["Clave: ", mat.catalogo_componentes.clave_material]
                                    })
                                  ]
                                }),

                                // Estatus Actual
                                (0, U.jsx)("td", {
                                  className: "px-3.5 py-3 whitespace-nowrap",
                                  children: (0, U.jsx)(pG, { estado: mat.estado })
                                }),

                                // Revertir / Cambiar Estatus
                                (0, U.jsxs)("td", {
                                  className: "px-3.5 py-3",
                                  children: [
                                    (0, U.jsx)("select", {
                                      value: config.nuevoEstado,
                                      onChange: (e) => actualizarEstadoItem(mat.id, e.target.value),
                                      disabled: guardandoEste || guardandoId === "todos",
                                      className: "w-full max-w-[210px] rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-xs bg-white text-[var(--color-text)] focus:border-[var(--color-teal)] outline-none",
                                      children: LISTA_ESTADOS_RESERVA.map((est) => (
                                        (0, U.jsx)("option", { value: est, children: est }, est)
                                      ))
                                    }),
                                    (0, U.jsxs)("label", {
                                      className: "flex items-center gap-1.5 mt-1 text-[11px] text-[var(--color-text-muted)] cursor-pointer select-none",
                                      children: [
                                        (0, U.jsx)("input", {
                                          type: "checkbox",
                                          checked: config.limpiarReserva,
                                          onChange: (e) => actualizarLimpiarReservaItem(mat.id, e.target.checked),
                                          disabled: guardandoEste || guardandoId === "todos",
                                          className: "rounded border-gray-300 text-[var(--color-navy)] focus:ring-0"
                                        }),
                                        (0, U.jsx)("span", { children: "Quitar número de reserva" })
                                      ]
                                    })
                                  ]
                                }),

                                // Botón Guardar individual
                                (0, U.jsx)("td", {
                                  className: "px-3.5 py-3 whitespace-nowrap text-right",
                                  children: (0, U.jsx)("button", {
                                    type: "button",
                                    onClick: () => guardarCambioItem(mat),
                                    disabled: !hayCambio || guardandoEste || guardandoId !== null,
                                    className: `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      hayCambio
                                        ? "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-light)] shadow-sm cursor-pointer"
                                        : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                    }`,
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

        // Footer
        (0, U.jsxs)("div", {
          className: "px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]/50 flex items-center justify-between text-xs text-[var(--color-text-muted)] flex-shrink-0",
          children: [
            (0, U.jsx)("span", {
              children: "Al revertir un material a 'Autorizada' y quitar la reserva, volverá a estar disponible en Gestión de Almacén."
            }),
            (0, U.jsx)("button", {
              type: "button",
              onClick: alCerrar,
              className: "rounded-lg border border-[var(--color-border)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer",
              children: "Cerrar"
            })
          ]
        })
      ]
    })
  })
}
