import type { VercelRequest, VercelResponse } from "@vercel/node";

const sellerAddress = process.env.SELLER_ADDRESS ?? process.env.VITE_SELLER_ADDRESS ?? "0x0000000000000000000000000000000000000000";

const document = {
  openapi: "3.1.0",
  info: {
    title: "Joke Vending Machine API",
    version: "1.0.0",
    description: "A paid API that returns a random joke after x402 payment settlement.",
    contact: { email: "team@joke-vending-machine.vercel.app" },
    "x-guidance": "Returns one random joke after a $0.001 USDC x402 payment. Input: no request body or query fields. Output: joke text, payer, amount, network, and transaction. Call when an agent needs a quick joke and can pay on Arc or Polygon.",
  },
  externalDocs: { url: "https://joke-vending-machine.vercel.app/openapi.json" },
  servers: [{ url: "https://joke-vending-machine.vercel.app" }],
  paths: {
    "/joke": {
      get: {
        operationId: "getRandomJoke",
        summary: "Buy a random joke",
        description: "Returns a random joke after the x402 payment is verified and settled.",
        "x-payment": {
          protocol: "x402",
          price: "0.001",
          currency: "USDC",
          accepts: [
            { scheme: "exact", network: "eip155:5042", asset: "0x3600000000000000000000000000000000000000", payTo: sellerAddress },
            { scheme: "exact", network: "eip155:137", asset: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", payTo: sellerAddress },
          ],
        },
        responses: {
          "200": {
            description: "A joke returned after successful payment.",
            content: { "application/json": { schema: { "$ref": "#/components/schemas/JokeResponse" } } },
          },
          "402": { description: "Payment required. Inspect PAYMENT-REQUIRED for x402 payment requirements." },
        },
      },
    },
  },
  components: {
    schemas: {
      JokeResponse: {
        type: "object",
        required: ["joke", "paid_by", "amount_usdc", "network", "transaction"],
        properties: {
          joke: { type: "string", description: "The randomly selected joke text." },
          paid_by: { type: "string", description: "Wallet address that supplied the payment." },
          amount_usdc: { type: "string", description: "Settled payment amount in USDC, formatted to six decimals." },
          network: { type: "string", description: "CAIP-2 network identifier used for settlement." },
          transaction: { type: ["string", "null"], description: "Settlement transaction hash, when available." },
        },
      },
    },
  },
};

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(document);
}
