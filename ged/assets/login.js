import { supabase, iniciarSesion } from "./supabaseClient.js";

const form = document.getElementById("form-login");
const errorBox = document.getElementById("form-error");
const btn = document.getElementById("btn-submit");
const claveInput = document.getElementById("clave");
const passInput = document.getElementById("password");

// Si ya hay sesión activa, saltar directo al dashboard.
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) window.location.replace("./dashboard.html");
});

function mostrarError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = "block";
}
function ocultarError() {
  errorBox.style.display = "none";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarError();
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Entrando…`;

  const res = await iniciarSesion(claveInput.value, passInput.value);

  if (!res.ok) {
    mostrarError(res.error);
    btn.disabled = false;
    btn.textContent = "Entrar";
    return;
  }
  window.location.replace("./dashboard.html");
});
