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

const app = express();
app.use(express.json());

// CORS so the Vite frontend can reach this server
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT, X-PAYMENT-RESPONSE");
  res.setHeader("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE, PAYMENT-REQUIRED");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

const gateway = createGatewayMiddleware({
  sellerAddress: process.env.SELLER_ADDRESS ?? process.env.VITE_SELLER_ADDRESS,
  facilitatorUrl: "https://gateway-api.circle.com",
  // Arc mainnet only. Arc testnet is 5042002.
  networks: "eip155:5042",
});

// Health check — no payment required
app.get(["/health", "/api/health"], (_req, res) => {
  res.json({ status: "ok", service: "joke-seller", price: "$0.001 USDC per joke" });
});

// Paid joke endpoint — 0.001 USDC per call
app.get(["/joke", "/api/joke"], gateway.require("$0.001"), (req: PaidRequest, res) => {
  const { payer, amount, network } = req.payment!;
  const formattedAmount = (Number(amount) / 1_000_000).toFixed(6);
  const joke = JOKES[Math.floor(Math.random() * JOKES.length)];

  console.log(
    `[joke-server] Joke sold for ${formattedAmount} USDC by ${payer} on ${network}`
  );

  res.json({
    joke,
    paid_by: payer,
    amount_usdc: formattedAmount,
    network,
    transaction: req.payment?.transaction ?? null,
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[joke-server] Listening on http://localhost:${PORT}`);
  console.log(`[joke-server] GET /joke  — $0.001 USDC via x402 Gateway Nanopayments`);
});
