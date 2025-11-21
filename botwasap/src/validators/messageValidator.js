// src/validators/messageValidator.js
/**
 * ═══════════════════════════════════════════════════════════════
 * ✅ MESSAGE VALIDATOR - Validación de datos de mensajes
 * ═══════════════════════════════════════════════════════════════
 */

const Joi = require('joi');

class MessageValidator {
    constructor() {
        // Schema para validar información de cliente
        this.clienteSchema = Joi.object({
            telefono: Joi.string()
                .pattern(/^[0-9]+@c\.us$/)
                .required()
                .messages({
                    'string.pattern.base': 'Formato de teléfono inválido',
                    'any.required': 'El teléfono es requerido'
                }),
            nombre: Joi.string()
                .min(2)
                .max(100)
                .required()
                .messages({
                    'string.min': 'El nombre debe tener al menos 2 caracteres',
                    'string.max': 'El nombre no puede exceder 100 caracteres',
                    'any.required': 'El nombre es requerido'
                })
        });

        // Schema para validar productos
        this.productoSchema = Joi.object({
            nombre: Joi.string().required(),
            nombreFormateado: Joi.string().required(),
            cantidad: Joi.number().integer().min(1).max(1000).required(),
            precio: Joi.number().positive().required(),
            stock: Joi.boolean().required(),
            categoria: Joi.string().required(),
            subcategoria: Joi.string().allow('').optional()
        });

        // Schema para validar pedido
        this.pedidoSchema = Joi.object({
            cliente: this.clienteSchema.required(),
            productos: Joi.array()
                .items(this.productoSchema)
                .min(1)
                .max(50)
                .required()
                .messages({
                    'array.min': 'Debe haber al menos 1 producto',
                    'array.max': 'No se pueden agregar más de 50 productos'
                }),
            tipoEntrega: Joi.string()
                .valid('retiro', 'delivery')
                .required()
        });

        // Schema para validar mensaje entrante
        this.mensajeSchema = Joi.object({
            from: Joi.string()
                .pattern(/^[0-9]+@(c\.us|g\.us|broadcast)$/)
                .required(),
            body: Joi.string()
                .max(4096)
                .allow('')
                .required(),
            timestamp: Joi.number().integer().positive().required()
        });
    }

    /**
     * Valida datos de cliente
     */
    validarCliente(data) {
        const { error, value } = this.clienteSchema.validate(data);
        if (error) {
            throw new Error(`Validación de cliente fallida: ${error.details[0].message}`);
        }
        return value;
    }

    /**
     * Valida datos de producto
     */
    validarProducto(data) {
        const { error, value } = this.productoSchema.validate(data);
        if (error) {
            throw new Error(`Validación de producto fallida: ${error.details[0].message}`);
        }
        return value;
    }

    /**
     * Valida datos de pedido
     */
    validarPedido(data) {
        const { error, value } = this.pedidoSchema.validate(data);
        if (error) {
            throw new Error(`Validación de pedido fallida: ${error.details[0].message}`);
        }
        return value;
    }

    /**
     * Valida mensaje entrante
     */
    validarMensaje(data) {
        const { error, value } = this.mensajeSchema.validate(data);
        if (error) {
            throw new Error(`Validación de mensaje fallida: ${error.details[0].message}`);
        }
        return value;
    }

    /**
     * Valida cantidad de productos
     */
    validarCantidad(cantidad) {
        const schema = Joi.number().integer().min(1).max(1000);
        const { error, value } = schema.validate(cantidad);
        if (error) {
            throw new Error(`Cantidad inválida: debe ser entre 1 y 1000`);
        }
        return value;
    }

    /**
     * Valida que el número de teléfono sea válido
     */
    esNumeroValido(telefono) {
        return /^[0-9]+@c\.us$/.test(telefono);
    }

    /**
     * Valida que el mensaje no esté vacío
     */
    esMensajeValido(texto) {
        return typeof texto === 'string' && texto.trim().length > 0 && texto.length <= 4096;
    }
}

module.exports = new MessageValidator();