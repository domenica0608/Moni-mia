
// CONEXIÓN CON EL BACKEND DE MONI MIA
const API_URL = "http://localhost:3000";

// ELEMENTOS DEL HTML
const loginSection = document.getElementById("loginSection");
const adminDashboard = document.getElementById("adminDashboard");

const adminLoginForm = document.getElementById("adminLoginForm");
const loginMessage = document.getElementById("loginMessage");

const adminWelcome = document.getElementById("adminWelcome");
const contactsContainer = document.getElementById("contactsContainer");

const logoutButton = document.getElementById("logoutButton");


// INICIAR SESIÓN
async function iniciarSesion(event) {
  event.preventDefault();

  const correo = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;

  loginMessage.textContent = "Verificando datos...";

  try {
    const respuesta = await fetch(`${API_URL}/api/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ correo, password })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      loginMessage.textContent = datos.mensaje;
      return;
    }

    // Guardar el token durante esta sesión del navegador
    sessionStorage.setItem("moniMiaToken", datos.token);
    sessionStorage.setItem("moniMiaAdmin", datos.administrador.nombre);

    loginMessage.textContent = "";

    await mostrarPanel();

  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    loginMessage.textContent = "No se pudo conectar con el servidor.";
  }
}


// MOSTRAR EL PANEL ADMINISTRATIVO
async function mostrarPanel() {
  const token = sessionStorage.getItem("moniMiaToken");

  if (!token) {
    return;
  }

  const cargados = await cargarContactos();

  if (!cargados) {
    return;
  }

  loginSection.hidden = true;
  adminDashboard.hidden = false;

  const nombre = sessionStorage.getItem("moniMiaAdmin");
  adminWelcome.textContent = `Has iniciado sesión como ${nombre}.`;
}


// CONSULTAR LOS MENSAJES DE CONTACTO
async function cargarContactos() {
  const token = sessionStorage.getItem("moniMiaToken");

  try {
    const respuesta = await fetch(`${API_URL}/api/admin/contactos`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      if (respuesta.status === 401) {
        cerrarSesion();
        loginMessage.textContent = datos.mensaje;
      } else {
        contactsContainer.textContent = datos.mensaje;
      }

      return false;
    }

    // Limpiar el contenedor antes de mostrar los mensajes
    contactsContainer.replaceChildren();
    // Actualizar el contador de mensajes recibidos 
    document.getElementById("totalContacts").textContent =
     datos.contactos.length;

    if (datos.contactos.length === 0) {
      contactsContainer.textContent = "Todavía no hay mensajes recibidos.";
      return true;
    }

    // Crear una tarjeta para cada contacto
    datos.contactos.forEach((contacto) => {
      const tarjeta = document.createElement("article");
      tarjeta.className = "contact-card";

      const nombre = document.createElement("h3");
      nombre.textContent = contacto.nombre;

      const correo = document.createElement("p");
      correo.textContent = `Correo: ${contacto.correo}`;

      const mensaje = document.createElement("p");
      mensaje.textContent = `Mensaje: ${contacto.mensaje}`;

      const fecha = document.createElement("p");
      fecha.textContent = `Fecha: ${new Date(contacto.createdAt).toLocaleString("es-EC")}`;

      tarjeta.append(nombre, correo, mensaje, fecha);
      contactsContainer.appendChild(tarjeta);
    });

    return true;

  } catch (error) {
    console.error("Error al cargar los contactos:", error);
    contactsContainer.textContent = "No se pudieron cargar los mensajes.";
    return false;
  }
}


// CERRAR SESIÓN
function cerrarSesion() {
  sessionStorage.removeItem("moniMiaToken");
  sessionStorage.removeItem("moniMiaAdmin");

  adminDashboard.hidden = true;
  loginSection.hidden = false;

  adminLoginForm.reset();
  contactsContainer.replaceChildren();
}


// CONECTAR LOS EVENTOS
adminLoginForm.addEventListener("submit", iniciarSesion);
logoutButton.addEventListener("click", cerrarSesion);


// COMPROBAR SI YA EXISTE UNA SESIÓN ACTIVA
mostrarPanel();
