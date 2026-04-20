export const environment = {
  "production": false,
  "chainId": 31337,
  "adminAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "contracts": {
    "energyToken": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "energyMarket": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    "meterOracle": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "energyCertificate": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    "reputationSystem": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    "producerProfile": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
  },

  "apiKey": import.meta.env["NG_APP_PINATA_API_KEY"] || "",
  "apiSecret": import.meta.env["NG_APP_PINATA_API_SECRET"] || "",
  "jwt": import.meta.env["NG_APP_PINATA_JWT"] || "",
  "gateway": "https://gateway.pinata.cloud/ipfs/",
  "fallbackGateway": "https://ipfs.io/ipfs/"

};

