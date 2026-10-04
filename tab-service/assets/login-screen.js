function qc() {
  let { login: autenticar } = Uc()
  let navegar = dt()
  let [clave, setClave] = S.useState("")
  let [password, setPassword] = S.useState("")
  let [error, setError] = S.useState("")
  let [enviando, setEnviando] = S.useState(false)

  async function manejarEnvio(evento) {
    evento.preventDefault()
    setError("")
    setEnviando(true)
    const resultado = await autenticar(clave, password)
    setEnviando(false)
    if (!resultado.ok) {
      setError(resultado.error)
      return
    }
    navegar(resultado.destino === "conductor" ? "/conductor" : "/tecnico", { replace: true })
  }

  return (0, U.jsxs)("main", {
    className: "relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-navy)] px-4 py-10",
    style: {
      backgroundImage: "radial-gradient(ellipse at 18% 22%, rgba(47, 157, 165, 0.24), transparent 38%), radial-gradient(ellipse at 86% 88%, rgba(22, 34, 58, 0.95), transparent 46%)",
    },
    children: [
      (0, U.jsx)("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-[var(--color-teal)]/70" }),
      (0, U.jsxs)("div", { className: "relative w-full max-w-sm", children: [
        (0, U.jsxs)("div", { className: "mb-7 text-center", style: { marginBottom: "2.5rem" }, children: [
          (0, U.jsxs)("div", { className: "mx-auto mb-5", style: { width: 96, height: 96, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", overflow: "hidden", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.10)", boxShadow: "0 0 0 4px rgba(255,255,255,0.08)" }, children: [
            (0, U.jsx)("div", { style: { width: 28, height: 28, marginBottom: 6, borderRadius: "50%", background: "var(--color-teal)" } }),
            (0, U.jsx)("div", { style: { width: 56, height: 40, borderRadius: "28px 28px 0 0", background: "var(--color-teal)" } }),
          ] }),
          (0, U.jsx)("h1", { className: "font-[var(--font-display)] text-2xl font-semibold text-white", children: "Atención a Bordo" }),
          (0, U.jsx)("p", { className: "mt-1 text-sm font-medium text-[var(--color-teal)]", children: "Grupo Herradura - Occidente" }),
        ] }),
        (0, U.jsxs)("form", {
          onSubmit: manejarEnvio,
          className: "space-y-4 rounded-2xl border border-white/15 border-t-2 border-t-[var(--color-teal)] bg-[var(--color-card)] p-6 shadow-xl",
          children: [
            (0, U.jsxs)("div", { children: [
              (0, U.jsx)("label", { htmlFor: "clave", className: "mb-1 block text-sm font-medium text-[var(--color-text)]", children: "Clave de colaborador" }),
              (0, U.jsx)("input", {
                id: "clave",
                type: "text",
                autoComplete: "username",
                autoCapitalize: "characters",
                value: clave,
                onChange: (evento) => setClave(evento.target.value),
                className: "tabular w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-base outline-none focus:border-[var(--color-teal)]",
                placeholder: "Ej. 1002087",
                required: true,
                autoFocus: true,
              }),
            ] }),
            (0, U.jsxs)("div", { children: [
              (0, U.jsx)("label", { htmlFor: "password", className: "mb-1 block text-sm font-medium text-[var(--color-text)]", children: "Contraseña" }),
              (0, U.jsx)("input", {
                id: "password",
                type: "password",
                autoComplete: "current-password",
                value: password,
                onChange: (evento) => setPassword(evento.target.value),
                className: "w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-base outline-none focus:border-[var(--color-teal)]",
                placeholder: "••••••••",
                required: true,
              }),
            ] }),
            error && (0, U.jsx)("p", { className: "rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]", children: error }),
            (0, U.jsx)("button", {
              type: "submit",
              disabled: enviando,
              className: "w-full rounded-lg bg-[var(--color-navy)] py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-navy-light)] disabled:opacity-50",
              children: enviando ? "Entrando…" : "Entrar",
            }),
            (0, U.jsxs)("p", { className: "pt-1 text-center text-xs text-[var(--color-text-muted)]", children: ["¿Eres operador? Usa ", (0, U.jsx)("span", { className: "tabular font-medium", children: "DEMO" }), " / ", (0, U.jsx)("span", { className: "tabular font-medium", children: "DEMO" })] }),
          ],
        }),
      ] }),
    ],
  })
}