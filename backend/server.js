
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Contacto = require("./models/contacto");
// MODELO DE ADMINISTRADORES
const Administrador = require("./models/administrador");
// HERRAMIENTAS DE SEGURIDAD
const bcrypt = require("bcryptjs"); //Protege y verifica contraseñas
const jwt = require("jsonwebtoken"); // Genera tokens de autenticación para los administradores
const { GoogleGenAI } = require("@google/genai");
const Groq = require("groq-sdk");
require("dotenv").config();

//MIDDLEWARE PARA PROTEGER LAS RUTAS ADMINISTRATIVAS
const verificarToken = require("./middleware/auth");

const app = express();
// CONFIGURACIÓN DE GEMINI
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;
  // CONFIGURACIÓN DE GROQ
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;
const PORT = process.env.PORT || 3000;

// Configuración del servidor
app.use(cors());
app.use(express.json());


// RUTA PROTEGIDA PARA CONSULTAR LOS MENSAJES DE CONTACTO
// Solo los administradores que hayan iniciado sesión pueden acceder.

app.get("/api/admin/contactos", verificarToken, async (req, res) => {
  try {
    const contactos = await Contacto.find().sort({ createdAt: -1 });

    return res.status(200).json({
      mensaje: "Mensajes obtenidos correctamente.",
      contactos
    });

  } catch (error) {
    console.error("Error al obtener los mensajes:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener los mensajes."
    });
  }
});

// RUTA DE INICIO DE SESIÓN DE ADMINISTRADORES
// Verifica el correo y la contraseña del administrador.
// Si los datos son correctos, genera un token de acceso
// para permitirle ingresar al panel administrativo.
app.post("/api/admin/login", async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({
        mensaje: "Ingresa tu correo y contraseña."
      });
    }

    const administrador = await Administrador.findOne({
      correo: correo.trim().toLowerCase()
    });

    if (!administrador) {
      return res.status(401).json({
        mensaje: "Correo o contraseña incorrectos."
      });
    }

    const passwordValida = await bcrypt.compare(
      password,
      administrador.password
    );

    if (!passwordValida) {
      return res.status(401).json({
        mensaje: "Correo o contraseña incorrectos."
      });
    }

    const token = jwt.sign(
      {
        id: administrador._id,
        rol: administrador.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(200).json({
      mensaje: "Inicio de sesión exitoso.",
      token,
      administrador: {
        nombre: administrador.nombre,
        correo: administrador.correo,
        rol: administrador.rol
      }
    });

  } catch (error) {
    console.error("Error en el inicio de sesión:", error);

    return res.status(500).json({
      mensaje: "Ocurrió un error al iniciar sesión."
    });
  }
});


// Ruta para comprobar el estado del servidor y la base de datos
app.get("/api/health", (req, res) => {
  res.json({
    mensaje: "El backend de Moni Mia funciona",
    servidor: "activo",
    baseDeDatos:
      mongoose.connection.readyState === 1 ? "conectada" : "desconectada"
  });
});

// Guardar mensajes del formulario de contacto

app.post("/api/contactos", async (req, res) => {
  try {
    const { nombre, correo, mensaje } = req.body;

    // Verificar que los campos sean textos
    if (
      typeof nombre !== "string" ||
      typeof correo !== "string" ||
      typeof mensaje !== "string"
    ) {
      return res.status(400).json({
        mensaje: "Los datos enviados no son válidos."
      });
    }

    // Eliminar espacios al inicio y al final
    const nombreLimpio = nombre.trim();
    const correoLimpio = correo.trim().toLowerCase();
    const mensajeLimpio = mensaje.trim();

    // Verificar que ningún campo esté vacío
    if (!nombreLimpio || !correoLimpio || !mensajeLimpio) {
      return res.status(400).json({
        mensaje: "Por favor, completa todos los campos."
      });
    }

    // Verificar la longitud de los campos
    if (nombreLimpio.length > 80) {
      return res.status(400).json({
        mensaje: "El nombre no puede superar los 80 caracteres."
      });
    }

    if (correoLimpio.length > 254) {
      return res.status(400).json({
        mensaje: "El correo electrónico es demasiado largo."
      });
    }

    if (mensajeLimpio.length > 1000) {
      return res.status(400).json({
        mensaje: "El mensaje no puede superar los 1000 caracteres."
      });
    }

    // Verificar el formato del correo
    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoCorreo.test(correoLimpio)) {
      return res.status(400).json({
        mensaje: "Ingresa un correo electrónico válido."
      });
    }

    // Guardar el contacto en MongoDB
    const nuevoContacto = await Contacto.create({
      nombre: nombreLimpio,
      correo: correoLimpio,
      mensaje: mensajeLimpio
    });

    res.status(201).json({
      mensaje: "Mensaje guardado correctamente.",
      contactoId: nuevoContacto._id
    });

  } catch (error) {
    console.error("Error al guardar el contacto:", error.message);

    res.status(500).json({
      mensaje: "No se pudo guardar el mensaje."
    });
  }
});


// ASISTENTE FINANCIERO CON INTELIGENCIA ARTIFICIAL

app.post("/api/ia/asistente", async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({
        mensaje: "El asistente financiero no está configurado."
      });
    }

    const { pregunta } = req.body;

    const preguntaLimpia = pregunta.trim();
    if (preguntaLimpia.length > 1000) {
      return res.status(400).json({
        mensaje: "Tu pregunta no puede superar los 1000 caracteres."
      });
    }

    if (pregunta.length > 1000) {
      return res.status(400).json({
        mensaje: "Tu pregunta no puede superar los 1000 caracteres."
      });
    }

    const respuesta = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content: `
            Eres Moni Mia, un asistente especializado en finanzas personales.
            Tu objetivo es ayudar principalmente a jóvenes y estudiantes
            a organizar sus ingresos, controlar sus gastos, ahorrar y
            desarrollar buenos hábitos financieros.

            Responde siempre en español, con palabras sencillas,
            de manera amable, clara y práctica.

            Ofrece consejos realistas y ejemplos fáciles de entender.
            No inventes datos financieros ni prometas resultados.
            No solicites contraseñas, números de tarjetas ni datos bancarios.
            No reemplaces el asesoramiento de un profesional financiero.

            Responde considerando que el público está en Ecuador.
            Utiliza dólares estadounidenses (USD) en los ejemplos.
            Evita recomendar aplicaciones o servicios sin comprobar
            que estén disponibles en Ecuador.
            Procura que las respuestas sean claras, prácticas y no demasiado largas.
          `
        },
        {
          role: "user",
          content: preguntaLimpia
        }
      ],
      temperature: 0.7,
      max_tokens: 1200
    });

    return res.status(200).json({
      respuesta: respuesta.choices[0].message.content
    });

  } catch (error) {
    console.error("Error en el asistente financiero:", error.message);

    return res.status(500).json({
      mensaje: "No pudimos generar una respuesta. Inténtalo nuevamente."
    });
  }
});


// Conectar a MongoDB e iniciar el servidor
async function iniciarServidor() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Falta configurar MONGODB_URI en el archivo .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB conectado correctamente");

    app.listen(PORT, () => {
      console.log(`Servidor de Moni Mia funcionando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("No se pudo conectar a MongoDB:", error.message);
    process.exit(1);
  }
}

iniciarServidor();
