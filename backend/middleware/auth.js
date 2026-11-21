
const jwt = require("jsonwebtoken");

// MIDDLEWARE DE AUTENTICACIÓN
// Verifica que la persona tenga un token válido
// antes de permitirle acceder a una ruta protegida.

function verificarToken(req, res, next) {
  try {
    // Obtener el token enviado desde el navegador
    const encabezado = req.headers.authorization;

    if (!encabezado || !encabezado.startsWith("Bearer ")) {
      return res.status(401).json({
        mensaje: "No tienes autorización. Inicia sesión."
      });
    }

    const token = encabezado.split(" ")[1];
    // Verificar que exista la clave secreta  
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        mensaje: "La configuración de seguridad no está disponible."
      });
    }
    
    // Comprobar que el token sea válido  
     const datosAdministrador = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Guardar los datos del administrador en la solicitud
    req.administrador = datosAdministrador;

    // Permitir que continúe hacia la ruta solicitada
    next();

  } catch (error) {
    return res.status(401).json({
      mensaje: "Sesión inválida o expirada. Inicia sesión nuevamente."
    });
  }
}

module.exports = verificarToken;
