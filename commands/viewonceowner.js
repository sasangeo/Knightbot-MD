const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function handleViewOnce(sock, m) {
    try {
        const msg = m.message;
        if (!msg) return;

        // nomor owner
        const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // cek apakah pesan punya image atau video view once
        const viewOnceMsg = msg.viewOnceMessageV2?.message;
        const image = viewOnceMsg?.imageMessage;
        const video = viewOnceMsg?.videoMessage;

        if (image) {
            // download image
            const stream = await downloadContentFromMessage(image, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // laporan ke owner
            await sock.sendMessage(ownerNumber, {
                text: `👁️‍🗨️ *Auto Deteksi View Once*\n\n` +
                      `📸 Jenis: Gambar\n` +
                      `💬 Caption: ${image.caption || '(tidak ada)'}`
            });

            await sock.sendMessage(ownerNumber, {
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
            await sock.sendMessage(ownerNumber, {
                text: `👁️‍🗨️ *Auto Deteksi View Once*\n\n` +
                      `🎞️ Jenis: Video\n` +
                      `💬 Caption: ${video.caption || '(tidak ada)'}`
            });

            await sock.sendMessage(ownerNumber, {
                video: buffer,
                fileName: 'viewonce.mp4',
                caption: '🎞️ Konten View Once berhasil diambil.'
            });
        }

    } catch (err) {
        console.error('⚠️ Gagal ambil View Once:', err);
    }
}

module.exports = handleViewOnce;
