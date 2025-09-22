const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// .vv command handler (manual): reply ke pesan VO (image/video), bot ekstrak dan kirim ulang
// Mendukung berbagai struktur VO: viewOnceMessageV2, viewOnceMessageV2Extension, viewOnceMessage
async function viewonceCommand(sock, chatId, message) {
    try {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
        const current = message.message || {};

        // Unwrap helper untuk berbagai bentuk ViewOnce (termasuk nested message.message & ephemeral)
        const unwrapVO = (rawMsg) => {
            if (!rawMsg) return null;
            const base = rawMsg.ephemeralMessage?.message || rawMsg;
            let inner = base.viewOnceMessageV2?.message
                || base.viewOnceMessageV2Extension?.message
                || base.viewOnceMessage?.message
                || null;
            // Beberapa versi meng-nest lagi di .message.message
            if (inner?.message) inner = inner.message;
            if (inner?.message) inner = inner.message;

            if (inner?.imageMessage) return { type: 'image', node: inner.imageMessage };
            if (inner?.videoMessage) return { type: 'video', node: inner.videoMessage };
            // beberapa device langsung meletakkan flag di image/video
            if (base.imageMessage && (base.imageMessage.viewOnce || base.imageMessage.view_once)) return { type: 'image', node: base.imageMessage };
            if (base.videoMessage && (base.videoMessage.viewOnce || base.videoMessage.view_once)) return { type: 'video', node: base.videoMessage };
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


