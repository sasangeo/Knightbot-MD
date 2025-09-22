const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function viewonceCommand(sock, message) {
    // Ganti dengan nomor WhatsApp pribadi Anda (dalam format ID WhatsApp)
    const personalNumber = '+62xxxxxxxxxx@s.whatsapp.net';  // Gantilah dengan nomor Anda

    // Ekstrak quoted imageMessage atau videoMessage dari pesan
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedImage = quoted?.imageMessage;
    const quotedVideo = quoted?.videoMessage;

    // Cek apakah pesan adalah view once media
    if ((quotedImage && quotedImage.viewOnce) || (quotedVideo && quotedVideo.viewOnce)) {
        // Pastikan pesan bukan dari chat yang sama
        if (message.key.remoteJid !== personalNumber) {
            let buffer;
            let fileName = '';
            let caption = '';

            // Jika image
            if (quotedImage) {
                fileName = 'media.jpg';
                caption = quotedImage.caption || '';
                const stream = await downloadContentFromMessage(quotedImage, 'image');
                buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                await sock.sendMessage(personalNumber, { image: buffer, fileName, caption }, { quoted: message });
            }
            // Jika video
            else if (quotedVideo) {
                fileName = 'media.mp4';
                caption = quotedVideo.caption || '';
                const stream = await downloadContentFromMessage(quotedVideo, 'video');
                buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                await sock.sendMessage(personalNumber, { video: buffer, fileName, caption }, { quoted: message });
            }
        }
    }
}

module.exports = viewonceCommand;
