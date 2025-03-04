"use client";

import { useEffect, useState } from "react";

interface Transaction {
  hash: string;
  gasUsed: number;
  gasPrice: number;
  gasFee: number;
  from: string;
  timestamp: number;
}

export default function GasPriceTracer() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [now, setNow] = useState<number | undefined>(undefined); // ✅ Fix hydration issue
  const [visibleTxns, setVisibleTxns] = useState<number>(3);

  // ✅ Fix hydration error by delaying 'now' update until after mount
  useEffect(() => {
    setNow(Date.now());
  }, []);

  useEffect(() => {
    async function fetchGasPrices() {
      try {
        const res = await fetch("https://testnet-rpc.monad.xyz/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBlockByNumber",
            params: ["latest", true],
            id: 1,
          }),
        });

        const data = await res.json();
        const txns: Transaction[] = data.result.transactions.map((tx: any) => ({
          hash: tx.hash ?? "Unknown",
          gasUsed: parseInt(tx.gas ?? "0", 16),
          gasPrice: parseInt(tx.gasPrice ?? "0", 16),
          gasFee: (parseInt(tx.gas ?? "0", 16) * parseInt(tx.gasPrice ?? "0", 16)) / 1e18, // In MON
          from: tx.from ?? "Unknown",
          timestamp: tx.timestamp ? parseInt(tx.timestamp, 16) * 1000 : Date.now(),
        }));

        setTransactions(txns);
      } catch (error) {
        console.error("Error fetching gas prices:", error);
      }
      setLoading(false);
    }

    if (now !== undefined) fetchGasPrices(); // ✅ Only fetch data after hydration
  }, [now]);

  function calcAvg(txns: Transaction[]): string {
    return txns.length
      ? (txns.reduce((sum, tx) => sum + (tx.gasFee ?? 0), 0) / txns.length).toFixed(6)
      : "0.000000";
  }

  useEffect(() => {
    function updateVisibleTxns() {
      const width = window.innerWidth;
      setVisibleTxns(width > 1200 ? 5 : width > 768 ? 3 : 1);
    }

    updateVisibleTxns();
    window.addEventListener("resize", updateVisibleTxns);
    return () => window.removeEventListener("resize", updateVisibleTxns);
  }, []);

  if (now === undefined) return <p className="text-center text-gray-400">⏳ Initializing...</p>; // ✅ Fix hydration issue

  const lastHrTxns = transactions.filter((tx) => now - tx.timestamp <= 3600000);
  const last12HrTxns = transactions.filter((tx) => now - tx.timestamp <= 43200000);
  const last24HrTxns = transactions.filter((tx) => now - tx.timestamp <= 86400000);

  const avgGasFees = {
    last1hr: calcAvg(lastHrTxns),
    last12hr: calcAvg(last12HrTxns),
    last24hr: calcAvg(last24HrTxns),
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-mono font-bold text-center mb-4">⛽ Monad Gas Price Tracker</h1>

      {/* 🟢 Centered Average Gas Fees */}
      <div className="p-4 bg-gray-800 rounded-lg shadow mb-4 text-center">
        <p className="text-lg font-mono">⏳ Avg Gas Fee (Last 1hr): <span className="text-green-400">{avgGasFees.last1hr} MON</span></p>
        <p className="text-lg font-mono">⏳ Avg Gas Fee (Last 12hr): <span className="text-green-400">{avgGasFees.last12hr} MON</span></p>
        <p className="text-lg font-mono">⏳ Avg Gas Fee (Last 24hr): <span className="text-green-400">{avgGasFees.last24hr} MON</span></p>
      </div>

      {loading ? (
        <p className="text-center text-gray-400">⏳ Loading transactions...</p>
      ) : (
        <div className="space-y-3">
          {transactions.slice(0, visibleTxns).map((tx, index) => (
            <div key={index} className="p-3 bg-gray-800 rounded-lg shadow border border-green-500">
              <p className="text-sm">🔗 Txn: {tx.hash.slice(0, 12)}...</p>
              <p>💰 Gas Used: {tx.gasUsed}</p>
              <p>🔥 Gas Price: {tx.gasPrice} wei</p>
              <p className="text-green-400">💸 Total Gas Fee: {tx.gasFee.toFixed(6)} MON</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
