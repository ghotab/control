const inventarioOperadoras = [
  "Telcel - Radiomóvil Dipsa, S.A. de C.V.",
  "AT&T - AT&T Comunicaciones Digitales, S. de R.L. de C.V.",
  "Movistar - Pegaso PCS, S.A. de C.V.",
  "Yumovil - AG Impresores S.A. de C.V.",
]

const inventarioTiposAlmacenamiento = [
  'Disco Duro 2.5" Intercambiable',
  'SSD 2.5" Intercambiable',
  'Disco Duro 3.5" Fijo',
  "M.2 Fijo",
]

const inventarioOrdenCamaras = [
  "Camino",
  "Operador Superior",
  "Pasajeros Frontal",
  "Pasajeros Intermedia",
  "Cuerno Derecho",
  "Cuerno Izquierdo",
  "Operador Frontal",
  "Pasajeros Frontal 2do Piso",
  "Pasajeros Intermedia 2do Piso",
  "Escalones 2do Piso",
  "Otro",
]

const inventarioAliasCamaras = {
  "Pasajeros Frontal Deck 2": "Pasajeros Frontal 2do Piso",
  "Pasajeros Intermedia Frontal Deck 2": "Pasajeros Intermedia 2do Piso",
  "Escalones Superior": "Escalones 2do Piso",
}

function inventarioNombreCamara(nombre) {
  return inventarioAliasCamaras[nombre] ?? nombre
}

function inventarioOrdenCamara(nombre) {
  const posicion = inventarioOrdenCamaras.indexOf(inventarioNombreCamara(nombre))
  return posicion < 0 ? inventarioOrdenCamaras.length : posicion
}

const inventarioCamposIniciales = {
  tiene_boletera: false,
  boletera_sistema_operativo: "",
  boletera_sistema_operativo_otro: "",
  boletera_punto_venta: "",
  boletera_contador_delantero: false,
  boletera_contador_trasero: false,
  boletera_gps: "",
  tiene_cctv: false,
  cctv_dvr: "",
  cctv_dvr_otro: "",
  cctv_canales_analogicos: "",
  cctv_canales_ip: "",
  cctv_tipo_bandeja_id: "",
  cctv_tipo_almacenamiento: "",
  cctv_disco_25_intercambiable: false,
  cctv_disco_35_fijo: false,
  cctv_ssd_25: false,
  cctv_microsd: false,
  cctv_modulo_sim: false,
  cctv_sim_instalada: false,
  cctv_operadora: "",
  cctv_icc: "",
  cctv_modo_conexion: "",
  tiene_tpv: false,
  tpv_numero_serie: "",
  conectividad_tiene_modem: false,
  conectividad_modelo_modem_id: "",
  conectividad_serie_modem: "",
  conectividad_tiene_sim: false,
  conectividad_operadora: "",
  conectividad_icc: "",
  tiene_tablet: false,
  tablet_numero_serie: "",
  tablet_tiene_sim: false,
  tablet_operadora: "",
  tablet_icc: "",
  tiene_camara_inteligente: false,
  camara_inteligente_marca: "",
  camara_inteligente_marca_otro: "",
  camara_inteligente_modo: "",
}

function InventarioCampo({ etiqueta, valor, onChange, tipo = "text", opciones = [], placeholder = "", min, disabled = false }) {
  const clase = "w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text)]"
  const cambio = (evento) => onChange(tipo === "number" ? (evento.target.value === "" ? "" : Number(evento.target.value)) : evento.target.value)

  return (0, U.jsxs)("label", {
    className: "block min-w-0 text-sm",
    children: [
      (0, U.jsx)("span", { className: "mb-1 block font-medium text-[var(--color-text)]", children: etiqueta }),
      tipo === "select"
        ? (0, U.jsxs)("select", {
            value: valor ?? "",
            onChange: cambio,
            disabled,
            className: clase,
            children: [
              (0, U.jsx)("option", { value: "", children: "Selecciona una opción" }),
              opciones.map((opcion) => (0, U.jsx)("option", { value: opcion.value, children: opcion.label }, opcion.value)),
            ],
          })
        : (0, U.jsx)("input", {
            type: tipo,
            min,
            value: valor ?? "",
            onChange: cambio,
            disabled,
            placeholder,
            className: clase,
          }),
    ],
  })
}

function InventarioCheck({ etiqueta, valor, onChange, destacado = false, disabled = false }) {
  return (0, U.jsxs)("label", {
    className: `flex min-h-10 items-center gap-2 rounded-lg text-sm text-[var(--color-text)] ${destacado ? "border border-[var(--color-teal)]/40 bg-[var(--color-teal-bg)] px-3 py-2 font-semibold" : ""}`,
    children: [
      (0, U.jsx)("input", { type: "checkbox", checked: Boolean(valor), disabled, onChange: (evento) => onChange(evento.target.checked) }),
      (0, U.jsx)("span", { children: etiqueta }),
    ],
  })
}

function InventarioSeccion({ titulo, children }) {
  return (0, U.jsxs)("section", {
    className: "bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4",
    children: [
      (0, U.jsx)("h3", { className: "mb-3 text-base font-semibold text-[var(--color-text)]", children: titulo }),
      children,
    ],
  })
}

function inventarioNuevoRegistro(autobusId) {
  return { ...inventarioCamposIniciales, autobus_id: autobusId }
}

function inventarioTipoAlmacenamiento(registro) {
  if (registro?.cctv_tipo_almacenamiento) return registro.cctv_tipo_almacenamiento
  const anteriores = [
    registro?.cctv_disco_25_intercambiable && inventarioTiposAlmacenamiento[0],
    registro?.cctv_ssd_25 && inventarioTiposAlmacenamiento[1],
    registro?.cctv_disco_35_fijo && inventarioTiposAlmacenamiento[2],
  ].filter(Boolean)
  return anteriores.length === 1 ? anteriores[0] : ""
}

function inventarioNormalizarTexto(valor) {
  return String(valor ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function inventarioIccValido(valor) {
  return !valor || /^[A-Za-z0-9]{19,20}$/.test(valor)
}

function InventarioEquipos() {
  const { usuario } = Uc()
  const [autobuses, setAutobuses] = S.useState([])
  const [autobusesBase, setAutobusesBase] = S.useState([])
  const [inventarios, setInventarios] = S.useState([])
  const [camarasInventario, setCamarasInventario] = S.useState([])
  const [historialSims, setHistorialSims] = S.useState([])
  const [categoriaVista, setCategoriaVista] = S.useState("todos")
  const [busquedaVista, setBusquedaVista] = S.useState("")
  const [busSeleccionado, setBusSeleccionado] = S.useState(null)
  const [textoAutobus, setTextoAutobus] = S.useState("")
  const [selectorAbierto, setSelectorAbierto] = S.useState(false)
  const [registro, setRegistro] = S.useState(null)
  const [camaras, setCamaras] = S.useState([])
  const [camarasGuardadas, setCamarasGuardadas] = S.useState([])
  const [catalogoCctv, setCatalogoCctv] = S.useState([])
  const [modelosModem, setModelosModem] = S.useState([])
  const [historial, setHistorial] = S.useState([])
  const [puedeEditar, setPuedeEditar] = S.useState(false)
  const [cargando, setCargando] = S.useState(true)
  const [guardando, setGuardando] = S.useState(false)
  const [error, setError] = S.useState("")
  const [aviso, setAviso] = S.useState("")
  const [mostrarCatalogos, setMostrarCatalogos] = S.useState(false)
  const [nuevoModelo, setNuevoModelo] = S.useState("")
  const [nuevaPosicion, setNuevaPosicion] = S.useState("")
  const [nuevoTipoBandeja, setNuevoTipoBandeja] = S.useState("")
  const nivel = inventarioNormalizarTexto(usuario?.Nivel)
  const esJefe = nivel === "jefe"
  const puedeVerCatalogoSims = ["jefe", "gerente"].includes(nivel)
  const puedeVerHistorial = ["coordinador", "jefe", "gerente"].includes(nivel)

  async function cargarCatalogos() {
    const [cctvResult, modemResult] = await Promise.all([
      H.from("inventario_catalogos_cctv").select("id,categoria,nombre,activo").order("nombre"),
      H.from("inventario_modelos_modem").select("id,nombre,activo").order("nombre"),
    ])
    if (cctvResult.error) throw cctvResult.error
    if (modemResult.error) throw modemResult.error
    setCatalogoCctv(cctvResult.data ?? [])
    setModelosModem(modemResult.data ?? [])
  }

  S.useEffect(() => {
    let vigente = true
    async function inicializar() {
      if (nivel === "analista") {
        setCargando(false)
        return
      }
      setCargando(true)
      try {
        const historialSimsQuery = puedeVerCatalogoSims
          ? H.from("historial_sims_inventario").select("id,inventario_id,autobus_id,ubicacion,evento,detalle,usuario_id,usuario_nombre,base,created_at").order("created_at", { ascending: false }).limit(200)
          : Promise.resolve({ data: [], error: null })
        const [busesResult, busesBaseResult, cctvResult, modemResult, inventariosResult, camarasResult, historialSimsResult] = await Promise.all([
          H.rpc("fn_listar_autobuses_inventario"),
          H.rpc("fn_listar_autobuses_base_inventario"),
          H.from("inventario_catalogos_cctv").select("id,categoria,nombre,activo").order("nombre"),
          H.from("inventario_modelos_modem").select("id,nombre,activo").order("nombre"),
          H.from("inventario_equipos_instalados").select("*"),
          H.from("inventario_equipos_camaras").select("inventario_id,catalogo_id,otro_texto"),
          historialSimsQuery,
        ])
        if (busesResult.error) throw busesResult.error
        if (busesBaseResult.error) throw busesBaseResult.error
        if (cctvResult.error) throw cctvResult.error
        if (modemResult.error) throw modemResult.error
        if (inventariosResult.error) throw inventariosResult.error
        if (camarasResult.error) throw camarasResult.error
        if (historialSimsResult.error) throw historialSimsResult.error
        if (!vigente) return
        setAutobuses(busesResult.data ?? [])
        setAutobusesBase(busesBaseResult.data ?? [])
        setCatalogoCctv(cctvResult.data ?? [])
        setModelosModem(modemResult.data ?? [])
        setInventarios(inventariosResult.data ?? [])
        setCamarasInventario(camarasResult.data ?? [])
        setHistorialSims(historialSimsResult.data ?? [])
      } catch (cargaError) {
        if (vigente) setError(cargaError.message || "No se pudo cargar el inventario.")
      } finally {
        if (vigente) setCargando(false)
      }
    }
    inicializar()
    return () => { vigente = false }
  }, [])

  async function seleccionarAutobus(autobus) {
    setBusSeleccionado(autobus)
    setTextoAutobus(autobus.autobus)
    setSelectorAbierto(false)
    setRegistro(null)
    setCamaras([])
    setCamarasGuardadas([])
    setHistorial([])
    setError("")
    setAviso("")
    setCargando(true)
    try {
      const [inventarioResult, permisoResult] = await Promise.all([
        H.from("inventario_equipos_instalados").select("*").eq("autobus_id", autobus.id).maybeSingle(),
        H.rpc("fn_inventario_puede_editar", { p_autobus_id: autobus.id }),
      ])
      if (inventarioResult.error) throw inventarioResult.error
      if (permisoResult.error) throw permisoResult.error
      const fila = inventarioResult.data
      const registroCargado = fila ? { ...inventarioNuevoRegistro(autobus.id), ...fila } : inventarioNuevoRegistro(autobus.id)
      setRegistro(registroCargado)
      setPuedeEditar(permisoResult.data === true)

      if (fila) {
        const camarasResult = await H.from("inventario_equipos_camaras")
          .select("catalogo_id,otro_texto")
          .eq("inventario_id", fila.id)
        if (camarasResult.error) throw camarasResult.error
        const seleccionadas = camarasResult.data ?? []
        setCamaras(seleccionadas)
        setCamarasGuardadas(seleccionadas)
        if (puedeVerHistorial) {
          const historialResult = await H.from("historial_inventario_equipos")
            .select("id,evento,detalle,usuario_id,usuario_nombre,base,created_at")
            .eq("inventario_id", fila.id)
            .order("created_at", { ascending: false })
            .limit(50)
          if (historialResult.error) throw historialResult.error
          setHistorial(historialResult.data ?? [])
        }
      }
    } catch (cargaError) {
      setError(cargaError.message || "No se pudo abrir el inventario de esta unidad.")
    } finally {
      setCargando(false)
    }
  }

  function cerrarDetalle() {
    setBusSeleccionado(null)
    setRegistro(null)
    setCamaras([])
    setCamarasGuardadas([])
    setHistorial([])
    setError("")
    setAviso("")
  }

  function cambiar(campo, valor) {
    setRegistro((actual) => {
      const siguiente = { ...actual, [campo]: valor }
      if (campo === "boletera_sistema_operativo" && valor !== "Otro") siguiente.boletera_sistema_operativo_otro = ""
      if (campo === "conectividad_tiene_modem" && !valor) {
        siguiente.conectividad_tiene_sim = false
        siguiente.conectividad_operadora = ""
        siguiente.conectividad_icc = ""
      }
      if (campo === "cctv_modulo_sim" && !valor) {
        siguiente.cctv_sim_instalada = false
        siguiente.cctv_operadora = ""
        siguiente.cctv_icc = ""
        siguiente.cctv_modo_conexion = ""
      }
      if (campo === "cctv_dvr" || campo === "cctv_tipo_almacenamiento") {
        const tipo = campo === "cctv_tipo_almacenamiento" ? valor : inventarioTipoAlmacenamiento(siguiente)
        const dvr = campo === "cctv_dvr" ? valor : siguiente.cctv_dvr
        if (![inventarioTiposAlmacenamiento[2], inventarioTiposAlmacenamiento[3]].includes(tipo) && dvr !== "DASHCAM MERIVA DUAL") siguiente.cctv_microsd = false
      }
      return siguiente
    })
  }

  function cambiarCamara(catalogoId, marcada) {
    setCamaras((actual) => marcada
      ? [...actual, { catalogo_id: catalogoId, otro_texto: "" }]
      : actual.filter((camara) => camara.catalogo_id !== catalogoId))
  }

  function cambiarTextoOtro(catalogoId, texto) {
    setCamaras((actual) => actual.map((camara) => camara.catalogo_id === catalogoId ? { ...camara, otro_texto: texto } : camara))
  }

  function validarRegistro() {
    if (!registro) return "Selecciona un autobús."
    if (aplicaRegular && registro.tiene_boletera && registro.boletera_sistema_operativo === "Otro" && !registro.boletera_sistema_operativo_otro.trim()) return "Especifica el sistema operativo de la boletera."
    if (aplicaCctv && registro.tiene_cctv && registro.cctv_dvr === "Otro" && !registro.cctv_dvr_otro.trim()) return "Especifica el DVR instalado."
    if (aplicaCctv && registro.tiene_cctv && registro.cctv_modulo_sim && registro.cctv_sim_instalada) {
      if (!registro.cctv_operadora || !registro.cctv_icc || !inventarioIccValido(registro.cctv_icc)) return "Revisa la operadora y el ICC del CCTV (19 o 20 caracteres alfanuméricos)."
    }
    if (aplicaCctv && registro.tiene_cctv && registro.cctv_modulo_sim && !registro.cctv_sim_instalada && !registro.cctv_modo_conexion) return "Selecciona el modo de conexión del CCTV."
    if ((aplicaRegular || aplicaPlus) && registro.conectividad_tiene_sim && (!registro.conectividad_operadora || !registro.conectividad_icc || !inventarioIccValido(registro.conectividad_icc))) return "Revisa la operadora y el ICC de Conectividad (19 o 20 caracteres alfanuméricos)."
    if (aplicaPlus && registro.tiene_tablet && registro.tablet_tiene_sim && (!registro.tablet_operadora || !registro.tablet_icc || !inventarioIccValido(registro.tablet_icc))) return "Revisa la operadora y el ICC de la Bitácora (19 o 20 caracteres alfanuméricos)."
    if (aplicaPlus && registro.tiene_camara_inteligente && registro.camara_inteligente_marca === "Otro" && !registro.camara_inteligente_marca_otro.trim()) return "Especifica la marca de la Cámara Inteligente."
    if (aplicaCctv && registro.tiene_cctv && camaras.some((camara) => catalogoCctv.find((opcion) => opcion.id === camara.catalogo_id)?.nombre === "Otro" && !camara.otro_texto.trim())) return "Especifica la posición de la cámara marcada como Otro."
    return ""
  }

  function limpiarCamposDesactivados(payload, aplicarBoletera, aplicarCctv, aplicarTpv, aplicarConectividad, aplicarTableta, aplicarInteligente) {
    if (!aplicarBoletera || !payload.tiene_boletera) {
      payload.boletera_sistema_operativo = null
      payload.boletera_sistema_operativo_otro = null
      payload.boletera_punto_venta = null
      payload.boletera_contador_delantero = false
      payload.boletera_contador_trasero = false
      payload.boletera_gps = null
    }
    if (!aplicarTpv || !payload.tiene_tpv) payload.tpv_numero_serie = null
    if (!aplicarCctv || !payload.tiene_cctv) {
      for (const campo of ["cctv_dvr", "cctv_dvr_otro", "cctv_canales_analogicos", "cctv_canales_ip", "cctv_tipo_bandeja_id", "cctv_tipo_almacenamiento", "cctv_operadora", "cctv_icc", "cctv_modo_conexion"]) payload[campo] = null
      for (const campo of ["cctv_disco_25_intercambiable", "cctv_disco_35_fijo", "cctv_ssd_25", "cctv_microsd", "cctv_modulo_sim", "cctv_sim_instalada"]) payload[campo] = false
    } else {
      const tipoAlmacenamiento = inventarioTipoAlmacenamiento(payload)
      payload.cctv_tipo_almacenamiento = tipoAlmacenamiento || null
      if (tipoAlmacenamiento) {
        payload.cctv_disco_25_intercambiable = tipoAlmacenamiento === inventarioTiposAlmacenamiento[0]
        payload.cctv_ssd_25 = tipoAlmacenamiento === inventarioTiposAlmacenamiento[1]
        payload.cctv_disco_35_fijo = tipoAlmacenamiento === inventarioTiposAlmacenamiento[2]
      }
      const microSdPermitida = [inventarioTiposAlmacenamiento[2], inventarioTiposAlmacenamiento[3]].includes(tipoAlmacenamiento)
        || payload.cctv_dvr === "DASHCAM MERIVA DUAL"
      if (!microSdPermitida) payload.cctv_microsd = false
      if (!payload.cctv_modulo_sim) {
        payload.cctv_sim_instalada = false
        payload.cctv_operadora = null
        payload.cctv_icc = null
        payload.cctv_modo_conexion = null
      } else if (payload.cctv_sim_instalada) {
        payload.cctv_modo_conexion = null
      } else {
        payload.cctv_operadora = null
        payload.cctv_icc = null
      }
    }
    if (!aplicarConectividad || !payload.conectividad_tiene_modem) {
      payload.conectividad_modelo_modem_id = null
      payload.conectividad_serie_modem = null
    }
    if (!aplicarConectividad || !payload.conectividad_tiene_sim) {
      payload.conectividad_operadora = null
      payload.conectividad_icc = null
    }
    if (!aplicarTableta || !payload.tiene_tablet) {
      payload.tablet_numero_serie = null
      payload.tablet_tiene_sim = false
      payload.tablet_operadora = null
      payload.tablet_icc = null
    } else if (!payload.tablet_tiene_sim) {
      payload.tablet_operadora = null
      payload.tablet_icc = null
    }
    if (!aplicarInteligente || !payload.tiene_camara_inteligente) {
      payload.camara_inteligente_marca = null
      payload.camara_inteligente_marca_otro = null
      payload.camara_inteligente_modo = null
    }
    return payload
  }

  async function guardarInventario() {
    const mensajeValidacion = validarRegistro()
    if (mensajeValidacion) return setError(mensajeValidacion)
    if (!puedeEditar) return setError("No tienes permiso para editar unidades fuera de tus bases.")
    setGuardando(true)
    setError("")
    setAviso("")
    try {
      const servicio = inventarioNormalizarTexto(busSeleccionado.servicio)
      const regular = ["regular", "suburbano"].includes(servicio)
      const plus = ["plus", "plus doble piso"].includes(servicio)
      const payload = limpiarCamposDesactivados(
        { ...registro },
        regular,
        regular || plus,
        regular,
        regular || plus,
        plus,
        plus,
      )
      const camarasPayload = (regular || plus) && payload.tiene_cctv ? camaras : []
      for (const campo of ["cctv_canales_analogicos", "cctv_canales_ip"]) if (payload[campo] === "") payload[campo] = null
      for (const campo of ["boletera_sistema_operativo", "boletera_sistema_operativo_otro", "boletera_punto_venta", "boletera_gps", "cctv_dvr", "cctv_dvr_otro", "cctv_tipo_almacenamiento", "cctv_modo_conexion", "tpv_numero_serie", "conectividad_serie_modem", "cctv_operadora", "conectividad_operadora", "tablet_numero_serie", "tablet_operadora", "camara_inteligente_marca", "camara_inteligente_marca_otro", "camara_inteligente_modo"]) {
        if (payload[campo] === "") payload[campo] = null
      }
      const { data: fila, error: guardarError } = await H.from("inventario_equipos_instalados")
        .upsert(payload, { onConflict: "autobus_id" })
        .select("id,autobus_id")
        .single()
      if (guardarError) throw guardarError

      const idsActuales = new Set(camarasPayload.map((camara) => camara.catalogo_id))
      const idsPrevios = new Set(camarasGuardadas.map((camara) => camara.catalogo_id))
      const quitar = [...idsPrevios].filter((id) => !idsActuales.has(id))
      if (quitar.length) {
        const { error: quitarError } = await H.from("inventario_equipos_camaras")
          .delete()
          .eq("inventario_id", fila.id)
          .in("catalogo_id", quitar)
        if (quitarError) throw quitarError
      }
      for (const camara of camarasPayload) {
        const previa = camarasGuardadas.find((item) => item.catalogo_id === camara.catalogo_id)
        if (previa && (previa.otro_texto ?? "") === (camara.otro_texto ?? "")) continue
        const { error: camaraError } = await H.from("inventario_equipos_camaras").upsert({
          inventario_id: fila.id,
          catalogo_id: camara.catalogo_id,
          otro_texto: camara.otro_texto.trim() || null,
        }, { onConflict: "inventario_id,catalogo_id" })
        if (camaraError) throw camaraError
      }

      setRegistro((actual) => ({ ...actual, ...payload, id: fila.id }))
      setCamaras(camarasPayload.map((camara) => ({ ...camara })))
      setCamarasGuardadas(camarasPayload.map((camara) => ({ ...camara })))
      setInventarios((actual) => actual.some((item) => item.autobus_id === fila.autobus_id)
        ? actual.map((item) => item.autobus_id === fila.autobus_id ? { ...item, ...payload, id: fila.id } : item)
        : [...actual, { ...payload, id: fila.id }])
      setCamarasInventario((actual) => [
        ...actual.filter((camara) => camara.inventario_id !== fila.id),
        ...camarasPayload.map((camara) => ({ inventario_id: fila.id, catalogo_id: camara.catalogo_id, otro_texto: camara.otro_texto.trim() || null })),
      ])
      if (puedeVerHistorial) {
        const { data: eventos, error: historialError } = await H.from("historial_inventario_equipos")
          .select("id,evento,detalle,usuario_id,usuario_nombre,base,created_at")
          .eq("inventario_id", fila.id)
          .order("created_at", { ascending: false })
          .limit(50)
        if (historialError) throw historialError
        setHistorial(eventos ?? [])
      }
      if (puedeVerCatalogoSims) {
        const { data: eventosSim, error: historialSimsError } = await H.from("historial_sims_inventario")
          .select("id,inventario_id,autobus_id,ubicacion,evento,detalle,usuario_id,usuario_nombre,base,created_at")
          .order("created_at", { ascending: false })
          .limit(200)
        if (historialSimsError) throw historialSimsError
        setHistorialSims(eventosSim ?? [])
      }
      setAviso("Inventario guardado.")
    } catch (guardarError) {
      setError(guardarError.message || "No se pudo guardar el inventario.")
    } finally {
      setGuardando(false)
    }
  }

  async function guardarCatalogo(tabla, valores, limpiar) {
    const nombre = valores.trim()
    if (!nombre) return setError("Escribe el nombre del nuevo elemento.")
    try {
      const { error: catalogoError } = await H.from(tabla).insert(nombre ? { nombre, ...(tabla === "inventario_catalogos_cctv" ? { categoria: limpiar } : {}) } : {})
      if (catalogoError) throw catalogoError
      await cargarCatalogos()
      limpiar === "posicion_camara" ? setNuevaPosicion("") : limpiar === "tipo_bandeja" ? setNuevoTipoBandeja("") : setNuevoModelo("")
      setAviso("Catálogo actualizado.")
      setError("")
    } catch (catalogoError) {
      setError(catalogoError.message || "No se pudo actualizar el catálogo.")
    }
  }

  async function alternarCatalogo(tabla, elemento) {
    const { error: catalogoError } = await H.from(tabla).update({ activo: !elemento.activo }).eq("id", elemento.id)
    if (catalogoError) return setError(catalogoError.message)
    await cargarCatalogos()
  }

  const textoBuscado = inventarioNormalizarTexto(textoAutobus)
  const autobusesFiltrados = autobuses
    .filter((autobus) => inventarioNormalizarTexto(`${autobus.autobus} ${autobus.base} ${autobus.servicio}`).includes(textoBuscado))
    .slice(0, 20)
  const servicio = inventarioNormalizarTexto(busSeleccionado?.servicio)
  const aplicaRegular = ["regular", "suburbano"].includes(servicio)
  const aplicaPlus = ["plus", "plus doble piso"].includes(servicio)
  const aplicaCctv = aplicaRegular || aplicaPlus
  const catalogoPosiciones = catalogoCctv
    .filter((item) => item.categoria === "posicion_camara")
    .sort((a, b) => inventarioOrdenCamara(a.nombre) - inventarioOrdenCamara(b.nombre))
  const catalogoBandejas = catalogoCctv.filter((item) => item.categoria === "tipo_bandeja")
  const tipoAlmacenamiento = inventarioTipoAlmacenamiento(registro)
  const microSdAplica = [inventarioTiposAlmacenamiento[2], inventarioTiposAlmacenamiento[3]].includes(tipoAlmacenamiento)
    || registro?.cctv_dvr === "DASHCAM MERIVA DUAL"
  const puedeAdministrarCatalogos = esJefe
  const autobusesVista = ["jefe", "gerente"].includes(nivel) ? autobuses : autobusesBase
  const inventarioPorAutobus = new Map(inventarios.map((item) => [item.autobus_id, item]))
  const catalogoCctvPorId = new Map(catalogoCctv.map((item) => [item.id, item]))
  const camarasPorInventario = new Map()
  for (const camara of camarasInventario) {
    if (!camarasPorInventario.has(camara.inventario_id)) camarasPorInventario.set(camara.inventario_id, [])
    camarasPorInventario.get(camara.inventario_id).push(camara)
  }

  const opcionesVista = [
    { value: "todos", label: "Todos los autobuses" },
    { value: "boletera", label: "Autobuses con Boletera" },
    { value: "cctv", label: "Autobuses con CCTV" },
    { value: "tpv", label: "Autobuses con TPV" },
    { value: "conectividad", label: "Autobuses con Conectividad" },
    { value: "bitacora", label: "Autobuses con Bitácora Electrónica" },
    { value: "camara_inteligente", label: "Autobuses con Cámara Inteligente" },
    ...(puedeVerCatalogoSims ? [{ value: "sims", label: "Catálogo de SIMs" }] : []),
  ]

  const coloresEquipamiento = {
    Boletera: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
    CCTV: { backgroundColor: "#dcfce7", color: "#15803d" },
    TPV: { backgroundColor: "#ffedd5", color: "#c2410c" },
    Conectividad: { backgroundColor: "#f3e8ff", color: "#7e22ce" },
    "Bitácora": { backgroundColor: "#e5e7eb", color: "#4b5563" },
    "Cámara inteligente": { backgroundColor: "#cffafe", color: "#0e7490" },
  }

  const filasSims = puedeVerCatalogoSims ? autobuses.flatMap((autobus) => {
    const item = inventarioPorAutobus.get(autobus.id);
    if (!item) return []
    const sims = []
    if (item.cctv_modulo_sim && item.cctv_sim_instalada) sims.push({ autobus, item, ubicacion: "CCTV", icc: item.cctv_icc, operadora: item.cctv_operadora })
    if (item.conectividad_tiene_sim) sims.push({ autobus, item, ubicacion: "Conectividad", icc: item.conectividad_icc, operadora: item.conectividad_operadora })
    if (item.tablet_tiene_sim) sims.push({ autobus, item, ubicacion: "Bitácora Electrónica", icc: item.tablet_icc, operadora: item.tablet_operadora })
    return sims
  }) : []

  const columnasPorVista = {
    todos: ["Autobús", "Base", "Servicio", "Rol", "Estatus", "Equipamiento"],
    boletera: ["Autobús", "Base", "Servicio", "Rol", "Estatus", "Sistema operativo", "Punto de venta", "Contador delantero", "Contador trasero", "GPS"],
    cctv: ["Autobús", "Base", "Servicio", "Rol", "Estatus", "DVR", "Canales analógicos", "Canales IP", "Cámaras", "Almacenamiento", "MicroSD", "Bandeja", "Acceso remoto", "Operadora", "ICC"],
    tpv: ["Autobús", "Base", "Servicio", "Rol", "Estatus", "Número de serie TPV"],
    conectividad: ["Autobús", "Base", "Servicio", "Rol", "Estatus", "Módem", "Modelo", "Serie módem", "SIM", "Operadora", "ICC"],
    bitacora: ["Autobús", "Base", "Servicio", "Rol", "Estatus", "Tablet", "Serie", "SIM", "Operadora", "ICC"],
    camara_inteligente: ["Autobús", "Base", "Servicio", "Rol", "Estatus", "Marca", "Modo"],
    sims: ["ICC", "Operadora", "Autobús", "Estatus del autobús", "Ubicación", "Base", "Servicio"],
  }

  const filasVista = categoriaVista === "sims"
    ? filasSims.map(({ autobus, ubicacion, icc, operadora }) => ({
      _autobusId: autobus.id,
        ICC: icc || "",
        Operadora: operadora || "",
        Autobús: autobus.autobus,
        "Estatus del autobús": autobus.estatus || "",
        Ubicación: ubicacion,
        Base: autobus.base || "",
        Servicio: autobus.servicio || "",
      }))
    : autobusesVista.flatMap((autobus) => {
        const item = inventarioPorAutobus.get(autobus.id)
        const activo = categoriaVista === "boletera" ? item?.tiene_boletera
          : categoriaVista === "cctv" ? item?.tiene_cctv
            : categoriaVista === "tpv" ? item?.tiene_tpv
              : categoriaVista === "conectividad" ? item?.conectividad_tiene_modem || item?.conectividad_tiene_sim
                : categoriaVista === "bitacora" ? item?.tiene_tablet
                  : categoriaVista === "camara_inteligente" ? item?.tiene_camara_inteligente
                    : true
        if (!activo) return []
        const camarasTexto = item ? (camarasPorInventario.get(item.id) ?? []).map((camara) => {
          const nombre = catalogoCctvPorId.get(camara.catalogo_id)?.nombre
          return nombre === "Otro" && camara.otro_texto ? `Otro: ${camara.otro_texto}` : inventarioNombreCamara(nombre || "")
        }).join(", ") : ""
        const base = {
          Autobús: autobus.autobus,
          Base: autobus.base || "",
          Servicio: autobus.servicio || "",
          Rol: autobus.rol || "",
          Estatus: autobus.estatus || "",
        }
        const equipamiento = [
          item?.tiene_boletera && "Boletera",
          item?.tiene_cctv && "CCTV",
          item?.tiene_tpv && "TPV",
          (item?.conectividad_tiene_modem || item?.conectividad_tiene_sim) && "Conectividad",
          item?.tiene_tablet && "Bitácora",
          item?.tiene_camara_inteligente && "Cámara inteligente",
        ].filter(Boolean)
        const detalle = categoriaVista === "boletera" ? {
          "Sistema operativo": item.boletera_sistema_operativo === "Otro" ? item.boletera_sistema_operativo_otro || "Otro" : item.boletera_sistema_operativo || "",
          "Punto de venta": item.boletera_punto_venta || "",
          "Contador delantero": item.boletera_contador_delantero ? "Sí" : "No",
          "Contador trasero": item.boletera_contador_trasero ? "Sí" : "No",
          GPS: item.boletera_gps || "",
        } : categoriaVista === "cctv" ? {
          DVR: item.cctv_dvr === "Otro" ? item.cctv_dvr_otro || "Otro" : item.cctv_dvr || "",
          "Canales analógicos": item.cctv_canales_analogicos ?? "",
          "Canales IP": item.cctv_canales_ip ?? "",
          Cámaras: camarasTexto,
          Almacenamiento: inventarioTipoAlmacenamiento(item),
          MicroSD: item.cctv_microsd ? "Sí" : "No",
          Bandeja: catalogoCctvPorId.get(item.cctv_tipo_bandeja_id)?.nombre || "",
          "Acceso remoto": item.cctv_modulo_sim ? "Módulo SIM" : "No",
          Operadora: item.cctv_sim_instalada ? item.cctv_operadora || "" : "",
          ICC: item.cctv_sim_instalada ? item.cctv_icc || "" : "",
        } : categoriaVista === "tpv" ? {
          "Número de serie TPV": item.tpv_numero_serie || "",
        } : categoriaVista === "conectividad" ? {
          Módem: item.conectividad_tiene_modem ? "Sí" : "No",
          Modelo: modelosModem.find((modelo) => modelo.id === item.conectividad_modelo_modem_id)?.nombre || "",
          "Serie módem": item.conectividad_serie_modem || "",
          SIM: item.conectividad_tiene_sim ? "Sí" : "No",
          Operadora: item.conectividad_tiene_sim ? item.conectividad_operadora || "" : "",
          ICC: item.conectividad_tiene_sim ? item.conectividad_icc || "" : "",
        } : categoriaVista === "bitacora" ? {
          Tablet: item.tiene_tablet ? "Sí" : "No",
          Serie: item.tablet_numero_serie || "",
          SIM: item.tablet_tiene_sim ? "Sí" : "No",
          Operadora: item.tablet_tiene_sim ? item.tablet_operadora || "" : "",
          ICC: item.tablet_tiene_sim ? item.tablet_icc || "" : "",
        } : categoriaVista === "camara_inteligente" ? {
          Marca: item.camara_inteligente_marca === "Otro" ? item.camara_inteligente_marca_otro || "Otro" : item.camara_inteligente_marca || "",
          Modo: item.camara_inteligente_modo || "",
        } : {
          Equipamiento: equipamiento.join(", ") || "Sin equipos registrados",
        }
        return [{ _autobusId: autobus.id, _equipamiento: equipamiento, ...base, ...detalle }]
      })

  const textoTabla = inventarioNormalizarTexto(busquedaVista)
  const filasVistaFiltradas = filasVista.filter((fila) => inventarioNormalizarTexto(fila.Autobús ?? "").includes(textoTabla))
  const columnasVista = columnasPorVista[categoriaVista] ?? columnasPorVista.todos

  function campo(etiqueta, key, options = {}) {
    return (0, U.jsx)(InventarioCampo, {
      etiqueta,
      valor: key === "cctv_tipo_almacenamiento" ? tipoAlmacenamiento : registro?.[key],
      tipo: options.tipo ?? "text",
      opciones: options.opciones ?? [],
      placeholder: options.placeholder ?? "",
      min: options.min,
      disabled: !puedeEditar,
      onChange: (valor) => cambiar(key, valor),
    }, key)
  }

  function check(etiqueta, key, destacado = false, despuesDeCambiar = null) {
    return (0, U.jsx)(InventarioCheck, {
      etiqueta,
      valor: registro?.[key],
      destacado,
      disabled: !puedeEditar,
      onChange: (valor) => {
        cambiar(key, valor)
        despuesDeCambiar?.(valor)
      },
    }, key)
  }

  function campoOperadora(etiqueta, key) {
    return campo(etiqueta, key, { tipo: "select", opciones: inventarioOperadoras.map((operadora) => ({ value: operadora, label: operadora })) })
  }

  function exportarVistaActual() {
    if (filasVistaFiltradas.length === 0) return setError("La vista actual no tiene datos para exportar.")
    const escapar = (valor) => `"${String(valor ?? "").replaceAll('"', '""')}"`
    const contenido = [columnasVista, ...filasVistaFiltradas.map((fila) => columnasVista.map((columna) => fila[columna] ?? ""))]
      .map((fila) => fila.map(escapar).join(","))
      .join("\r\n")
    const blob = new Blob(["\ufeff", contenido], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = `inventario_${categoriaVista}_${Date.now()}.csv`
    enlace.click()
    URL.revokeObjectURL(url)
  }

  function administrarLista(titulo, categoria, items, nuevo, setNuevo) {
    const tabla = categoria === "modelo_modem" ? "inventario_modelos_modem" : "inventario_catalogos_cctv"
    return (0, U.jsxs)("div", {
      className: "space-y-2",
      children: [
        (0, U.jsx)("h4", { className: "text-sm font-semibold", children: titulo }),
        items.map((item) => (0, U.jsxs)("div", {
          className: "flex items-center justify-between gap-3 border-b border-[var(--color-border)] py-2",
          children: [
            (0, U.jsx)("span", { className: "text-sm", children: categoria === "modelo_modem" ? item.nombre : inventarioNombreCamara(item.nombre) }),
            (0, U.jsx)("button", {
              type: "button",
              onClick: () => alternarCatalogo(tabla, item),
              className: "text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
              children: item.activo ? "Desactivar" : "Activar",
            }),
          ],
        }, item.id)),
        (0, U.jsxs)("div", {
          className: "flex gap-2",
          children: [
            (0, U.jsx)("input", { value: nuevo, onChange: (evento) => setNuevo(evento.target.value), placeholder: `Nuevo elemento de ${titulo.toLowerCase()}`, className: "min-w-0 flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" }),
            (0, U.jsx)("button", {
              type: "button",
              onClick: () => guardarCatalogo(tabla, nuevo, categoria === "modelo_modem" ? categoria : categoria),
              className: "rounded-lg bg-[var(--color-navy)] px-3 py-2 text-sm font-medium text-white",
              children: "Agregar",
            }),
          ],
        }),
      ],
    })
  }

  const modeloActualInactivo = registro?.conectividad_modelo_modem_id && modelosModem.some((modelo) => modelo.id === registro.conectividad_modelo_modem_id && !modelo.activo)
  const bandejaActualInactiva = registro?.cctv_tipo_bandeja_id && catalogoBandejas.some((bandeja) => bandeja.id === registro.cctv_tipo_bandeja_id && !bandeja.activo)
  const camarasActivas = catalogoPosiciones.filter((item) => item.activo || camaras.some((camara) => camara.catalogo_id === item.id))
  const modelosActivos = modelosModem.filter((item) => item.activo || item.id === registro?.conectividad_modelo_modem_id)
  const bandejasActivas = catalogoBandejas.filter((item) => item.activo || item.id === registro?.cctv_tipo_bandeja_id)

  if (nivel === "analista") {
    return (0, U.jsx)("p", {
      role: "alert",
      className: "rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]",
      children: "Tu nivel no tiene acceso al módulo Inventario.",
    })
  }

  return (0, U.jsxs)("div", {
    className: "space-y-4 pb-8",
    children: [
      (0, U.jsxs)("div", {
        className: "flex flex-wrap items-start justify-between gap-3",
        children: [
          (0, U.jsxs)("div", {
            children: [
              (0, U.jsx)("h2", { className: "font-[var(--font-display)] text-xl font-semibold text-[var(--color-text)]", children: "Inventario de equipos instalados" }),
              (0, U.jsx)("p", { className: "mt-1 text-sm text-[var(--color-text-muted)]", children: "Equipamiento registrado por unidad de flota." }),
            ],
          }),
          puedeAdministrarCatalogos && (0, U.jsx)("button", {
            type: "button",
            onClick: () => setMostrarCatalogos((actual) => !actual),
            className: "rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium",
            children: mostrarCatalogos ? "Cerrar catálogos" : "Administrar catálogos",
          }),
        ],
      }),
      error && (0, U.jsx)("p", { role: "alert", className: "rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]", children: error }),
      aviso && (0, U.jsx)("p", { role: "status", className: "rounded-lg bg-[var(--color-teal-bg)] px-3 py-2 text-sm text-[var(--color-teal)]", children: aviso }),
      mostrarCatalogos && puedeAdministrarCatalogos && (0, U.jsxs)("section", {
        className: "grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:grid-cols-3",
        children: [
          administrarLista("Modelos de módem", "modelo_modem", modelosModem, nuevoModelo, setNuevoModelo),
          administrarLista("Posiciones de cámara", "posicion_camara", catalogoPosiciones, nuevaPosicion, setNuevaPosicion),
          administrarLista("Tipos de bandeja", "tipo_bandeja", catalogoBandejas, nuevoTipoBandeja, setNuevoTipoBandeja),
        ],
      }),
      (0, U.jsxs)("section", {
        className: "space-y-3",
        children: [
          (0, U.jsxs)("div", { className: "flex flex-wrap items-end justify-between gap-3", children: [
            (0, U.jsxs)("label", { className: "block min-w-[240px] text-sm font-medium", children: [
              (0, U.jsx)("span", { className: "mb-1 block", children: "Vista" }),
              (0, U.jsx)("select", {
                value: categoriaVista,
                onChange: (evento) => setCategoriaVista(evento.target.value),
                className: "w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm",
                children: opcionesVista.map((opcion) => (0, U.jsx)("option", { value: opcion.value, children: opcion.label }, opcion.value)),
              }),
            ] }),
            (0, U.jsxs)("div", { className: "flex items-end gap-2", children: [
              (0, U.jsxs)("div", { className: "relative", children: [
                (0, U.jsx)("label", { className: "mb-1 block text-sm font-medium", htmlFor: "inventario-filtro-autobus", children: "Buscar autobús" }),
                (0, U.jsx)("input", {
                  id: "inventario-filtro-autobus",
                  value: busquedaVista,
                  onFocus: () => busquedaVista.trim() && setSelectorAbierto(true),
                  onChange: (evento) => {
                    const valor = evento.target.value
                    setBusquedaVista(valor)
                    setTextoAutobus(valor)
                    setSelectorAbierto(Boolean(valor.trim()))
                    setBusSeleccionado(null)
                    setRegistro(null)
                  },
                  onKeyDown: (evento) => evento.key === "Enter" && autobusesFiltrados.length === 1 && seleccionarAutobus(autobusesFiltrados[0]),
                  placeholder: "Número de autobús, cualquier base",
                  className: "w-64 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm",
                }),
                selectorAbierto && busquedaVista.trim() && (0, U.jsx)("div", {
                  className: "absolute right-0 z-20 mt-1 max-h-64 w-80 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-white shadow-lg",
                  children: autobusesFiltrados.map((autobus) => (0, U.jsxs)("button", {
                    type: "button",
                    onClick: () => seleccionarAutobus(autobus),
                    className: "block w-full border-b border-[var(--color-border)] px-3 py-2 text-left last:border-0 hover:bg-[var(--color-bg)]",
                    children: [
                      (0, U.jsx)("span", { className: "tabular font-medium", children: autobus.autobus }),
                      (0, U.jsxs)("span", { className: "ml-2 text-xs text-[var(--color-text-muted)]", children: [autobus.base || "Sin base", " · ", autobus.servicio || "Sin servicio"] }),
                    ],
                  }, autobus.id)),
                }),
              ] }),
              (0, U.jsx)("button", {
                type: "button",
                onClick: exportarVistaActual,
                className: "rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium",
                children: "Exportar vista CSV",
              }),
            ] }),
          ] }),
          (0, U.jsx)("div", { className: "overflow-x-auto rounded-lg border border-[var(--color-border)]", children: (0, U.jsxs)("table", {
            className: "w-full min-w-max text-left text-sm",
            children: [
              (0, U.jsx)("thead", { className: "bg-[var(--color-bg)] text-xs text-[var(--color-text-muted)]", children: (0, U.jsx)("tr", { children: columnasVista.map((columna) => (0, U.jsx)("th", { className: "whitespace-nowrap px-3 py-2.5 font-medium", children: columna }, columna)) }) }),
              (0, U.jsx)("tbody", { children: filasVistaFiltradas.length
                ? filasVistaFiltradas.map((fila, index) => (0, U.jsx)("tr", {
                    className: "border-t border-[var(--color-border)]",
                    children: columnasVista.map((columna) => (0, U.jsx)("td", {
                      className: "max-w-[280px] px-3 py-2.5 align-top",
                      children: columna === "Autobús"
                        ? (0, U.jsx)("button", { type: "button", title: "Consultar inventario del autobús", onClick: () => { const autobus = autobuses.find((item) => item.id === fila._autobusId); if (autobus) seleccionarAutobus(autobus) }, className: "tabular cursor-pointer font-medium text-[var(--color-teal)] hover:underline", children: fila[columna] })
                        : columna === "Equipamiento"
                          ? fila._equipamiento?.length
                            ? (0, U.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: "4px" }, children: fila._equipamiento.map((sistema) => (0, U.jsx)("span", { style: { ...coloresEquipamiento[sistema], display: "inline-flex", alignItems: "center", borderRadius: "9999px", padding: "2px 8px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }, children: sistema }, sistema)) })
                            : (0, U.jsx)("span", { style: { backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)", display: "inline-flex", alignItems: "center", borderRadius: "9999px", padding: "3px 9px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }, children: "Sin equipos registrados" })
                          : fila[columna] || "—",
                    }, `${index}-${columna}`)),
                  }, `${fila._autobusId}-${index}`))
                : (0, U.jsx)("tr", { children: (0, U.jsx)("td", { colSpan: columnasVista.length, className: "px-3 py-8 text-center text-sm text-[var(--color-text-muted)]", children: "No hay autobuses para esta vista y filtro." }) }),
              }),
            ],
          }) }),
          categoriaVista === "sims" && puedeVerCatalogoSims && (0, U.jsx)("div", { className: "overflow-x-auto rounded-lg border border-[var(--color-border)]", children: (0, U.jsxs)("div", {
            className: "p-4",
            children: [
              (0, U.jsx)("h3", { className: "mb-2 text-sm font-semibold", children: "Historial específico de SIMs" }),
              historialSims.length
                ? (0, U.jsx)("ul", { className: "divide-y divide-[var(--color-border)]", children: historialSims.filter((evento) => filasVistaFiltradas.some((fila) => fila._autobusId === evento.autobus_id)).map((evento) => (0, U.jsxs)("li", { className: "grid gap-1 py-2 text-sm sm:grid-cols-[1fr_auto]", children: [
                    (0, U.jsxs)("span", { children: [`${evento.evento} · ${evento.ubicacion} · ${evento.usuario_nombre} · Base: ${evento.base} · `, JSON.stringify(evento.detalle)] }),
                    (0, U.jsx)("time", { className: "text-xs text-[var(--color-text-muted)]", dateTime: evento.created_at, children: new Date(evento.created_at).toLocaleString("es-MX") }),
                  ] }, evento.id)) })
                : (0, U.jsx)("p", { className: "text-sm text-[var(--color-text-muted)]", children: "Sin cambios de SIM registrados." }),
            ],
          }) }),
        ],
      }),
      cargando && (0, U.jsx)("p", { className: "py-6 text-center text-sm text-[var(--color-text-muted)]", children: "Cargando inventario…" }),
      busSeleccionado && registro && !cargando && (0, U.jsxs)(U.Fragment, { children: [
        (0, U.jsx)("button", { type: "button", "aria-label": "Cerrar detalle de autobús", onClick: cerrarDetalle, style: { position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.45)" }, className: "cursor-default" }),
        (0, U.jsxs)("div", {
          role: "dialog",
          "aria-modal": true,
          "aria-labelledby": "inventario-modal-titulo",
          tabIndex: -1,
          onKeyDown: (evento) => evento.key === "Escape" && cerrarDetalle(),
          style: { position: "fixed", left: "50%", top: "50%", zIndex: 50, width: "min(96vw, 72rem)", maxHeight: "92vh", transform: "translate(-50%, -50%)" },
          className: "overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-2xl sm:p-6",
          children: [
        (0, U.jsxs)("div", { className: "space-y-4", children: [
          (0, U.jsxs)("div", {
            className: "flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3",
            children: [
              (0, U.jsxs)("div", { children: [
                (0, U.jsx)("h3", { id: "inventario-modal-titulo", className: "text-base font-semibold", children: busSeleccionado.autobus }),
                (0, U.jsxs)("p", { className: "text-sm text-[var(--color-text-muted)]", children: [busSeleccionado.base || "Sin base", " · Servicio: ", busSeleccionado.servicio || "Sin especificar"] }),
              ] }),
              (0, U.jsxs)("div", { className: "flex items-center gap-2", children: [
                (0, U.jsx)("span", { className: `rounded-full px-2.5 py-1 text-xs font-medium ${puedeEditar ? "bg-[var(--color-teal-bg)] text-[var(--color-teal)]" : "bg-gray-100 text-gray-600"}`, children: puedeEditar ? "Edición permitida" : "Solo consulta" }),
                (0, U.jsx)("button", { type: "button", onClick: cerrarDetalle, className: "rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium", children: "Cerrar" }),
              ] }),
            ],
          }),
          !aplicaRegular && !aplicaPlus && (0, U.jsx)("p", { className: "rounded-lg bg-[var(--color-amber-bg)] px-3 py-2 text-sm text-[var(--color-amber)]", children: "El servicio de esta unidad no corresponde a las categorías configuradas para el inventario." }),
          aplicaRegular && (0, U.jsx)(InventarioSeccion, { titulo: "Boletera", children: (0, U.jsxs)("div", { className: "space-y-3", children: [
            check("Tiene boletera", "tiene_boletera"),
            registro.tiene_boletera && (0, U.jsxs)("div", { className: "grid gap-3 border-l-2 border-[var(--color-border)] pl-4 sm:grid-cols-2", children: [
              campo("Sistema operativo", "boletera_sistema_operativo", { tipo: "select", opciones: ["Windows", "Ubuntu", "Debian", "Otro"].map((value) => ({ value, label: value })) }),
              registro.boletera_sistema_operativo === "Otro" && campo("Especifica el sistema operativo", "boletera_sistema_operativo_otro"),
              campo("Punto de venta", "boletera_punto_venta", { tipo: "select", opciones: ["MOVILDATA", "BOLABO"].map((value) => ({ value, label: value })) }),
              (0, U.jsxs)("div", { className: "sm:col-span-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3", children: [
                (0, U.jsx)("p", { className: "mb-1 text-sm font-semibold text-[var(--color-text)]", children: "Contadores de pasajeros" }),
                (0, U.jsxs)("div", { className: "grid gap-2 sm:grid-cols-2", children: [
                  check("Contador delantero", "boletera_contador_delantero", true),
                  check("Contador trasero", "boletera_contador_trasero", true),
                ] }),
              ] }),
              campo("GPS", "boletera_gps", { tipo: "select", opciones: ["Interfaz", "Módem"].map((value) => ({ value, label: value })) }),
            ] }),
          ] }) }),
          aplicaCctv && (0, U.jsx)(InventarioSeccion, { titulo: "CCTV", children: (0, U.jsxs)("div", { className: "space-y-3", children: [
            check("Tiene CCTV", "tiene_cctv"),
            registro.tiene_cctv && (0, U.jsxs)("div", { className: "space-y-4 border-l-2 border-[var(--color-border)] pl-4", children: [
              (0, U.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2", children: [
                campo("DVR", "cctv_dvr", { tipo: "select", opciones: ["MERIVA", "DASHCAM MERIVA DUAL", "HIKVISION", "Otro"].map((value) => ({ value, label: value })) }),
                registro.cctv_dvr === "Otro" && campo("Especifica el DVR", "cctv_dvr_otro"),
                campo("Canales analógicos", "cctv_canales_analogicos", { tipo: "number", min: 0 }),
                campo("Canales IP", "cctv_canales_ip", { tipo: "number", min: 0 }),
                campo("Tipo de bandeja", "cctv_tipo_bandeja_id", { tipo: "select", opciones: bandejasActivas.map((item) => ({ value: item.id, label: `${item.nombre}${item.activo ? "" : " (inactivo)"}` })) }),
              ] }),
              (0, U.jsxs)("div", { children: [
                (0, U.jsx)("p", { className: "mb-1 text-sm font-medium", children: "Cámaras instaladas" }),
                (0, U.jsx)("div", { className: "grid gap-x-4 sm:grid-cols-2", children: camarasActivas.map((item) => (0, U.jsxs)("div", { children: [
                  (0, U.jsx)(InventarioCheck, { etiqueta: inventarioNombreCamara(item.nombre), valor: camaras.some((camara) => camara.catalogo_id === item.id), disabled: !puedeEditar, onChange: (marcada) => cambiarCamara(item.id, marcada) }),
                  item.nombre === "Otro" && camaras.some((camara) => camara.catalogo_id === item.id) && (0, U.jsx)("input", { value: camaras.find((camara) => camara.catalogo_id === item.id)?.otro_texto ?? "", disabled: !puedeEditar, onChange: (evento) => cambiarTextoOtro(item.id, evento.target.value), placeholder: "Especifica la posición", className: "mb-2 ml-6 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" }),
                ] }, item.id)) }),
              ] }),
              (0, U.jsxs)("div", { className: "space-y-2 border-t border-[var(--color-border)] pt-3", children: [
                (0, U.jsx)("h4", { className: "text-sm font-semibold", children: "Tipo de Almacenamiento" }),
                (0, U.jsxs)("div", { className: "grid gap-3 sm:grid-cols-2", children: [
                  campo("Tipo:", "cctv_tipo_almacenamiento", { tipo: "select", opciones: inventarioTiposAlmacenamiento.map((value) => ({ value, label: value })) }),
                  microSdAplica && check("MicroSD como almacenamiento secundario", "cctv_microsd", true),
                ] }),
              ] }),
              (0, U.jsxs)("div", { className: "space-y-2 border-t border-[var(--color-border)] pt-3", children: [
                (0, U.jsx)("h4", { className: "text-sm font-semibold", children: "Acceso Remoto" }),
                check("Módulo SIM", "cctv_modulo_sim", true),
                registro.cctv_modulo_sim && (0, U.jsxs)("div", { className: "grid gap-3 border-l-2 border-[var(--color-border)] pl-4 sm:grid-cols-2", children: [
                  check("Tiene SIM instalada", "cctv_sim_instalada"),
                  registro.cctv_sim_instalada
                    ? (0, U.jsxs)(U.Fragment, { children: [campoOperadora("Operadora", "cctv_operadora"), campo("ICC (19-20 caracteres alfanuméricos)", "cctv_icc")] })
                    : campo("Modo de conexión", "cctv_modo_conexion", { tipo: "select", opciones: ["WIFI", "Ethernet", "Fuera de Línea"].map((value) => ({ value, label: value })) }),
                ] }),
              ] }),
            ] }),
          ] }) }),
          aplicaRegular && (0, U.jsx)(InventarioSeccion, { titulo: "TPV", children: (0, U.jsxs)("div", { className: "space-y-3", children: [check("Tiene TPV", "tiene_tpv"), registro.tiene_tpv && campo("Número de serie", "tpv_numero_serie")] }) }),
          (aplicaRegular || aplicaPlus) && (0, U.jsx)(InventarioSeccion, { titulo: "Conectividad", children: (0, U.jsxs)("div", { className: "space-y-3", children: [
            check("Tiene módem", "conectividad_tiene_modem"),
            registro.conectividad_tiene_modem && check("Tiene SIM", "conectividad_tiene_sim", true),
            registro.conectividad_tiene_modem && (0, U.jsxs)("div", { className: "grid gap-3 border-l-2 border-[var(--color-border)] pl-4 sm:grid-cols-2", children: [
              campo("Modelo del módem", "conectividad_modelo_modem_id", { tipo: "select", opciones: modelosActivos.map((item) => ({ value: item.id, label: `${item.nombre}${item.activo ? "" : " (inactivo)"}` })) }),
              campo("Serie del módem", "conectividad_serie_modem"),
            ] }),
            registro.conectividad_tiene_sim && (0, U.jsxs)("div", { className: "grid gap-3 border-l-2 border-[var(--color-border)] pl-4 sm:grid-cols-2", children: [campoOperadora("Operadora", "conectividad_operadora"), campo("ICC (19-20 caracteres alfanuméricos)", "conectividad_icc")] }),
          ] }) }),
          aplicaPlus && (0, U.jsx)(InventarioSeccion, { titulo: "Bitácora Electrónica", children: (0, U.jsxs)("div", { className: "space-y-3", children: [
            check("Tiene tablet", "tiene_tablet"),
            registro.tiene_tablet && (0, U.jsxs)("div", { className: "grid gap-3 border-l-2 border-[var(--color-border)] pl-4 sm:grid-cols-2", children: [
              campo("Número de serie", "tablet_numero_serie"),
              check("Tiene SIM", "tablet_tiene_sim"),
              registro.tablet_tiene_sim && (0, U.jsxs)(U.Fragment, { children: [campoOperadora("Operadora", "tablet_operadora"), campo("ICC (19-20 caracteres alfanuméricos)", "tablet_icc")] }),
            ] }),
          ] }) }),
          aplicaPlus && (0, U.jsx)(InventarioSeccion, { titulo: "Cámara Inteligente", children: (0, U.jsxs)("div", { className: "space-y-3", children: [
            check("Tiene cámara inteligente", "tiene_camara_inteligente"),
            registro.tiene_camara_inteligente && (0, U.jsxs)("div", { className: "grid gap-3 border-l-2 border-[var(--color-border)] pl-4 sm:grid-cols-2", children: [
              campo("Marca", "camara_inteligente_marca", { tipo: "select", opciones: ["Samsara", "Motive", "Otro"].map((value) => ({ value, label: value })) }),
              registro.camara_inteligente_marca === "Otro" && campo("Especifica la marca", "camara_inteligente_marca_otro"),
              campo("Modo", "camara_inteligente_modo", { tipo: "select", opciones: ["Escucha", "Telemetría"].map((value) => ({ value, label: value })) }),
            ] }),
          ] }) }),
          (aplicaRegular || aplicaPlus) && (0, U.jsx)("button", {
            type: "button",
            disabled: !puedeEditar || guardando,
            onClick: guardarInventario,
            className: "rounded-lg bg-[var(--color-navy)] px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50",
            children: guardando ? "Guardando…" : "Guardar inventario",
          }),
          registro.id && puedeVerHistorial && (0, U.jsxs)(InventarioSeccion, { titulo: "Historial de cambios", children: historial.length
            ? (0, U.jsx)("div", { className: "divide-y divide-[var(--color-border)]", children: historial.map((evento) => (0, U.jsxs)("article", {
                className: "grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto]",
                children: [
                  (0, U.jsxs)("div", { children: [
                    (0, U.jsx)("p", { className: "font-medium", children: evento.evento === "alta" ? "Alta de inventario" : evento.evento === "cambio_camaras" ? "Cambio de cámaras" : "Edición de inventario" }),
                    (0, U.jsx)("p", { className: "text-xs text-[var(--color-text-muted)]", children: `${evento.usuario_nombre || evento.usuario_id || "Usuario desconocido"} · Base: ${evento.base}` }),
                    (0, U.jsx)("p", { className: "mt-1 break-words text-xs text-[var(--color-text-muted)]", children: evento.evento === "cambio_camaras" ? JSON.stringify(evento.detalle) : evento.evento === "alta" ? "Registro inicial capturado" : Object.entries(evento.detalle ?? {}).map(([key, cambio]) => `${key}: ${JSON.stringify(cambio.de)} → ${JSON.stringify(cambio.a)}`).join(" · ") }),
                  ] }),
                  (0, U.jsx)("time", { className: "text-xs text-[var(--color-text-muted)]", dateTime: evento.created_at, children: new Date(evento.created_at).toLocaleString("es-MX") }),
                ],
              }, evento.id)) })
            : (0, U.jsx)("p", { className: "py-3 text-sm text-[var(--color-text-muted)]", children: "Sin cambios registrados." }) }),
        ] }),
          ],
        }),
      ]}),
    ],
  })
}