const bundleUrl = new URL("./index-DQKexbvX.js", import.meta.url)

function kG({ titulo, ayuda, filas, seleccion, alternar, children }) {
  const agrupar = filas.length > 0 && filas.every((fila) => fila.estado === "En Proceso de Extracci\u00f3n")
  const grupos = new Map()

  if (agrupar) {
    for (const fila of filas) {
      const clave = JSON.stringify([fila.numero_reserva ?? "", fila.sociedad ?? ""])
      if (!grupos.has(clave)) grupos.set(clave, [])
      grupos.get(clave).push(fila)
    }
  }

  const renderFila = (fila, grupo = null) =>
    (0, U.jsxs)("label", {
      className: `flex items-center gap-2 text-sm py-1.5 border-b border-[var(--color-border)] last:border-b-0 ${grupo ? "ml-6 pl-3 border-l-2 border-[var(--color-border)]" : ""}`,
      children: [
        (0, U.jsx)("input", {
          type: "checkbox",
          checked: seleccion.includes(fila.id),
          onChange: () => {
            if (!grupo) return alternar(fila.id)
            const marcado = !seleccion.includes(fila.id)
            grupo.forEach((item) => {
              if (seleccion.includes(item.id) !== marcado) alternar(item.id)
            })
          },
        }),
        (0, U.jsx)("span", { className: "tabular font-medium", children: fila.folio }),
        (0, U.jsx)("span", { className: "tabular", children: fila.autobus_numero }),
        (0, U.jsx)("span", { className: "flex-1 truncate", children: fila.catalogo_componentes?.nombre }),
        (0, U.jsxs)("span", {
          className: "text-xs text-[var(--color-text-muted)] whitespace-nowrap",
          children: [fila.base, " \u00b7 ", fila.sociedad],
        }),
      ],
    }, fila.id)

  const lista = agrupar
    ? (0, U.jsx)("div", {
        className: "space-y-3 mb-3",
        children: Array.from(grupos.entries()).map(([clave, items]) =>
          (0, U.jsxs)("div", {
            className: "border-b border-[var(--color-border)] pb-3 last:border-b-0",
            children: [
              (0, U.jsx)("p", {
                className: "text-sm font-semibold",
                children: [
                  "Sociedad: ",
                  items[0].sociedad || "-",
                  " | N\u00famero de reserva: ",
                  items[0].numero_reserva || "Sin reserva asignada",
                ],
              }),
              (0, U.jsxs)("label", {
                className: "mt-1 mb-1 flex items-center gap-2 text-xs text-[var(--color-text-muted)]",
                children: [
                  (0, U.jsx)("input", {
                    type: "checkbox",
                    checked: items.every((item) => seleccion.includes(item.id)),
                    onChange: (event) => {
                      const marcado = event.target.checked
                      items.forEach((item) => {
                        if (seleccion.includes(item.id) !== marcado) alternar(item.id)
                      })
                    },
                  }),
                  (0, U.jsx)("span", { children: "Seleccionar todos los componentes del grupo" }),
                ],
              }),
              items.map((fila) => renderFila(fila, items)),
            ],
          }, clave),
        ),
      })
    : (0, U.jsx)("div", {
        className: "space-y-1 mb-3",
        children: filas.map((fila) => renderFila(fila)),
      })

  return (0, U.jsxs)("div", {
    className: "bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 mb-5",
    children: [
      (0, U.jsx)("h3", { className: "text-sm font-semibold text-[var(--color-text)]", children: titulo }),
      (0, U.jsx)("p", { className: "text-xs text-[var(--color-text-muted)] mb-3", children: ayuda }),
      filas.length === 0
        ? (0, U.jsx)("p", {
            className: "text-sm text-[var(--color-text-muted)] py-4 text-center",
            children: "Sin solicitudes aqu\u00ed.",
          })
        : lista,
      filas.length > 0 && children,
    ],
  })
}

void (async () => {
  let moduloUrl

  try {
    const respuesta = await fetch(bundleUrl)
    if (!respuesta.ok) throw new Error(`No se pudo cargar la aplicaci\u00f3n (${respuesta.status})`)

    let codigo = await respuesta.text()
    const patron = /function kG\(\{titulo:e,ayuda:t,filas:n,seleccion:r,alternar:i,children:a\}\)\{[\s\S]*?\}function AG\(/
    if (!patron.test(codigo)) throw new Error("No se encontr\u00f3 el componente de gesti\u00f3n esperado")

    codigo = codigo.replace(patron, () => `${kG.toString()}function AG(`)

    const urlOriginal = JSON.stringify(bundleUrl.href)
    codigo = codigo.replaceAll(
      "import.meta.resolve?import.meta.resolve(e):new URL(e,import.meta.url).href",
      `new URL(e,${urlOriginal}).href`,
    )
    codigo = codigo.replaceAll("import.meta.url", urlOriginal)
    codigo = codigo.replaceAll("import(e.module)", `import(new URL(e.module,${urlOriginal}).href)`)

    moduloUrl = URL.createObjectURL(new Blob([codigo], { type: "text/javascript" }))
    await import(moduloUrl)
  } catch (error) {
    console.error("Error al iniciar la aplicaci\u00f3n:", error)
    const raiz = document.getElementById("root")
    if (raiz) raiz.textContent = "No se pudo iniciar la aplicaci\u00f3n. Recarga la página o revisa la conexión."
  } finally {
    if (moduloUrl) URL.revokeObjectURL(moduloUrl)
  }
})()