// src/config/constants.js
/**
 * ═══════════════════════════════════════════════════════════════
 * ⚙️ CONSTANTES Y CONFIGURACIONES
 * ═══════════════════════════════════════════════════════════════
 */

module.exports = {
    // Tiempos
    TIEMPO_EXPIRACION_SESION: 10 * 60 * 1000, // 10 minutos
    
    // Emojis de categorías
    EMOJIS_CATEGORIA: {
        'libreria': '📚',
        'cotillon': '🎉',
        'jugueteria': '🧸',
        'juguetes': '🧸',
        'impresiones': '🖨️',
        'fotocopiadora': '📄',
        'bijou': '💍',
        'accesorios_celular': '📱',
        'accesorio_para_celular': '📱',
        'accesorios_computadora': '💻',
        'higiene': '🧼',
        'limpieza': '🧹',
        'alimentos': '🍎',
        'bebidas': '🥤',
        'deportes': '⚽',
        'herramientas': '🔧',
        'electronica': '🔌',
        'ropa': '👕',
        'varios': '📦',
    },
    
    // Números en texto
    NUMEROS_TEXTO: {
        'un': 1, 'una': 1, 'uno': 1,
        'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
        'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
    },
    
    // Palabras para filtrado de mensajes personales
    MENSAJES_PERSONALES: [
        'amor', 'amorsito', 'amorsiii', 'bb', 'bebe', 'mi amor',
        'corazon', 'cielo', 'vida', 'hermosa', 'hermoso', 'lindo', 'linda',
        'te amo', 'te quiero', 'te extraño', 'extraño',
        'jaja', 'jeje', 'jiji', 'lol', 'xd',
        'como estas', 'como andas', 'que haces', 'que tal',
        'bueno', 'dale', 'sisi', 'oki', 'okay',
        'gracias', 'grax', 'muchas gracias',
        'perdon', 'disculpa', 'sorry',
        'chau', 'adios', 'nos vemos', 'hasta luego'
    ],
    
    // Palabras de intención comercial
    PALABRAS_INTENCION: [
        'precio', 'cuanto', 'cuánto', 'cuesta', 'valor', 'sale',
        'venden', 'vende', 'tienen', 'tiene', 'hay', 'tenes',
        'stock', 'disponible', 'disponibilidad',
        'comprar', 'quiero', 'necesito', 'busco', 'me interesa',
        'pedido', 'pedir', 'encargar', 'reservar',
        'catalogo', 'catálogo', 'lista', 'menu', 'menú',
        'horario', 'ubicacion', 'ubicación', 'direccion', 'dirección',
        'entrega', 'delivery', 'envio', 'envío',
        'pago', 'efectivo', 'tarjeta', 'transferencia',
        'higiene', 'limpieza', 'limpiador', 'desinfectante',
        'juguete', 'juguetes', 'jugueteria',
        'cumpleaños', 'cumpleanos', 'fiesta', 'evento',
        'regalo', 'regalar', 'obsequio', 'sorpresa',
        'decoracion', 'decoración', 'adornar',
        'niña', 'niño', 'nena', 'nene', 'chico', 'chica', 'hijo', 'hija',
        'infantil', 'bebe', 'bebé',
        'recomienda', 'recomendas', 'recomendar', 'sugieres', 'sugerir', 'aconsejas',
        'opciones', 'alternativas', 'ideas', 'que me das', 'que tenes'
    ],
    
    // Saludos comerciales
    SALUDOS_COMERCIALES: [
        'hola quiero', 'hola necesito', 'hola busco',
        'buenos dias quiero', 'buenos días quiero',
        'buenas tardes quiero', 'buenas noches quiero',
        'hola, quiero', 'hola consulta', 'consulta por',
        'hola precio', 'hola cuanto'
    ],
    
    // Aliases de categorías
    MAPA_ALIASES: {
        'juguete': 'juguetes',
        'juguetes': 'juguetes',
        'jugueteria': 'juguetes',
        
        'impresion': 'impresiones',
        'impresiones': 'impresiones',
        'imprenta': 'impresiones',
        'fotocopia': 'impresiones',
        'fotocopias': 'impresiones',
        'fotocopiadora': 'impresiones',
        
        'libreria': 'libreria',
        'libros': 'libreria',
        
        'cotillon': 'cotillon',
        'fiesta': 'cotillon',
        
        'bijou': 'bijou',
        'bijouterie': 'bijou',
        'joyas': 'bijou',
        
        'celular': 'accesorio_para_celular',
        'celu': 'accesorio_para_celular',
        'telefono': 'accesorio_para_celular',
        'accesorio_celular': 'accesorio_para_celular',
        'accesorio_de_celular': 'accesorio_para_celular',
        'accesorio_para_celular': 'accesorio_para_celular',
        'accesorios_celular': 'accesorio_para_celular',
        'accesorios_para_celular': 'accesorio_para_celular',
        'accesorios_de_celular': 'accesorio_para_celular',
        
        'computadora': 'accesorios_computadora',
        'pc': 'accesorios_computadora',
        'compu': 'accesorios_computadora',
        
        'higiene': 'higiene',
        'limpieza': 'limpieza',
    }
};