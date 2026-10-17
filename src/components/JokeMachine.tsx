import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Laugh, Zap, Copy, Check, AlertCircle, Loader2 } from "lucide-react";

type JokeResult = {
  joke: string;
  paid_by: string;
  amount_usdc: string;
  network: string;
  transaction: string | null;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: JokeResult }
  | { status: "error"; message: string };

export default function JokeMachine() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [copied, setCopied] = useState(false);

  async function fetchJoke() {
    setState({ status: "loading" });
    try {
      const endpoint = `${window.location.origin}/api/joke`;
      const res = await fetch(endpoint);

      if (res.status === 402) {
        // Surface the 402 details — this is the expected unpaid response
        const body = await (res.json() as Promise<Record<string, unknown>>).catch(() => ({}));
        const paymentHeader = res.headers.get("PAYMENT-REQUIRED");
        setState({
          status: "error",
          message:
            `Payment required (HTTP 402). This endpoint costs $0.001 USDC via x402. ` +
            `Pay with: circle services pay "${window.location.origin}/api/joke" -X GET --max-amount 0.001 --network arc` +
            (paymentHeader ? `\n\nPayment details: ${paymentHeader}` : "") +
            (body ? `\n\nBody: ${JSON.stringify(body, null, 2)}` : ""),
        });
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        setState({ status: "error", message: `Server error ${res.status}: ${text}` });
        return;
      }

      const data = await (res.json() as Promise<JokeResult>);
      setState({ status: "success", data });
    } catch (err: unknown) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  function copyCommand() {
    const cmd = `circle services pay "${window.location.origin}/api/joke" -X GET --max-amount 0.001 --network arc`;
    void navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const payCmd = `circle services pay "${window.location.origin}/api/joke" -X GET --max-amount 0.001 --network arc`;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--bg-gradient)" }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
          style={{ background: "var(--surface-muted)", color: "var(--muted)", border: "1px solid var(--border)" }}>
          <Zap size={12} />
          x402 — Arc Mainnet
        </div>
        <h1 className="display text-4xl font-bold mb-2" style={{ color: "var(--ink)", letterSpacing: "-0.03em" }}>
          Joke Vending Machine
        </h1>
        <p className="text-base" style={{ color: "var(--muted)" }}>
          Each joke costs <span className="font-semibold tabular-nums" style={{ color: "var(--ink)" }}>$0.001 USDC</span> — paid instantly via x402.
        </p>
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md rounded-2xl p-6 shadow-lg mb-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Joke display area */}
        <div className="min-h-[120px] flex flex-col items-center justify-center mb-6 rounded-xl p-4"
          style={{ background: "var(--surface-muted)" }}>
          <AnimatePresence mode="wait">
            {state.status === "idle" && (
              <motion.div key="idle"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 text-center">
                <Laugh size={40} style={{ color: "var(--subtle)" }} />
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Pay $0.001 USDC to reveal a joke
                </p>
              </motion.div>
            )}

            {state.status === "loading" && (
              <motion.div key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
                <p className="text-sm" style={{ color: "var(--muted)" }}>Verifying payment...</p>
              </motion.div>
            )}

            {state.status === "success" && (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-center space-y-3">
                <p className="text-base font-medium leading-relaxed text-balance" style={{ color: "var(--ink)" }}>
                  &ldquo;{state.data.joke}&rdquo;
                </p>
                <div className="flex flex-col gap-1 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                  <span className="text-xs tabular-nums" style={{ color: "var(--subtle)" }}>
                    Paid: {state.data.amount_usdc} USDC on {state.data.network}
                  </span>
                  <span className="mono text-xs truncate" style={{ color: "var(--subtle)" }}>
                    By: {state.data.paid_by.slice(0, 10)}...{state.data.paid_by.slice(-8)}
                  </span>
                </div>
              </motion.div>
            )}

            {state.status === "error" && (
              <motion.div key="error"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 text-center">
                <AlertCircle size={28} style={{ color: "var(--danger)" }} />
                <p className="text-xs leading-relaxed max-w-[280px] text-balance"
                  style={{ color: "var(--danger)" }}>
                  {state.message.split("\n")[0]}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { void fetchJoke(); }}
          disabled={state.status === "loading"}
          className="w-full py-3 px-6 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "#fff",
          }}
        >
          {state.status === "loading" ? "Verifying..." : state.status === "success" ? "Another joke — $0.001 USDC" : "Get a joke — $0.001 USDC"}
        </motion.button>

        {state.status === "success" && (
          <p className="text-center text-xs mt-3" style={{ color: "var(--success)" }}>
            Payment verified and settled via Gateway
          </p>
        )}
      </motion.div>

      {/* CLI pay command card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md rounded-2xl p-5 shadow-sm"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Pay with Circle CLI
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--surface-muted)", color: "var(--muted)", border: "1px solid var(--border)" }}>
            Arc Mainnet
          </span>
        </div>

        <div className="relative rounded-xl overflow-hidden">
          <pre className="mono text-xs p-4 pr-12 overflow-x-auto leading-relaxed"
            style={{ background: "var(--surface-muted)", color: "var(--ink-2)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {payCmd}
          </pre>
          <button
            onClick={copyCommand}
            className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors"
            style={{ background: "var(--surface-strong)", color: "var(--muted)" }}
            title="Copy command"
          >
            {copied ? <Check size={14} style={{ color: "var(--success)" }} /> : <Copy size={14} />}
          </button>
        </div>

        <div className="mt-4 space-y-2 text-xs" style={{ color: "var(--muted)" }}>
          <div className="flex items-start gap-2">
            <span className="mono text-xs px-1.5 py-0.5 rounded"
              style={{ background: "var(--surface-muted)", color: "var(--ink-2)", flexShrink: 0 }}>
              GET /joke
            </span>
            <span>Returns 402 without a valid x402 payment header</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mono text-xs px-1.5 py-0.5 rounded"
              style={{ background: "var(--surface-muted)", color: "var(--ink-2)", flexShrink: 0 }}>
              GET /health
            </span>
            <span>Free health check — service info, no payment needed</span>
          </div>
        </div>
      </motion.div>

      {/* Seller address info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-xs mt-6 max-w-sm text-balance"
        style={{ color: "var(--subtle)" }}
      >
        USDC settlements go to{" "}
        <span className="mono" style={{ color: "var(--muted)" }}>
          {import.meta.env.VITE_SELLER_ADDRESS
            ? `${(import.meta.env.VITE_SELLER_ADDRESS as string).slice(0, 8)}...${(import.meta.env.VITE_SELLER_ADDRESS as string).slice(-6)}`
            : "seller address not configured"}
        </span>
        {" "}via Circle Gateway.
      </motion.p>
    </div>
  );
}
