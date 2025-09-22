const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const settings = require('../settings');

async function handleViewOnce(sock, m) {
    try {
        const msg = m.message;
        if (!msg) return;

        // tujuan laporan: prioritas ke group report viewonce jika di-set, fallback ke owner
        const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const targetJid = (settings.reportGroups && settings.reportGroups.viewonce) ? settings.reportGroups.viewonce : ownerNumber;
        try { console.log('🛈 VIEWONCE target:', targetJid); } catch {}

        // cek apakah pesan punya image atau video view once (cover beberapa varian struktur)
        const viewOnceMsg = (
            msg.viewOnceMessageV2?.message ||
            msg.viewOnceMessageV2Extension?.message ||
            msg.viewOnceMessage?.message ||
            null
        );
        // Fallback: beberapa device mengirim langsung imageMessage/videoMessage dengan flag viewOnce
        const imgDirect = (msg.imageMessage && (msg.imageMessage.viewOnce || msg.imageMessage.view_once)) ? msg.imageMessage : null;
        const vidDirect = (msg.videoMessage && (msg.videoMessage.viewOnce || msg.videoMessage.view_once)) ? msg.videoMessage : null;
        const image = viewOnceMsg?.imageMessage || imgDirect;
        const video = viewOnceMsg?.videoMessage || vidDirect;

        if (image) {
            // download image
            const stream = await downloadContentFromMessage(image, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // laporan ke owner
            await sock.sendMessage(targetJid, {
                text: `👁️‍🗨️ *Auto Deteksi View Once*\n\n` +
                      `📸 Jenis: Gambar\n` +
                      `💬 Caption: ${image.caption || '(tidak ada)'}`
            });

            await sock.sendMessage(targetJid, {
                image: buffer,
                fileName: 'viewonce.jpg',
                caption: '📸 Konten View Once berhasil diambil.'
            });

        } else if (video) {
            // download video
            const stream = await downloadContentFromMessage(video, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // laporan ke owner
            await sock.sendMessage(targetJid, {
                text: `👁️‍🗨️ *Auto Deteksi View Once*\n\n` +
                      `🎞️ Jenis: Video\n` +
                      `💬 Caption: ${video.caption || '(tidak ada)'}`
            });

            await sock.sendMessage(targetJid, {
                video: buffer,
                fileName: 'viewonce.mp4',
                caption: '🎞️ Konten View Once berhasil diambil.'
            });
        } else {
            // Tidak terdeteksi varian saat ini; log untuk debug struktur aktual
            try { console.log('⚠️ VO tidak terdeteksi. Keys:', Object.keys(msg || {})); } catch {}
        }

    } catch (err) {
        console.error('⚠️ Gagal ambil View Once:', err);
    }
}

module.exports = handleViewOnce;
