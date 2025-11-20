// src/services/productService.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 📦 PRODUCT SERVICE - Gestión de productos
 * ═══════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const cache = require('../utils/CacheManager');
const productoIndex = require('../utils/ProductoIndex');
const { normalizarTexto, formatearTexto } = require('../utils/textHelpers');
const logger = require('../middlewares/logger');
const { EMOJIS_CATEGORIA, MAPA_ALIASES } = require('../config/constants');

class ProductService {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data/lista-precios.json');
    }

    /**
     * Obtiene todos los productos
     */
    obtenerTodos() {
        try {
            return cache.obtenerProductosSync();
        } catch (error) {
            logger.error('❌ Error obteniendo productos:', error);
            return {};
        }
    }

    /**
     * Obtiene productos como array plano
     */
    obtenerTodosArray() {
        try {
            const listaPrecios = this.obtenerTodos();
            const productosArray = [];
            
            for (const [categoria, subcategorias] of Object.entries(listaPrecios)) {
                for (const [subcategoria, productos] of Object.entries(subcategorias)) {
                    for (const [nombre, info] of Object.entries(productos)) {
                        productosArray.push({
                            id: `${categoria}::${subcategoria}::${nombre}`,
                            categoria,
                            subcategoria,
                            nombre,
                            precio: info.precio,
                            precio_desde: info.precio_desde,
                            unidad: info.unidad,
                            stock: info.stock !== false,
                            codigo_barras: info.codigo_barras || null,
                            imagenes: info.imagenes || []
                        });
                    }
                }
            }
            
            return productosArray;
        } catch (error) {
            logger.error('❌ Error obteniendo productos array:', error);
            return [];
        }
    }

    /**
     * Busca productos por texto
     */
    buscar(consulta) {
        try {
            return productoIndex.buscar(consulta);
        } catch (error) {
            logger.error('❌ Error buscando productos:', error);
            return [];
        }
    }

    /**
     * Busca por código de barras
     */
    buscarPorCodigo(codigo) {
        try {
            return productoIndex.buscarPorCodigoBarras(codigo);
        } catch (error) {
            logger.error('❌ Error buscando por código:', error);
            return null;
        }
    }

    /**
     * Obtiene un producto específico
     */
    obtenerProducto(categoria, subcategoria, nombre) {
        try {
            const listaPrecios = this.obtenerTodos();
            const catNorm = normalizarTexto(categoria);
            const subNorm = normalizarTexto(subcategoria);
            const nomNorm = normalizarTexto(nombre);
            
            if (!listaPrecios[catNorm] || 
                !listaPrecios[catNorm][subNorm] || 
                !listaPrecios[catNorm][subNorm][nomNorm]) {
                return null;
            }
            
            return {
                categoria: catNorm,
                subcategoria: subNorm,
                nombre: nomNorm,
                ...listaPrecios[catNorm][subNorm][nomNorm]
            };
        } catch (error) {
            logger.error('❌ Error obteniendo producto:', error);
            return null;
        }
    }

    /**
     * Crea un nuevo producto
     */
    crear(categoria, subcategoria, nombre, datosProducto) {
        try {
            const categoriaNorm = normalizarTexto(categoria);
            const subcategoriaNorm = normalizarTexto(subcategoria);
            const nombreNorm = normalizarTexto(nombre);
            
            const listaPrecios = this.obtenerTodos();
            
            // Verificar si ya existe
            if (listaPrecios[categoriaNorm]?.[subcategoriaNorm]?.[nombreNorm]) {
                throw new Error('El producto ya existe');
            }
            
            // Crear estructura si no existe
            if (!listaPrecios[categoriaNorm]) {
                listaPrecios[categoriaNorm] = {};
            }
            
            if (!listaPrecios[categoriaNorm][subcategoriaNorm]) {
                listaPrecios[categoriaNorm][subcategoriaNorm] = {};
            }
            
            // Crear producto
            listaPrecios[categoriaNorm][subcategoriaNorm][nombreNorm] = {
                stock: datosProducto.stock !== false,
                ...datosProducto
            };
            
            // Guardar
            fs.writeFileSync(this.dataPath, JSON.stringify(listaPrecios, null, 2));
            cache.invalidarProductos();
            productoIndex.reconstruir(cache.obtenerProductosSync());
            
            logger.info(`✅ Producto creado: ${nombreNorm}`);
            
            return {
                id: `${categoriaNorm}::${subcategoriaNorm}::${nombreNorm}`,
                categoria: categoriaNorm,
                subcategoria: subcategoriaNorm,
                nombre: nombreNorm,
                ...listaPrecios[categoriaNorm][subcategoriaNorm][nombreNorm]
            };
        } catch (error) {
            logger.error('❌ Error creando producto:', error);
            throw error;
        }
    }

    /**
     * Actualiza un producto
     */
    actualizar(categoria, subcategoria, nombre, datosActualizados) {
        try {
            const categoriaNorm = normalizarTexto(categoria);
            const subcategoriaNorm = normalizarTexto(subcategoria);
            const nombreNorm = normalizarTexto(nombre);
            
            const listaPrecios = this.obtenerTodos();
            
            if (!listaPrecios[categoriaNorm]?.[subcategoriaNorm]?.[nombreNorm]) {
                throw new Error('Producto no encontrado');
            }
            
            // Actualizar producto
            const productoActual = listaPrecios[categoriaNorm][subcategoriaNorm][nombreNorm];
            listaPrecios[categoriaNorm][subcategoriaNorm][nombreNorm] = {
                ...productoActual,
                ...datosActualizados
            };
            
            // Guardar
            fs.writeFileSync(this.dataPath, JSON.stringify(listaPrecios, null, 2));
            cache.invalidarProductos();
            productoIndex.reconstruir(cache.obtenerProductosSync());
            
            logger.info(`✅ Producto actualizado: ${nombreNorm}`);
            
            return listaPrecios[categoriaNorm][subcategoriaNorm][nombreNorm];
        } catch (error) {
            logger.error('❌ Error actualizando producto:', error);
            throw error;
        }
    }

    /**
     * Elimina un producto
     */
    eliminar(categoria, subcategoria, nombre) {
        try {
            const categoriaNorm = normalizarTexto(categoria);
            const subcategoriaNorm = normalizarTexto(subcategoria);
            const nombreNorm = normalizarTexto(nombre);
            
            const listaPrecios = this.obtenerTodos();
            
            if (!listaPrecios[categoriaNorm]?.[subcategoriaNorm]?.[nombreNorm]) {
                throw new Error('Producto no encontrado');
            }
            
            // Eliminar producto
            delete listaPrecios[categoriaNorm][subcategoriaNorm][nombreNorm];
            
            // Limpiar subcategoría vacía
            if (Object.keys(listaPrecios[categoriaNorm][subcategoriaNorm]).length === 0) {
                delete listaPrecios[categoriaNorm][subcategoriaNorm];
            }
            
            // Limpiar categoría vacía
            if (Object.keys(listaPrecios[categoriaNorm]).length === 0) {
                delete listaPrecios[categoriaNorm];
            }
            
            // Guardar
            fs.writeFileSync(this.dataPath, JSON.stringify(listaPrecios, null, 2));
            cache.invalidarProductos();
            productoIndex.reconstruir(cache.obtenerProductosSync());
            
            logger.info(`✅ Producto eliminado: ${nombreNorm}`);
            
            return true;
        } catch (error) {
            logger.error('❌ Error eliminando producto:', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las categorías
     */
    obtenerCategorias() {
        try {
            const listaPrecios = this.obtenerTodos();
            const categorias = Object.keys(listaPrecios);
            
            return categorias.map(cat => {
                const subcategorias = Object.keys(listaPrecios[cat]);
                let totalProductos = 0;
                
                subcategorias.forEach(sub => {
                    totalProductos += Object.keys(listaPrecios[cat][sub]).length;
                });
                
                return {
                    nombre: cat,
                    nombreFormateado: formatearTexto(cat),
                    emoji: EMOJIS_CATEGORIA[cat] || '📦',
                    subcategorias: subcategorias,
                    total_productos: totalProductos
                };
            });
        } catch (error) {
            logger.error('❌ Error obteniendo categorías:', error);
            return [];
        }
    }

    /**
     * Busca categoría por nombre o alias
     */
    buscarCategoria(nombre) {
        try {
            const nombreNorm = normalizarTexto(nombre);
            const listaPrecios = this.obtenerTodos();
            const categorias = Object.keys(listaPrecios);
            
            // Búsqueda exacta
            if (categorias.includes(nombreNorm)) {
                return nombreNorm;
            }
            
            // Búsqueda por alias
            if (MAPA_ALIASES[nombreNorm]) {
                const categoriaReal = MAPA_ALIASES[nombreNorm];
                if (categorias.includes(categoriaReal)) {
                    return categoriaReal;
                }
            }
            
            // Búsqueda parcial
            for (const categoria of categorias) {
                if (categoria.includes(nombreNorm) || nombreNorm.includes(categoria)) {
                    return categoria;
                }
            }
            
            return null;
        } catch (error) {
            logger.error('❌ Error buscando categoría:', error);
            return null;
        }
    }

    /**
     * Genera lista de categorías para mostrar
     */
    generarListaCategorias() {
        try {
            const categorias = this.obtenerCategorias();
            
            if (categorias.length === 0) {
                return `📋 *Categorías Disponibles:*\n\nNo hay categorías configuradas aún.`;
            }
            
            let respuesta = `📋 *Categorías Disponibles:*\n\n`;
            
            categorias.forEach(cat => {
                respuesta += `${cat.emoji} ${cat.nombreFormateado} (${cat.total_productos} productos)\n`;
            });
            
            respuesta += `\n💡 Para hacer un pedido, escribe por ejemplo:\n`;
            respuesta += `"Quiero 2 cuadernos y 5 lapiceras"`;
            
            return respuesta;
        } catch (error) {
            logger.error('❌ Error generando lista:', error);
            return 'Error al cargar categorías';
        }
    }
}

module.exports = new ProductService();