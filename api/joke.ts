// Vercel Serverless Function — GET /api/joke
// Protected by Circle Gateway Nanopayments via x402 ($0.001 USDC per call)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
type PaidRequest = express.Request & {
  payment?: {
    verified: boolean;
    payer: string;
    amount: string;
    network: string;
    transaction?: string;
  };
};

const JOKES = [
  "Why don't scientists trust atoms? Because they make up everything.",
  "I told my doctor I broke my arm in two places. He told me to stop going to those places.",
  "Why did the scarecrow win an award? Because he was outstanding in his field.",
  "Why can't you explain puns to kleptomaniacs? They always take things literally.",
  "I'm reading a book on anti-gravity. It's impossible to put down.",
  "Why did the math book look so sad? Because it had too many problems.",
  "I asked the librarian if the library had books about paranoia. She whispered, 'They're right behind you.'",
  "Why do cows wear bells? Because their horns don't work.",
  "I used to hate facial hair, but then it grew on me.",
  "What do you call a fake noodle? An impasta.",
  "Why did the bicycle fall over? It was two-tired.",
  "What do you call cheese that isn't yours? Nacho cheese.",
  "I told my wife she was drawing her eyebrows too high. She looked surprised.",
  "Why don't eggs tell jokes? They'd crack each other up.",
  "I'm on a seafood diet. I see food and I eat it.",
];

// Module-scope Express app — Vercel reuses the module across warm invocations
const app = express();
app.use(express.json());

// CORS — allow any origin so agents and browsers can both call this
app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-PAYMENT, X-PAYMENT-RESPONSE"
  );
  res.setHeader("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE, PAYMENT-REQUIRED");
  if (_req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

const sellerAddress = process.env.SELLER_ADDRESS ?? process.env.VITE_SELLER_ADDRESS;
// Arc mainnet chain ID is 5042000 (Arc testnet is 5042002). Keep this
// endpoint mainnet-only so payments from other networks are rejected.
const arcMainnet = "eip155:5042000";

const gateway = sellerAddress
  ? createGatewayMiddleware({
      sellerAddress,
      facilitatorUrl: "https://gateway-api.circle.com",
      networks: arcMainnet,
    })
  : null;

app.get("/api/joke", (req: PaidRequest, res, next) => {
  if (!gateway) {
    res.status(500).json({
      error: "Payment service is not configured",
      detail: "Set SELLER_ADDRESS to the Arc mainnet recipient wallet.",
    });
    return;
  }
  return gateway.require("$0.001")(req, res, next);
}, (req: PaidRequest, res) => {
  const { payer, amount, network } = req.payment!;
  const formattedAmount = (Number(amount) / 1_000_000).toFixed(6);
  const joke = JOKES[Math.floor(Math.random() * JOKES.length)];

  console.log(`[joke] Sold for ${formattedAmount} USDC by ${payer} on ${network}`);

  res.json({
    joke,
    paid_by: payer,
    amount_usdc: formattedAmount,
    network,
    transaction: req.payment?.transaction ?? null,
  });
});

// Vercel entry point — delegate to Express
export default function handler(req: VercelRequest, res: VercelResponse) {
  // @ts-expect-error — Vercel req/res are Node http types; Express accepts them
  app(req, res);
}
