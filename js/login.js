function setLoginStatus(message, type = "info") {
  const el = document.getElementById("login-status");
  if (!el) return;
  el.textContent = message;
  el.className = "text-sm";
  if (type === "error") {
    el.classList.add("text-red-700");
  } else if (type === "success") {
    el.classList.add("text-green-700");
  } else {
    el.classList.add("text-gray-600");
  }
}

function createAuthClient() {
  if (window.__loginClient) return window.__loginClient;
  window.__loginClient = window.supabase.createClient(window.APP_SUPABASE_URL, window.APP_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "sb-academia63-admin-auth",
    },
  });
  return window.__loginClient;
}

async function ensureAlreadyLoggedAsAdmin(client) {
  const { data } = await client.auth.getSession();
  if (!data.session) return false;
  const { data: isAdmin, error } = await client.rpc("is_admin");
  if (error || !isAdmin) return false;
  return true;
}

async function onSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const btn = document.getElementById("login-btn");
  const client = createAuthClient();

  btn.disabled = true;
  btn.textContent = "Entrando...";
  setLoginStatus("Validando credenciais...");

  try {
    const { error: loginError } = await client.auth.signInWithPassword({
      email: form.email.value.trim(),
      password: form.password.value,
    });
    if (loginError) throw loginError;

    const { data: isAdmin, error: adminError } = await client.rpc("is_admin");
    if (adminError) throw adminError;
    if (!isAdmin) {
      await client.auth.signOut();
      throw new Error("Usuario autenticado sem permissao de administrador.");
    }

    setLoginStatus("Login realizado. Redirecionando...", "success");
    window.location.href = "dashboard.html";
  } catch (error) {
    setLoginStatus(`Falha no login: ${error.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
}

async function init() {
  const client = createAuthClient();
  const alreadyAdmin = await ensureAlreadyLoggedAsAdmin(client);
  if (alreadyAdmin) {
    window.location.href = "dashboard.html";
    return;
  }

  const form = document.getElementById("login-form");
  form?.addEventListener("submit", onSubmit);
}

document.addEventListener("DOMContentLoaded", init);
