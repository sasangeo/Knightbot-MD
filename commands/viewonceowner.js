const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const settings = require('../settings');

function findViewOnceTarget(rawMsg) {
    if (!rawMsg) return null;
    const root = rawMsg.ephemeralMessage?.message || rawMsg;

    const isWrapperKey = (key) => (
        key === 'viewOnceMessage' || key === 'viewOnceMessageV2' || key === 'viewOnceMessageV2Extension'
    );

    function walk(node, insideVO) {
        if (!node || typeof node !== 'object') return null;
        let current = node.message ? node.message : node;
        if (current && current.message) current = current.message;

        if (current.imageMessage) {
            const im = current.imageMessage;
            if (insideVO || im.viewOnce || im.view_once) return { type: 'image', node: im };
        }
        if (current.videoMessage) {
            const vm = current.videoMessage;
            if (insideVO || vm.viewOnce || vm.view_once) return { type: 'video', node: vm };
        }

        for (const [key, value] of Object.entries(current)) {
            if (!value || typeof value !== 'object') continue;
            const nextInside = insideVO || isWrapperKey(key);
            const found = walk(value, nextInside);
            if (found) return found;
        }
        return null;
    }

    return walk(root, false);
}

async function handleViewOnce(sock, m) {
    try {
        const msg = m.message;
        if (!msg) return;

        // tujuan laporan: prioritas ke group report viewonce jika di-set, fallback ke owner
        const fallbackOwner = (settings.ownerNumber ? settings.ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : (sock.user.id.split(':')[0] + '@s.whatsapp.net'));
        const targetJid = (settings.reportGroups && settings.reportGroups.viewonce) ? settings.reportGroups.viewonce : fallbackOwner;
        try { console.log('🛈 VIEWONCE target:', targetJid); } catch {}

        const target = findViewOnceTarget(msg);
        const image = target?.type === 'image' ? target.node : null;
        const video = target?.type === 'video' ? target.node : null;

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

handleViewOnce.findViewOnceTarget = findViewOnceTarget;
module.exports = handleViewOnce;
