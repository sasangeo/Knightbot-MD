const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');

const messageStore = new Map();
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

// Pastikan folder tmp ada
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// Hitung ukuran folder dalam MB
const getFolderSizeInMB = (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        }

        return totalSize / (1024 * 1024);
    } catch (err) {
        console.error('⚠️ Gagal menghitung ukuran folder:', err);
        return 0;
    }
};

// Bersihkan folder tmp kalau >100 MB
const cleanTempFolderIfLarge = () => {
    try {
        const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);

        if (sizeMB > 100) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                const filePath = path.join(TEMP_MEDIA_DIR, file);
                fs.unlinkSync(filePath);
            }
            console.log('🧹 Folder tmp sudah dibersihkan (lebih dari 100MB).');
        }
    } catch (err) {
        console.error('⚠️ Gagal membersihkan folder tmp:', err);
    }
};

// Jalan tiap 1 menit untuk cek tmp folder
setInterval(cleanTempFolderIfLarge, 60 * 1000);

// Simpan pesan masuk
async function storeMessage(message) {
    try {
        if (!message.key?.id) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';

        const sender = message.key.participant || message.key.remoteJid;

        if (message.message?.conversation) {
            content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
            mediaType = 'gambar';
            content = message.message.imageMessage.caption || '';
            const buffer = await downloadContentFromMessage(message.message.imageMessage, 'image');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.stickerMessage) {
            mediaType = 'stiker';
            const buffer = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            const buffer = await downloadContentFromMessage(message.message.videoMessage, 'video');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Pesan tersimpan dari ${sender}`);
    } catch (err) {
        console.error('⚠️ Gagal menyimpan pesan:', err);
    }
}

// Tangani pesan yang dihapus
async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const messageId = revocationMessage.message.protocolMessage.key.id;
        const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;
        const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        const original = messageStore.get(messageId);
        if (!original) return;

        const sender = original.sender;
        const senderName = sender.split('@')[0];
        const groupName = original.group ? (await sock.groupMetadata(original.group)).subject : '';

        const time = new Date().toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        let text = `*🔰 LAPORAN ANTIDELETE 🔰*\n\n` +
            `*🗑️ Dihapus oleh:* @${deletedBy.split('@')[0]}\n` +
            `*👤 Pengirim asli:* @${senderName}\n` +
            `*📱 Nomor:* ${sender}\n` +
            `*🕒 Waktu:* ${time}\n`;

        if (groupName) text += `*👥 Grup:* ${groupName}\n`;

        if (original.content) {
            text += `\n*💬 Isi pesan yang dihapus:*\n${original.content}`;
        }

        await sock.sendMessage(ownerNumber, {
            text,
            mentions: [deletedBy, sender]
        });

        // Kirim media kalau ada
        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOptions = {
                caption: `*Pesan ${original.mediaType} yang dihapus*\nDari: @${senderName}`,
                mentions: [sender]
            };

            try {
                switch (original.mediaType) {
                    case 'gambar':
                        await sock.sendMessage(ownerNumber, {
                            image: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'stiker':
                        await sock.sendMessage(ownerNumber, {
                            sticker: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'video':
                        await sock.sendMessage(ownerNumber, {
                            video: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                }
                console.log(`📤 Media ${original.mediaType} dikirim ke Owner`);
            } catch (err) {
                await sock.sendMessage(ownerNumber, {
                    text: `⚠️ Gagal mengirim media: ${err.message}`
                });
            }

            try {
                fs.unlinkSync(original.mediaPath);
                console.log('🧹 Media sementara dihapus dari tmp.');
            } catch (err) {
                console.error('⚠️ Gagal hapus media sementara:', err);
            }
        }

        messageStore.delete(messageId);
        console.log('✅ Laporan antidelete selesai diproses.');

    } catch (err) {
        console.error('⚠️ Error saat proses antidelete:', err);
    }
}

module.exports = {
    storeMessage,
    handleMessageRevocation
};
