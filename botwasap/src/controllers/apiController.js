// src/controllers/apiController.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 🌐 API CONTROLLER - Controlador de API para Dashboard
 * ═══════════════════════════════════════════════════════════════
 */

const cache = require('../utils/CacheManager');
const productService = require('../services/productService');
const clientService = require('../services/clientService');
const orderService = require('../services/orderService');
const imageService = require('../services/imageService');
const { AppError } = require('../middlewares/errorHandler');
const { validarCamposRequeridos, esPrecioValido } = require('../utils/validators');
const { normalizarTexto } = require('../utils/textHelpers');
const logger = require('../middlewares/logger');
const fs = require('fs');
const path = require('path');

class ApiController {
    // ═══════════════════════════════════════════════════════════
    // PRODUCTOS
    // ═══════════════════════════════════════════════════════════

    /**
     * GET /api/productos
     */
    async getProductos(req, res, next) {
        try {
            const productos = productService.obtenerTodosArray();
            
            logger.info(`✅ Enviando ${productos.length} productos al frontend`);
            
            res.json({
                success: true,
                total: productos.length,
                productos
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/productos/:id
     */
    async getProductoById(req, res, next) {
        try {
            const { id } = req.params;
            const partes = id.split('::');
            
            if (partes.length < 3) {
                throw new AppError('ID de producto inválido', 400);
            }
            
            const [categoria, subcategoria, ...nombrePartes] = partes;
            const nombre = nombrePartes.join('::');
            
            const producto = productService.obtenerProducto(categoria, subcategoria, nombre);
            
            if (!producto) {
                throw new AppError('Producto no encontrado', 404);
            }
            
            res.json({
                success: true,
                producto
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/productos
     */
    async createProducto(req, res, next) {
        try {
            const { categoria, subcategoria, nombre, precio, precio_desde, stock, unidad, codigo_barras, imagenes } = req.body;
            
            // Validar campos requeridos
            const validacion = validarCamposRequeridos(req.body, ['categoria', 'subcategoria', 'nombre']);
            
            if (!validacion.valido) {
                throw new AppError(validacion.errores.join(', '), 400);
            }
            
            // Validar precio
            if (!precio && !precio_desde) {
                throw new AppError('Debes ingresar un precio (fijo o desde)', 400);
            }
            
            if (precio && precio_desde) {
                throw new AppError('Solo puedes usar precio fijo O precio desde, no ambos', 400);
            }
            
            if ((precio && !esPrecioValido(precio)) || (precio_desde && !esPrecioValido(precio_desde))) {
                throw new AppError('Precio inválido', 400);
            }
            
            // Preparar datos del producto
            const datosProducto = {
                stock: stock !== false
            };
            
            if (precio) datosProducto.precio = parseFloat(precio);
            if (precio_desde) datosProducto.precio_desde = parseFloat(precio_desde);
            if (unidad) datosProducto.unidad = unidad.trim();
            if (codigo_barras) datosProducto.codigo_barras = codigo_barras.trim();
            if (imagenes && Array.isArray(imagenes)) datosProducto.imagenes = imagenes;
            
            // Crear producto
            const producto = productService.crear(categoria, subcategoria, nombre, datosProducto);
            
            logger.info(`✅ Producto creado: ${producto.nombre}`);
            
            res.status(201).json({
                success: true,
                mensaje: 'Producto creado exitosamente',
                producto
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/productos/:id
     */
    async updateProducto(req, res, next) {
        try {
            const { id } = req.params;
            const partes = id.split('::');
            
            if (partes.length < 3) {
                throw new AppError('ID de producto inválido', 400);
            }
            
            const [categoriaOriginal, subcategoriaOriginal, ...nombrePartes] = partes;
            const nombreOriginal = nombrePartes.join('::');
            
            const { 
                nuevo_nombre, 
                nombre,
                precio, 
                precio_desde, 
                unidad, 
                stock, 
                categoria: nuevaCategoria, 
                subcategoria: nuevaSubcategoria,
                codigo_barras,
                imagenes
            } = req.body;
            
            // Validar precios
            if (precio && precio_desde) {
                throw new AppError('Solo puedes usar precio fijo O precio desde, no ambos', 400);
            }
            
            // Preparar datos actualizados
            const datosActualizados = {};
            
            if (precio !== undefined) {
                datosActualizados.precio = parseFloat(precio);
                delete datosActualizados.precio_desde;
            }
            
            if (precio_desde !== undefined) {
                datosActualizados.precio_desde = parseFloat(precio_desde);
                delete datosActualizados.precio;
            }
            
            if (unidad !== undefined) {
                datosActualizados.unidad = unidad.trim() || null;
            }
            
            if (stock !== undefined) {
                datosActualizados.stock = stock;
            }
            
            if (codigo_barras !== undefined) {
                datosActualizados.codigo_barras = codigo_barras ? codigo_barras.trim() : null;
            }
            
            if (imagenes !== undefined) {
                datosActualizados.imagenes = Array.isArray(imagenes) ? imagenes : [];
            }
            
            // Actualizar producto
            const producto = productService.actualizar(
                categoriaOriginal, 
                subcategoriaOriginal, 
                nombreOriginal, 
                datosActualizados
            );
            
            // Si hay cambio de nombre o ubicación, manejar la reorganización
            const nombreNuevo = nuevo_nombre ? normalizarTexto(nuevo_nombre) : nombreOriginal;
            const categoriaNueva = nuevaCategoria ? normalizarTexto(nuevaCategoria) : categoriaOriginal;
            const subcategoriaNueva = nuevaSubcategoria ? normalizarTexto(nuevaSubcategoria) : subcategoriaOriginal;
            
            logger.info(`✅ Producto actualizado: ${nombreOriginal}`);
            
            res.json({
                success: true,
                mensaje: 'Producto actualizado exitosamente',
                producto: {
                    id: `${categoriaNueva}::${subcategoriaNueva}::${nombreNuevo}`,
                    ...producto
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/productos/:id
     */
    async deleteProducto(req, res, next) {
        try {
            const { id } = req.params;
            const partes = id.split('::');
            
            if (partes.length < 3) {
                throw new AppError('ID de producto inválido', 400);
            }
            
            const [categoria, subcategoria, ...nombrePartes] = partes;
            const nombre = nombrePartes.join('::');
            
            productService.eliminar(categoria, subcategoria, nombre);
            
            logger.info(`✅ Producto eliminado: ${nombre}`);
            
            res.json({
                success: true,
                mensaje: 'Producto eliminado exitosamente'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/productos/buscar-codigo/:codigo
     */
    async buscarPorCodigo(req, res, next) {
        try {
            const { codigo } = req.params;
            
            logger.info(`🔍 Buscando producto por código: ${codigo}`);
            
            const producto = productService.buscarPorCodigo(codigo);
            
            if (!producto) {
                return res.json({
                    success: true,
                    encontrado: false,
                    mensaje: 'No se encontró ningún producto con ese código de barras'
                });
            }
            
            res.json({
                success: true,
                encontrado: true,
                producto
            });
        } catch (error) {
            next(error);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // CATEGORÍAS
    // ═══════════════════════════════════════════════════════════

    /**
     * GET /api/categorias
     */
    async getCategorias(req, res, next) {
        try {
            const categorias = productService.obtenerCategorias();
            
            res.json({
                success: true,
                total: categorias.length,
                categorias
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/categorias
     */
    async createCategoria(req, res, next) {
        try {
            const { nombre, subcategoria } = req.body;
            
            if (!nombre || !subcategoria) {
                throw new AppError('Nombre y subcategoría son requeridos', 400);
            }
            
            const nombreNormalizado = normalizarTexto(nombre);
            const subcategoriaNormalizada = normalizarTexto(subcategoria);
            
            const listaPrecios = cache.obtenerProductosSync();
            
            if (!listaPrecios[nombreNormalizado]) {
                listaPrecios[nombreNormalizado] = {};
            }
            
            if (!listaPrecios[nombreNormalizado][subcategoriaNormalizada]) {
                listaPrecios[nombreNormalizado][subcategoriaNormalizada] = {};
            }
            
            const dataPath = path.join(__dirname, '../../data/lista-precios.json');
            fs.writeFileSync(dataPath, JSON.stringify(listaPrecios, null, 2));
            cache.invalidarProductos();
            
            logger.info(`✅ Categoría creada: ${nombreNormalizado}/${subcategoriaNormalizada}`);
            
            res.status(201).json({
                success: true,
                mensaje: 'Categoría creada exitosamente',
                categoria: nombreNormalizado,
                subcategoria: subcategoriaNormalizada
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/categorias/:nombre
     */
    async deleteCategoria(req, res, next) {
        try {
            const { nombre } = req.params;
            
            const listaPrecios = cache.obtenerProductosSync();
            
            if (!listaPrecios[nombre]) {
                throw new AppError('Categoría no encontrada', 404);
            }
            
            delete listaPrecios[nombre];
            
            const dataPath = path.join(__dirname, '../../data/lista-precios.json');
            fs.writeFileSync(dataPath, JSON.stringify(listaPrecios, null, 2));
            cache.invalidarProductos();
            
            logger.info(`✅ Categoría eliminada: ${nombre}`);
            
            res.json({
                success: true,
                mensaje: 'Categoría eliminada exitosamente'
            });
        } catch (error) {
            next(error);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // CLIENTES
    // ═══════════════════════════════════════════════════════════

    /**
     * GET /api/clientes
     */
    async getClientes(req, res, next) {
        try {
            const clientes = clientService.obtenerTodos();
            
            res.json({
                success: true,
                total: clientes.length,
                clientes
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/clientes/:telefono
     */
    async getClienteByTelefono(req, res, next) {
        try {
            const { telefono } = req.params;
            const cliente = clientService.obtenerPorTelefono(telefono);
            
            if (!cliente) {
                throw new AppError('Cliente no encontrado', 404);
            }
            
            res.json({
                success: true,
                cliente
            });
        } catch (error) {
            next(error);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // IMÁGENES
    // ═══════════════════════════════════════════════════════════

    /**
     * POST /api/productos/imagen
     */
    async uploadImagen(req, res, next) {
        try {
            const { productoId, categoriaId, subcategoriaId } = req.body;
            
            if (!req.file) {
                throw new AppError('No se recibió ninguna imagen', 400);
            }
            
            logger.info(`📸 Subiendo imagen para: ${productoId}`);
            
            const resultado = await imageService.subirImagenProducto(
                req.file.buffer,
                req.file.mimetype,
                productoId,
                categoriaId,
                subcategoriaId
            );
            
            res.json(resultado);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/productos/imagen
     */
    async deleteImagen(req, res, next) {
        try {
            const { productoId, categoriaId, subcategoriaId, publicId } = req.body;
            
            logger.info(`🗑️ Eliminando imagen: ${publicId}`);
            
            await imageService.eliminarImagenDeProducto(
                productoId,
                categoriaId,
                subcategoriaId,
                publicId
            );
            
            res.json({
                success: true,
                mensaje: 'Imagen eliminada exitosamente'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/productos/:categoriaId/:subcategoriaId/:productoId/imagenes
     */
    async getImagenes(req, res, next) {
        try {
            const { categoriaId, subcategoriaId, productoId } = req.params;
            
            const imagenes = imageService.obtenerImagenesProducto(
                categoriaId,
                subcategoriaId,
                productoId
            );
            
            res.json({
                success: true,
                total: imagenes.length,
                imagenes
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/productos/imagenes/reordenar
     */
    async reordenarImagenes(req, res, next) {
        try {
            const { productoId, categoriaId, subcategoriaId, imagenesOrdenadas } = req.body;
            
            logger.info(`🔄 Reordenando imágenes para: ${productoId}`);
            
            const imagenes = await imageService.reordenarImagenes(
                productoId,
                categoriaId,
                subcategoriaId,
                imagenesOrdenadas
            );
            
            res.json({
                success: true,
                mensaje: 'Orden de imágenes actualizado',
                imagenes
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ApiController();