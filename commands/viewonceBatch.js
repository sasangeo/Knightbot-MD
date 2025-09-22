const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// buffer laporan & media
let laporanBuffer = [];
let mediaQueue = [];
let laporanTimer = null;

async function processMediaQueue(sock, ownerNumber) {
    if (mediaQueue.length === 0) return;

    const item = mediaQueue.shift();
    try {
        if (item.type === 'image') {
            await sock.sendMessage(ownerNumber, {
                image: item.buffer,
                fileName: item.fileName,
                caption: item.caption
            });
        } else if (item.type === 'video') {
            await sock.sendMessage(ownerNumber, {
                video: item.buffer,
                fileName: item.fileName,
                caption: item.caption
            });
        }
    } catch (err) {
        console.error("⚠️ Gagal kirim media:", err);
    }

    // kasih jeda 3 detik sebelum media berikutnya
    setTimeout(() => processMediaQueue(sock, ownerNumber), 3000);
}

async function handleViewOnce(sock, message) {
    try {
        const m = message.message;
        if (!m) return;

        const viewOnceMsg = m?.viewOnceMessageV2?.message || m?.viewOnceMessage?.message;
        if (!viewOnceMsg) return;

        const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const sender = message.key.participant || message.key.remoteJid;
        const fromGroup = message.key.remoteJid.endsWith('@g.us');

        let senderInfo = sender.replace('@s.whatsapp.net', '');
        let groupInfo = fromGroup ? ` (Group: ${message.pushName || 'Tanpa Nama'})` : ' (Private Chat)';

        if (viewOnceMsg.imageMessage) {
            const img = viewOnceMsg.imageMessage;
            const stream = await downloadContentFromMessage(img, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // simpan laporan teks
            laporanBuffer.push(`📸 Gambar dari ${senderInfo}${groupInfo} — Caption: ${img.caption || '(kosong)'}`);

            // antri media
            mediaQueue.push({
                type: 'image',
                buffer,
                fileName: 'viewonce.jpg',
                caption: '📸 Konten View Once'
            });

        } else if (viewOnceMsg.videoMessage) {
            const vid = viewOnceMsg.videoMessage;
            const stream = await downloadContentFromMessage(vid, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            laporanBuffer.push(`🎞️ Video dari ${senderInfo}${groupInfo} — Caption: ${vid.caption || '(kosong)'}`);

            mediaQueue.push({
                type: 'video',
                buffer,
                fileName: 'viewonce.mp4',
                caption: '🎞️ Konten View Once'
            });
        }

        // kirim laporan teks (batching, 5 detik window)
        if (!laporanTimer) {
            laporanTimer = setTimeout(async () => {
                if (laporanBuffer.length > 0) {
                    let laporanText = "👁️‍🗨️ *Laporan View Once* (" + laporanBuffer.length + " Media)\n\n";
                    laporanText += laporanBuffer.map((t, i) => `${i + 1}. ${t}`).join("\n");

                    await sock.sendMessage(ownerNumber, { text: laporanText });
                    laporanBuffer = [];
                }
                laporanTimer = null;

                // mulai proses antrian media
                processMediaQueue(sock, ownerNumber);
            }, 5000);
        }

    } catch (err) {
        console.error("⚠️ Gagal handle view once:", err);
    }
}

module.exports = handleViewOnce;
