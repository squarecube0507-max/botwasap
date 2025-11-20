const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

console.log('\n🔍 Buscando grupos de WhatsApp...\n');

client.on('qr', (qr) => {
    console.log('⚠️ Si ya tienes sesión iniciada, esto no debería aparecer.');
    console.log('⚠️ Si aparece un QR, escanéalo con tu WhatsApp.');
});

client.on('ready', async () => {
    console.log('✅ Bot conectado correctamente\n');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('📋 GRUPOS DISPONIBLES EN TU WHATSAPP:\n');
    console.log('═══════════════════════════════════════════════════\n');
    
    try {
        const chats = await client.getChats();
        const grupos = chats.filter(chat => chat.isGroup);
        
        if (grupos.length === 0) {
            console.log('⚠️ No se encontraron grupos.');
            console.log('💡 Crea un grupo en WhatsApp primero.\n');
        } else {
            grupos.forEach((grupo, index) => {
                console.log(`${index + 1}. 📌 Nombre: ${grupo.name}`);
                console.log(`   🆔 ID: ${grupo.id._serialized}`);
                console.log(`   👥 Participantes: ${grupo.participants.length}`);
                console.log('   ─────────────────────────────────────────\n');
            });
            
            console.log('═══════════════════════════════════════════════════\n');
            console.log('💡 INSTRUCCIONES:\n');
            console.log('1. Busca el grupo "🤖 Bot - Pedidos" en la lista de arriba');
            console.log('2. Copia el ID completo (ejemplo: 120363123456789012@g.us)');
            console.log('3. Pégalo en data/negocio.json en el campo "grupo_notificaciones"');
            console.log('\n═══════════════════════════════════════════════════\n');
        }
    } catch (error) {
        console.error('❌ Error al obtener grupos:', error);
    }
    
    await client.destroy();
    process.exit(0);
});

client.on('auth_failure', () => {
    console.error('❌ Error de autenticación. Elimina la carpeta .wwebjs_auth y vuelve a intentar.');
    process.exit(1);
});

client.initialize();