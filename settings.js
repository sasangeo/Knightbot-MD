const settings = {
  packname: 'Knight Bot',
  author: '‎',
  botName: "Knight Bot",
  botOwner: 'Professor', // Your name
  ownerNumber: '6288293927464', //Set your number here without + symbol, just add country code & number without any space
  giphyApiKey: 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  commandMode: "public",
  maxStoreMessages: 20, 
  storeWriteInterval: 10000,
  description: "This is a bot for managing group commands and automating tasks.",
  version: "2.1.9",
  updateZipUrl: "https://github.com/mruniquehacker/Knightbot-MD/archive/refs/heads/main.zip",
  // Optional: set group JIDs (ends with @g.us) to receive reports
  // Leave empty strings to fallback to owner chat
  reportGroups: {
    antidelete: "120363422048399587@g.us",
    viewonce: "120363403042326976@g.us"
  }
};

module.exports = settings;
