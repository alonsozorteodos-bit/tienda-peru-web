import { db } from "./firebase-config.js";
import { collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

async function cargarDatosIniciales() {
  try {
    console.log("Iniciando migración de datos...");

    // 1. Categorías iniciales de tu tienda
    const categoriasIniciales = [
      { id: "joyeria", name: "Joyería", icon: "💎", img: "" },
      { id: "relojes", name: "Relojes", icon: "⌚", img: "" },
      { id: "accesorios", name: "Accesorios", icon: "🕶️", img: "" },
      { id: "ofertas", name: "Ofertas", icon: "🔥", img: "" }
    ];

    for (const cat of categoriasIniciales) {
      const { id, ...data } = cat;
      await setDoc(doc(db, "categorias", id), data);
      console.log(`Categoría creada: ${cat.name}`);
    }

    // 2. Libros / Recursos iniciales
    const librosIniciales = [
      {
        name: "Matemática Financiera y Comercial",
        desc: "Guía completa de ejercicios y fórmulas para secundaria.",
        price: 350,
        cat: "libros",
        img: ""
      },
      {
        name: "Álgebra Baldor (Edición de Estudio)",
        desc: "El clásico de álgebra con problemas resueltos paso a paso.",
        price: 500,
        cat: "libros",
        img: ""
      }
    ];

    for (const libro of librosIniciales) {
      await setDoc(doc(collection(db, "libros")), libro);
      console.log(`Libro creado: ${libro.name}`);
    }

    alert("¡Migración completada con éxito! Ya puedes ver tus datos en Firebase.");
  } catch (error) {
    console.error("Error en la migración: ", error);
    alert("Hubo un error al migrar. Revisa la consola.");
  }
}

// Ejecutar al cargar la página
window.addEventListener("DOMContentLoaded", () => {
  const btnMigrar = document.getElementById("btnEjecutarMigracion");
  if (btnMigrar) {
    btnMigrar.addEventListener("click", cargarDatosIniciales);
  }
});
