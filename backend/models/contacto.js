
const mongoose = require("mongoose");

const contactoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    correo: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254
    },
    mensaje: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Contacto", contactoSchema);
