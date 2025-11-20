// src/services/imageService.js
/**
 * ═══════════════════════════════════════════════════════════════
 * 📸 IMAGE SERVICE - Gestión de imágenes con Cloudinary
 * ═══════════════════════════════════════════════════════════════
 */

const cloudinary = require('../config/cloudinary');
const cache = require('../utils/CacheManager');
const productoIndex = require('../utils/ProductoIndex');
const { normalizarTexto } = require('../utils/textHelpers');
const logger = require('../middlewares/logger');
const fs = require('fs');
const path = require('path');

class ImageService {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data/lista-precios.json');
    }

    /**
     * Sube una imagen a Cloudinary
     */
    async subirImagen(buffer, mimetype, options = {}) {
        try {
            const b64 = Buffer.from(buffer).toString('base64');
            const dataURI = `data:${mimetype};base64,${b64}`;
            
            const defaultOptions = {
                transformation: [
                    { width: 1000, height: 1000, crop: 'limit' },
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' }
                ]
            };
            
            const uploadOptions = { ...defaultOptions, ...options };
            
            const result = await cloudinary.uploader.upload(dataURI, uploadOptions);
            
            logger.info(`✅ Imagen subida a Cloudinary: ${result.public_id}`);
            
            return {
                url: result.secure_url,
                public_id: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
                size: result.bytes
            };
            
        } catch (error) {
            logger.error('❌ Error subiendo imagen a Cloudinary:', error);
            throw error;
        }
    }

    /**
     * Elimina una imagen de Cloudinary
     */
    async eliminarImagen(publicId) {
        try {
            await cloudinary.uploader.destroy(publicId);
            logger.info(`✅ Imagen eliminada de Cloudinary: ${publicId}`);
            return true;
        } catch (error) {
            logger.error('❌ Error eliminando imagen de Cloudinary:', error);
            throw error;
        }
    }

    /**
     * Agrega imagen a un producto
     */
    async agregarImagenAProducto(productoId, categoriaId, subcategoriaId, imagenData) {
        try {
            const listaPrecios = cache.obtenerProductosSync();
            
            const catId = normalizarTexto(categoriaId);
            const subId = normalizarTexto(subcategoriaId);
            
            // Extraer nombre del producto del ID
            let prodId;
            if (productoId.includes('::')) {
                const partes = productoId.split('::');
                prodId = partes[partes.length - 1];
            } else {
                prodId = normalizarTexto(productoId);
            }
            
            // Buscar el producto
            if (!listaPrecios[catId]?.[subId]?.[prodId]) {
                throw new Error('Producto no encontrado');
            }
            
            const producto = listaPrecios[catId][subId][prodId];
            
            // Inicializar array de imágenes si no existe
            if (!producto.imagenes) {
                producto.imagenes = [];
            }
            
            // Agregar nueva imagen
            producto.imagenes.push({
                url: imagenData.url,
                public_id: imagenData.public_id,
                width: imagenData.width,
                height: imagenData.height,
                format: imagenData.format,
                subida: new Date().toISOString()
            });
            
            // Guardar
            fs.writeFileSync(this.dataPath, JSON.stringify(listaPrecios, null, 2));
            cache.invalidarProductos();
            productoIndex.reconstruir(cache.obtenerProductosSync());
            
            logger.info(`✅ Imagen agregada al producto: ${prodId}`);
            
            return producto.imagenes;
            
        } catch (error) {
            logger.error('❌ Error agregando imagen al producto:', error);
            throw error;
        }
    }

    /**
     * Elimina imagen de un producto
     */
    async eliminarImagenDeProducto(productoId, categoriaId, subcategoriaId, publicId) {
        try {
            // Eliminar de Cloudinary
            await this.eliminarImagen(publicId);
            
            // Eliminar de JSON
            const listaPrecios = cache.obtenerProductosSync();
            
            const catId = normalizarTexto(categoriaId);
            const subId = normalizarTexto(subcategoriaId);
            const prodId = normalizarTexto(productoId);
            
            if (!listaPrecios[catId]?.[subId]?.[prodId]) {
                throw new Error('Producto no encontrado');
            }
            
            const producto = listaPrecios[catId][subId][prodId];
            
            if (producto.imagenes) {
                producto.imagenes = producto.imagenes.filter(img => img.public_id !== publicId);
            }
            
            // Guardar
            fs.writeFileSync(this.dataPath, JSON.stringify(listaPrecios, null, 2));
            cache.invalidarProductos();
            productoIndex.reconstruir(cache.obtenerProductosSync());
            
            logger.info(`✅ Imagen eliminada del producto: ${prodId}`);
            
            return producto.imagenes;
            
        } catch (error) {
            logger.error('❌ Error eliminando imagen del producto:', error);
            throw error;
        }
    }

    /**
     * Obtiene imágenes de un producto
     */
    obtenerImagenesProducto(categoriaId, subcategoriaId, productoId) {
        try {
            const listaPrecios = cache.obtenerProductosSync();
            
            const catId = normalizarTexto(categoriaId);
            const subId = normalizarTexto(subcategoriaId);
            const prodId = normalizarTexto(productoId);
            
            const producto = listaPrecios[catId]?.[subId]?.[prodId];
            
            if (!producto) {
                return [];
            }
            
            return producto.imagenes || [];
            
        } catch (error) {
            logger.error('❌ Error obteniendo imágenes del producto:', error);
            return [];
        }
    }

    /**
     * Reordena imágenes de un producto
     */
    async reordenarImagenes(productoId, categoriaId, subcategoriaId, imagenesOrdenadas) {
        try {
            const listaPrecios = cache.obtenerProductosSync();
            
            const catId = normalizarTexto(categoriaId);
            const subId = normalizarTexto(subcategoriaId);
            const prodId = normalizarTexto(productoId);
            
            if (!listaPrecios[catId]?.[subId]?.[prodId]) {
                throw new Error('Producto no encontrado');
            }
            
            const producto = listaPrecios[catId][subId][prodId];
            producto.imagenes = imagenesOrdenadas;
            
            // Guardar
            fs.writeFileSync(this.dataPath, JSON.stringify(listaPrecios, null, 2));
            cache.invalidarProductos();
            productoIndex.reconstruir(cache.obtenerProductosSync());
            
            logger.info(`✅ Imágenes reordenadas para: ${prodId}`);
            
            return producto.imagenes;
            
        } catch (error) {
            logger.error('❌ Error reordenando imágenes:', error);
            throw error;
        }
    }

    /**
     * Sube imagen de producto (método completo)
     */
    async subirImagenProducto(buffer, mimetype, productoId, categoriaId, subcategoriaId) {
        try {
            // Subir a Cloudinary
            const imagenData = await this.subirImagen(buffer, mimetype, {
                folder: `gestionbot/productos/${categoriaId}/${subcategoriaId}`,
                public_id: `${productoId}_${Date.now()}`
            });
            
            // Agregar al producto
            const imagenes = await this.agregarImagenAProducto(
                productoId,
                categoriaId,
                subcategoriaId,
                imagenData
            );
            
            return {
                success: true,
                imagen: imagenData,
                totalImagenes: imagenes.length
            };
            
        } catch (error) {
            logger.error('❌ Error en proceso completo de subida:', error);
            throw error;
        }
    }
}

module.exports = new ImageService();