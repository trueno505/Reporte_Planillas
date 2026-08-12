// Nombres de hoja de cálculo válidos y únicos dentro de un libro.
//
// Excel impone tres reglas que, si se incumplen, hacen que la librería lance
// al añadir la hoja y la descarga entera falle:
//   1. máximo 31 caracteres;
//   2. no puede contener  :  \  /  ?  *  [  ]  ;
//   3. no puede repetirse dentro del libro — y la comparación NO distingue
//      mayúsculas ("Alcalde" y "alcalde" colisionan).
//
// Antes cada sitio hacía `label.slice(0, 31)` por su cuenta, sin comprobar
// duplicados. Hoy ningún par de planillas colisiona, pero "Empleados Contrato
// Plazo Indeterminado" ya se corta en el carácter 31, así que bastaba con
// añadir una planilla de nombre parecido para romper la exportación.

const CARACTERES_PROHIBIDOS = /[:\\/?*[\]]/g
const MAX_LARGO = 31

/**
 * Devuelve una función que asigna nombres de hoja para UN libro concreto,
 * recordando los ya usados para evitar duplicados.
 *
 * @example
 *   const nombrar = crearNombradorHojas()
 *   nombrar('Alcalde')  // 'Alcalde'
 *   nombrar('Alcalde')  // 'Alcalde (2)'
 *
 * @returns {(base: string) => string}
 */
export function crearNombradorHojas() {
  const usados = new Set() // en minúsculas: Excel no distingue mayúsculas

  return function nombrarHoja(base) {
    const limpio =
      String(base ?? '')
        .replace(CARACTERES_PROHIBIDOS, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'Hoja'

    let nombre = limpio.slice(0, MAX_LARGO).trimEnd()

    // Si ya existe, se le añade " (2)", " (3)"… recortando lo necesario para
    // no pasar de 31 caracteres.
    for (let n = 2; usados.has(nombre.toLowerCase()); n++) {
      const sufijo = ` (${n})`
      nombre = `${limpio.slice(0, MAX_LARGO - sufijo.length).trimEnd()}${sufijo}`
      // Guarda contra un bucle infinito teórico si el sufijo se comiera el
      // nombre entero (haría falta un libro con miles de hojas homónimas).
      if (n > 5000) return `Hoja ${usados.size + 1}`.slice(0, MAX_LARGO)
    }

    usados.add(nombre.toLowerCase())
    return nombre
  }
}
