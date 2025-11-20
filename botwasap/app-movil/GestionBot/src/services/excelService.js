// src/services/excelService.js
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { getNegocioConfig } from './negocioConfig';
import { formatearTexto } from './api';

// Generar Excel con formato profesional
export const exportarProductosExcel = async (productos, opciones = {}) => {
  try {
    const {
      incluirPrecios = true,
      incluirCodigos = true,
      incluirStock = true,
      formato = 'xlsx', // 'xlsx' o 'csv'
    } = opciones;

    // Obtener configuración del negocio
    const config = await getNegocioConfig();

    // Crear datos del Excel
    const datos = [];

    // Header personalizado (primera fila)
    datos.push([
      `📦 ${config.nombre.toUpperCase()} - CATÁLOGO DE PRODUCTOS`,
    ]);
    datos.push([
      `Fecha: ${new Date().toLocaleDateString('es-AR')} | Total: ${productos.length} productos`,
    ]);
    if (config.telefono || config.email) {
      datos.push([
        `${config.telefono ? 'Tel: ' + config.telefono : ''} ${config.email ? '| Email: ' + config.email : ''}`,
      ]);
    }
    datos.push([]); // Fila vacía

    // Encabezados de columnas
    const headers = [
      'ID',
      'CATEGORÍA',
      'SUBCATEGORÍA',
      'NOMBRE',
    ];

    if (incluirPrecios) {
      headers.push('PRECIO', 'PRECIO DESDE', 'UNIDAD');
    }

    if (incluirStock) {
      headers.push('STOCK');
    }

    if (incluirCodigos) {
      headers.push('CÓDIGO DE BARRAS');
    }

    datos.push(headers);

    // Datos de productos
    productos.forEach((producto) => {
      const fila = [
        producto.id,
        formatearTexto(producto.categoria),
        formatearTexto(producto.subcategoria),
        formatearTexto(producto.nombre),
      ];

      if (incluirPrecios) {
        fila.push(
          producto.precio || '',
          producto.precio_desde || '',
          producto.unidad || ''
        );
      }

      if (incluirStock) {
        fila.push(producto.stock ? 'SÍ' : 'NO');
      }

      if (incluirCodigos) {
        fila.push(producto.codigo_barras || '');
      }

      datos.push(fila);
    });

    // Fila vacía y totales
    datos.push([]);
    datos.push(['📊 RESUMEN:']);
    datos.push([`Total de productos: ${productos.length}`]);
    
    const categorias = [...new Set(productos.map(p => p.categoria))];
    datos.push([`Total de categorías: ${categorias.length}`]);
    
    const conStock = productos.filter(p => p.stock).length;
    datos.push([`Productos con stock: ${conStock}`]);
    datos.push([`Productos sin stock: ${productos.length - conStock}`]);

    // Crear workbook
    const ws = XLSX.utils.aoa_to_sheet(datos);

    // Aplicar estilos (anchos de columna)
    ws['!cols'] = [
      { wch: 35 }, // ID
      { wch: 15 }, // Categoría
      { wch: 15 }, // Subcategoría
      { wch: 30 }, // Nombre
      { wch: 12 }, // Precio
      { wch: 15 }, // Precio desde
      { wch: 10 }, // Unidad
      { wch: 10 }, // Stock
      { wch: 20 }, // Código de barras
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    // Agregar hoja de instrucciones
    const instrucciones = [
      ['📝 INSTRUCCIONES PARA IMPORTAR PRODUCTOS'],
      [],
      ['IMPORTANTE:'],
      ['• No modifiques los encabezados de las columnas'],
      ['• No cambies el orden de las columnas'],
      ['• Respeta el formato de cada campo'],
      ['• Puedes dejar el ID vacío en productos nuevos (se genera automáticamente)'],
      [],
      ['FORMATO DE CAMPOS:'],
      [],
      ['ID:'],
      ['  Formato: categoria::subcategoria::nombre'],
      ['  Ejemplo: libreria::escolar::cuaderno_a4'],
      ['  Nota: Déjalo vacío para productos nuevos, se genera automáticamente'],
      [],
      ['CATEGORÍA y SUBCATEGORÍA:'],
      ['  Usa solo letras minúsculas y guiones bajos'],
      ['  Ejemplo: libreria, aseo_personal, cotillon'],
      [],
      ['NOMBRE:'],
      ['  Usa texto normal con espacios'],
      ['  Ejemplo: Cuaderno A4 Tapa Dura'],
      [],
      ['PRECIO:'],
      ['  Solo números, sin símbolos ni comas'],
      ['  Ejemplo: 2300 (correcto)'],
      ['  Ejemplo: $2.300 (incorrecto)'],
      [],
      ['PRECIO DESDE:'],
      ['  Igual que PRECIO, solo números'],
      ['  Usa PRECIO o PRECIO DESDE, no ambos'],
      [],
      ['UNIDAD:'],
      ['  Texto corto'],
      ['  Ejemplos: c/u, kg, mt, pack, x10'],
      [],
      ['STOCK:'],
      ['  Solo: SÍ, SI, YES, TRUE, 1 (con stock)'],
      ['  O: NO, FALSE, 0 (sin stock)'],
      [],
      ['CÓDIGO DE BARRAS:'],
      ['  Solo números'],
      ['  Ejemplo: 7791293044477'],
      [],
      ['EJEMPLOS COMPLETOS:'],
      [],
      headers,
      [
        '',
        'Librería',
        'Escolar',
        'Cuaderno A4 Tapa Dura',
        '1500',
        '',
        'c/u',
        'SÍ',
        '7790001234567',
      ],
      [
        '',
        'Cotillón',
        'Fiesta',
        'Globos Metalicos',
        '',
        '1000',
        'pack x10',
        'SÍ',
        '',
      ],
      [
        '',
        'Varios',
        'Aseo',
        'Jabón Líquido',
        '850',
        '',
        '',
        'NO',
        '7790009876543',
      ],
    ];

    const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones);
    wsInstrucciones['!cols'] = [{ wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones');

    // Generar archivo
    const wbout = XLSX.write(wb, { type: 'base64', bookType: formato });
    const filename = `productos_${config.nombre.toLowerCase().replace(/\s/g, '_')}_${Date.now()}.${formato}`;
    const uri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('✅ Archivo generado:', uri);

    return { success: true, uri, filename };
  } catch (error) {
    console.error('❌ Error al exportar:', error);
    return { success: false, error: error.message };
  }
};

// Compartir archivo Excel
export const compartirExcel = async (uri, filename) => {
  try {
    const canShare = await Sharing.isAvailableAsync();
    
    if (!canShare) {
      throw new Error('Compartir no está disponible en este dispositivo');
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: `Compartir ${filename}`,
      UTI: 'com.microsoft.excel.xlsx',
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Error al compartir:', error);
    return { success: false, error: error.message };
  }
};

// Leer archivo Excel/CSV para importar
export const importarProductosExcel = async (uri) => {
  try {
    console.log('📥 Importando desde:', uri);

    if (!uri) {
      throw new Error('URI del archivo es null o undefined');
    }

    const content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('📄 Archivo leído correctamente');

    const workbook = XLSX.read(content, { type: 'base64' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('📊 Filas totales en Excel:', data.length);

    // Encontrar encabezados
    let headerRow = -1;
    for (let i = 0; i < data.length; i++) {
      const firstCell = data[i][0]?.toString().toUpperCase() || '';
      const secondCell = data[i][1]?.toString().toUpperCase() || '';
      
      if (firstCell.includes('ID') || 
          firstCell.includes('CATEG') || 
          secondCell.includes('CATEG')) {
        headerRow = i;
        console.log('✅ Encabezados encontrados en fila:', i + 1);
        break;
      }
    }

    if (headerRow === -1) {
      throw new Error('No se encontraron encabezados válidos en el archivo.\n\nAsegúrate de que haya una fila con: CATEGORÍA, SUBCATEGORÍA, NOMBRE, etc.');
    }

    const headers = data[headerRow];
    const productos = [];
    const errores = [];

    console.log('📋 Encabezados:', headers);
    console.log('🔄 Procesando filas desde', headerRow + 2, 'hasta', data.length);

    // Procesar TODAS las filas de datos
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      
      // ✅ VERIFICAR SI LA FILA TIENE DATOS
      const tieneContenido = row && row.some(cell => 
        cell !== null && 
        cell !== undefined && 
        cell.toString().trim() !== ''
      );

      if (!tieneContenido) {
        console.log(`⏭️ Fila ${i + 1}: vacía, saltando...`);
        continue;
      }

      // ✅ VERIFICAR SI ES FILA DE RESUMEN
      const primeraCelda = row[0]?.toString().trim() || '';
      const segundaCelda = row[1]?.toString().trim() || '';
      
      const esResumen = 
        primeraCelda.startsWith('📊') || 
        primeraCelda.toLowerCase().includes('total') ||
        primeraCelda.toLowerCase().includes('resumen');

      if (esResumen) {
        console.log(`⏹️ Fila ${i + 1}: resumen detectado, deteniendo procesamiento`);
        break;
      }

      console.log(`\n📝 Procesando fila ${i + 1}:`, row.slice(0, 5));

      try {
        const producto = procesarFilaProducto(row, headers);
        if (producto) {
          productos.push(producto);
          console.log(`✅ Fila ${i + 1}: producto agregado - ${producto.nombre}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error en fila ${i + 1}:`, error.message);
        errores.push({
          fila: i + 1,
          error: error.message,
          datos: row.slice(0, 5),
        });
      }
    }

    console.log('\n📊 RESUMEN DE IMPORTACIÓN:');
    console.log(`✅ Productos válidos: ${productos.length}`);
    console.log(`⚠️ Filas con errores: ${errores.length}`);

    return { success: true, productos, errores };
  } catch (error) {
    console.error('❌ Error al importar:', error);
    return { success: false, error: error.message };
  }
};

// Procesar fila individual del Excel
const procesarFilaProducto = (row, headers) => {
  const getColumnValue = (columnName) => {
    const index = headers.findIndex(h => 
      h && h.toString().toUpperCase().includes(columnName.toUpperCase())
    );
    return index >= 0 && row[index] !== undefined && row[index] !== null && row[index] !== '' 
      ? row[index] 
      : null;
  };

  // Obtener valores básicos
  const id = getColumnValue('ID');
  const categoria = getColumnValue('CATEGORÍA') || getColumnValue('CATEGORIA');
  const subcategoria = getColumnValue('SUBCATEGORÍA') || getColumnValue('SUBCATEGORIA');
  const nombre = getColumnValue('NOMBRE');

  console.log('🔍 Procesando fila:', {
    id: id || '(vacío - se generará)',
    categoria: categoria || '(vacío)',
    subcategoria: subcategoria || '(vacío)',
    nombre: nombre || '(vacío)',
  });

  // Validar campos obligatorios
  if (!categoria) {
    throw new Error('Falta la CATEGORÍA (campo obligatorio)');
  }

  if (!subcategoria) {
    throw new Error('Falta la SUBCATEGORÍA (campo obligatorio)');
  }

  if (!nombre) {
    throw new Error('Falta el NOMBRE (campo obligatorio)');
  }

  // Normalizar nombres
  const categoriaNorm = categoria.toString().toLowerCase().trim().replace(/\s+/g, '_');
  const subcategoriaNorm = subcategoria.toString().toLowerCase().trim().replace(/\s+/g, '_');
  const nombreNorm = nombre.toString().toLowerCase().trim().replace(/\s+/g, '_');

  const producto = {
    categoria: categoriaNorm,
    subcategoria: subcategoriaNorm,
    nombre: nombreNorm,
  };

  // Precio
  const precio = getColumnValue('PRECIO');
  const precioDesde = getColumnValue('PRECIO DESDE') || getColumnValue('DESDE');

  if (precio && !isNaN(parseFloat(precio))) {
    producto.precio = parseFloat(precio);
  } else if (precioDesde && !isNaN(parseFloat(precioDesde))) {
    producto.precio_desde = parseFloat(precioDesde);
  } else {
    console.warn(`⚠️ Producto sin precio: ${nombreNorm}`);
  }

  // Unidad
  const unidad = getColumnValue('UNIDAD');
  if (unidad) {
    producto.unidad = unidad.toString().trim();
  }

  // Stock
  const stock = getColumnValue('STOCK');
  if (stock !== null) {
    const stockStr = stock.toString().toUpperCase().trim();
    producto.stock = ['SÍ', 'SI', 'YES', 'TRUE', '1', 'S', 'Y'].includes(stockStr);
  } else {
    producto.stock = true; // Por defecto con stock
  }

  // Código de barras
  const codigoBarras = getColumnValue('CÓDIGO') || getColumnValue('CODIGO');
  if (codigoBarras) {
    const codigoStr = codigoBarras.toString().trim();
    if (codigoStr.length > 0) {
      producto.codigo_barras = codigoStr;
    }
  }

  console.log('✅ Producto normalizado:', producto);

  return producto;
};