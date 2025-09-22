const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// .vv command handler (manual): reply ke pesan VO (image/video), bot ekstrak dan kirim ulang
// Mendukung berbagai struktur VO: viewOnceMessageV2, viewOnceMessageV2Extension, viewOnceMessage
async function viewonceCommand(sock, chatId, message) {
    try {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
        const current = message.message || {};

        // Unwrap helper untuk berbagai bentuk ViewOnce
        const unwrapVO = (msg) => {
            if (!msg) return null;
            const inner = msg.viewOnceMessageV2?.message
                || msg.viewOnceMessageV2Extension?.message
                || msg.viewOnceMessage?.message
                || null;
            if (inner?.imageMessage) return { type: 'image', node: inner.imageMessage };
            if (inner?.videoMessage) return { type: 'video', node: inner.videoMessage };
            // beberapa device langsung meletakkan flag di image/video
            if (msg.imageMessage && (msg.imageMessage.viewOnce || msg.imageMessage.view_once)) return { type: 'image', node: msg.imageMessage };
            if (msg.videoMessage && (msg.videoMessage.viewOnce || msg.videoMessage.view_once)) return { type: 'video', node: msg.videoMessage };
            return null;
        };

        // Prioritas: quoted VO → jika tidak ada, cek pesan saat ini
        const target = unwrapVO(quoted) || unwrapVO(current);
        if (!target) {
            await sock.sendMessage(chatId, { text: '❌ Balas (reply) pesan View Once (gambar/video) dengan perintah .vv' }, { quoted: message });
            return;
        }

        const stream = await downloadContentFromMessage(target.node, target.type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        if (target.type === 'image') {
            await sock.sendMessage(chatId, {
                image: buffer,
                fileName: 'viewonce.jpg',
                caption: target.node.caption || ''
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                video: buffer,
                fileName: 'viewonce.mp4',
                caption: target.node.caption || ''
            }, { quoted: message });
        }
    } catch (e) {
        console.error('viewonceCommand error:', e);
        await sock.sendMessage(chatId, { text: '⚠️ Gagal mengambil View Once. Coba reply ulang segera setelah diterima.' }, { quoted: message });
    }
}

module.exports = viewonceCommand;


