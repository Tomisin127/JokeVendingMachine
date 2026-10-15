// Vercel Serverless Function — GET /api/health (no payment required)
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const seller =
    process.env.SELLER_ADDRESS ?? process.env.VITE_SELLER_ADDRESS ?? "(not set)";
  res.json({
    status: "ok",
    service: "joke-seller",
    price: "$0.001 USDC per joke",
    seller,
    endpoint: "/api/joke",
  });
}
