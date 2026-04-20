export const pinataConfig = {
  apiKey: import.meta.env["NG_APP_PINATA_API_KEY"] || "",
  apiSecret: import.meta.env["NG_APP_PINATA_API_SECRET"] || "",
  jwt: import.meta.env["NG_APP_PINATA_JWT"] || "",
  gateway: "https://gateway.pinata.cloud/ipfs/",
  fallbackGateway: "https://ipfs.io/ipfs/"
};
