import React, { useState, useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  useParams,
} from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

// --- TAMBOLA TICKET GENERATOR ---
const generateTicketData = () => {
  const ticket = Array.from({ length: 3 }, () => Array(9).fill(null));
  const colRanges = [
    [1, 9],
    [10, 19],
    [20, 29],
    [30, 39],
    [40, 49],
    [50, 59],
    [60, 69],
    [70, 79],
    [80, 90],
  ];
  const shuffledCols = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(
    () => Math.random() - 0.5,
  );
  shuffledCols.forEach((col, i) => {
    ticket[i % 3][col] = true;
  });
  ticket.forEach((row, rIdx) => {
    const current = row.filter((c) => c !== null).length;
    row
      .map((c, i) => (c === null ? i : -1))
      .filter((i) => i !== -1)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5 - current)
      .forEach((col) => {
        ticket[rIdx][col] = true;
      });
  });
  const used = new Set();
  for (let c = 0; c < 9; c++) {
    const [min, max] = colRanges[c];
    const nums = [];
    const count = ticket.filter((r) => r[c] === true).length;
    while (nums.length < count) {
      const n = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!used.has(n)) {
        nums.push(n);
        used.add(n);
      }
    }
    nums.sort((a, b) => a - b);
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      if (ticket[r][c] === true) ticket[r][c] = nums[idx++];
    }
  }
  return ticket;
};

// --- PLAYER TICKET VIEW ---
const PlayerTicketView = () => {
  const { playerId } = useParams();
  const [playerData, setPlayerData] = useState(null);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [userSelections, setUserSelections] = useState([]);

  useEffect(() => {
    const sync = () => {
      const allPlayers = JSON.parse(
        localStorage.getItem("housie_players") || "[]",
      );
      const current = allPlayers.find((p) => p.id.toString() === playerId);
      setPlayerData(current);
      setCalledNumbers(
        JSON.parse(localStorage.getItem("housie_called") || "[]"),
      );
    };
    const interval = setInterval(sync, 1000);
    return () => clearInterval(interval);
  }, [playerId]);

  const toggleSelection = (num) => {
    setUserSelections((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num],
    );
  };

  if (!playerData)
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">
        Syncing with Dashboard...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center">
      <div className="w-full max-w-md bg-white p-8 rounded-[3rem] shadow-2xl border border-white">
        <span className="text-sm font-black mb-1">
          {playerData.name}'s Ticket
        </span>
        <div className="grid grid-rows-3 gap-2">
          {playerData.ticket?.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-cols-9 gap-1.5">
              {row.map((num, cIdx) => {
                if (num === null)
                  return (
                    <div
                      key={cIdx}
                      className="aspect-square bg-slate-50/50 rounded-xl"
                    />
                  );
                const isSelected = userSelections.includes(num);
                const isCalled = calledNumbers.includes(num);
                return (
                  <button
                    key={cIdx}
                    onClick={() => toggleSelection(num)}
                    className={`aspect-square flex items-center justify-center rounded-xl text-xs font-black transition-all border-2 ${isSelected ? "bg-emerald-600 text-white border-emerald-400 shadow-lg scale-105" : isCalled ? "bg-indigo-50 text-indigo-600 border-indigo-200 animate-pulse" : "bg-white text-slate-700 border-slate-100"}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- MASTER DASHBOARD ---
const MasterDashboard = () => {
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [availableNumbers, setAvailableNumbers] = useState(
    Array.from({ length: 90 }, (_, i) => i + 1),
  );
  const [currentNumber, setCurrentNumber] = useState(null);
  const [history, setHistory] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [players, setPlayers] = useState([
    {
      id: 1,
      name: "Krishna",
      prizes: {
        firstFive: false,
        line1: false,
        line2: false,
        line3: false,
        housie: false,
      },
      ticket: null,
    },
  ]);
  const [claimedPrizes, setClaimedPrizes] = useState({
    firstFive: null,
    line1: null,
    line2: null,
    line3: null,
    housie: null,
  });
  const [newPlayerName, setNewPlayerName] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [expandedQR, setExpandedQR] = useState({});
  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    localStorage.setItem("housie_called", JSON.stringify(calledNumbers));
    localStorage.setItem("housie_players", JSON.stringify(players));
  }, [calledNumbers, players]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleCopy = (id) => {
    const url = `${window.location.origin}/#/ticket/${id}`;
    navigator.clipboard.writeText(url);

    // Show "copied" feedback for 2 seconds
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const drawNumber = () => {
    if (isGameOver)
      return setToast("⚠️ Game is Over! Please Click Reset to start new Game.");
    if (availableNumbers.length === 0)
      return setToast("📢 No more numbers left. Start a new game with Reset.");
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const drawn = availableNumbers[randomIndex];
    setAvailableNumbers((prev) => prev.filter((n) => n !== drawn));
    setCalledNumbers((prev) => [...prev, drawn]);
    setCurrentNumber(drawn);
    setHistory((prev) => [drawn, ...prev]);
  };

  const handlePrize = (id, key, label) => {
    const player = players.find((p) => p.id === id);
    if (isGameOver && !player.prizes[key]) {
      setToast("⚠️ Game is Over! Please Click Reset to start new Game.");
      return;
    }
    if (player.prizes[key]) {
      setPlayers(
        players.map((p) =>
          p.id === id ? { ...p, prizes: { ...p.prizes, [key]: false } } : p,
        ),
      );
      setClaimedPrizes({ ...claimedPrizes, [key]: null });
      if (key === "housie") setIsGameOver(false);
      return;
    }
    if (claimedPrizes[key]) return setToast(`❌ ${label} already claimed!`);
    const prereq =
      claimedPrizes.firstFive &&
      claimedPrizes.line1 &&
      claimedPrizes.line2 &&
      claimedPrizes.line3;
    if (key === "housie" && !prereq)
      return setToast("❌ Complete all lines first!");

    if (window.confirm(`Confirm ${label} for ${player.name}?`)) {
      setPlayers(
        players.map((p) =>
          p.id === id ? { ...p, prizes: { ...p.prizes, [key]: true } } : p,
        ),
      );
      setClaimedPrizes({ ...claimedPrizes, [key]: id });
      if (key === "housie") setIsGameOver(true);
    }
  };

  const PRIZE_LABELS = {
    firstFive: "1st Five",
    line1: "Line 1",
    line2: "Line 2",
    line3: "Line 3",
    housie: "Housie",
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 lg:p-12 relative font-sans antialiased">
      {/* PROFESSIONAL TOAST */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-xs uppercase tracking-[0.1em]">
            {toast}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
        {/* LEFT: MAIN ENGINE */}
        <div className="lg:w-[65%] space-y-8">
          <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-white flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-2">
                  Draw Count:{calledNumbers.length}/90
              </span>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] block mb-2">
                Current Number
              </span>
              <div className="text-[1.5rem] font-black text-indigo-600 leading-none tracking-tighter">
                {currentNumber || "--"}
              </div>
            </div>

            <div className="w-full md:w-72 space-y-2">
              {/* Primary Action */}
              <button
                onClick={drawNumber}
                className={`w-full py-2 rounded-lg font-bold text-[11px] text-white shadow-md transition-all active:scale-95 ${
                  isGameOver
                    ? "bg-indigo-200"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                }`}
              >
                {currentNumber ? "🎲 NEXT NUMBER" : "🎲 START GAME"}
              </button>

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="bg-slate-50 text-slate-500 font-bold py-2 rounded-lg text-[10px] hover:bg-slate-100 transition"
                >
                  HISTORY
                </button>

                <button
                  onClick={() => {
                    if (window.confirm("Reset?")) window.location.reload();
                  }}
                  className="bg-red-50 text-red-500 font-bold py-2 rounded-lg text-[10px] border border-red-100 transition hover:bg-red-100"
                >
                  RESET
                </button>
              </div>

              {/* //Generate Tickets
              <button
                onClick={() =>
                  setPlayers(
                    players.map((p) => ({
                      ...p,
                      ticket: generateTicketData(),
                    })),
                  )
                }
                className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wide hover:bg-indigo-600 transition"
              >
                🎟️ Generate Tickets
              </button> */}
            </div>
          </div>

          <div className="bg-white rounded-[3.5rem] p-10 shadow-sm grid grid-cols-10 gap-3.5 border border-white">
            {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                className={`aspect-square flex items-center justify-center rounded-xl text-xs font-black transition-all duration-300 ${calledNumbers.includes(n) ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110" : "bg-slate-100 text-slate-400"}`}
              >
                {n}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: PLAYER HUB */}
        <aside className="lg:w-[35%] space-y-6">
          <div className="bg-white rounded-[3.5rem] p-8 shadow-sm h-fit max-h-[85vh] flex flex-col border border-white">
            <span className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-6 px-2">
              ACTIVE PLAYERS LIST
            </span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newPlayerName) {
                  setPlayers([
                    ...players,
                    {
                      id:
                        players.length > 0
                          ? Math.max(...players.map((p) => p.id)) + 1
                          : 1,
                      name: newPlayerName,
                      prizes: {
                        firstFive: false,
                        line1: false,
                        line2: false,
                        line3: false,
                        housie: false,
                      },
                      ticket: null,
                    },
                  ]);
                  setNewPlayerName("");
                }
              }}
              className="flex gap-2 mb-6"
            >
            <div className="flex gap-2 items-center">
  <input
    type="text"
    value={newPlayerName}
    onChange={(e) => setNewPlayerName(e.target.value)}
    placeholder="Enter Name..."
    // Changed w-32 to w-48 to increase width
    className="bg-slate-50 rounded-lg px-3 py-1.5 text-[10px] font-semibold focus:ring-1 focus:ring-indigo-500 outline-none transition w-48"
  />

  <button
    type="submit"
    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold hover:bg-indigo-700 transition whitespace-nowrap"
  >
    Add Player
  </button>
</div>
            </form>

            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="p-6 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 group transition-all hover:bg-slate-50"
                >
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-900 text-sm">
                        {p.name}
                      </span>
                      {p.ticket && (
                        <div className="flex gap-2">
                          {/* QR Toggle Button */}
                          <button
                            onClick={() =>
                              setExpandedQR((prev) => ({
                                ...prev,
                                [p.id]: !prev[p.id],
                              }))
                            }
                            className={`p-2 rounded-xl transition-all shadow-sm ${expandedQR[p.id] ? "bg-indigo-600 text-white" : "bg-white text-slate-400 hover:text-indigo-600"}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                              />
                            </svg>
                          </button>

                          {/* Copy Link Button */}
                          <button
                            onClick={() => handleCopy(p.id)}
                            className={`p-2 rounded-xl transition-all shadow-sm ${copiedId === p.id ? "bg-green-500 text-white" : "bg-white text-slate-400 hover:text-indigo-600"}`}
                            title="Copy Link"
                          >
                            {copiedId === p.id ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setPlayers(players.filter((x) => x.id !== p.id))
                      }
                      className="text-red-400 opacity-0 group-hover:opacity-100 transition p-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>

                  {expandedQR[p.id] && p.ticket && (
                    <div className="flex flex-col items-center bg-white p-5 rounded-3xl mb-6 shadow-inner animate-in fade-in zoom-in-95 duration-200">
                      <QRCodeSVG
                        value={`${window.location.origin}/#/ticket/${p.id}`}
                        size={110}
                      />
                      <span className="text-[8px] font-black text-slate-400 mt-4 tracking-[0.2em] uppercase">
                        Scan Ticket Link
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    {["firstFive", "line1", "line2", "line3"].map((k) => {
                      const isTaken =
                        claimedPrizes[k] && claimedPrizes[k] !== p.id;
                      return (
                        <button
                          key={k}
                          disabled={isTaken}
                          onClick={() => handlePrize(p.id, k, PRIZE_LABELS[k])}
                          className={`text-[9px] font-black py-2.5 rounded-xl border transition-all ${p.prizes[k] ? "bg-emerald-600 text-white border-emerald-600 shadow-lg" : isTaken ? "opacity-20 cursor-not-allowed bg-slate-200" : "bg-white text-slate-600 border-slate-100 hover:border-indigo-100 hover:text-indigo-600"}`}
                        >
                          {p.prizes[k]
                            ? `${PRIZE_LABELS[k]} Won`
                            : PRIZE_LABELS[k]}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePrize(p.id, "housie", "Housie")}
                    disabled={
                      (claimedPrizes.housie && claimedPrizes.housie !== p.id) ||
                      (!p.prizes.housie &&
                        !(
                          claimedPrizes.firstFive &&
                          claimedPrizes.line1 &&
                          claimedPrizes.line2 &&
                          claimedPrizes.line3
                        ))
                    }
                    className={`w-full mt-3 py-3.5 rounded-xl text-[9px] font-black uppercase transition-all ${p.prizes.housie ? "bg-emerald-600 text-white" : "bg-slate-900 text-white hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400"}`}
                  >
                    {p.prizes.housie ? "🎉 HOUSIE WON" : "CLAIM HOUSIE"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
          <div className="bg-white rounded-[4rem] w-full max-w-xl p-12 shadow-2xl flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-8 border-b pb-6 border-slate-100">
              <h3 className="font-black text-2xl tracking-tighter text-slate-900">
                Live Call History
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-4xl text-slate-200 hover:text-slate-900 transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="overflow-y-auto flex-1 flex flex-wrap gap-3.5 custom-scrollbar pr-2">
              {history.map((num, i) => (
                <div
                  key={i}
                  className="bg-slate-50 px-5 py-3.5 rounded-2xl text-[10px] font-black border border-slate-100 shadow-sm flex items-center gap-3"
                >
                  <span className="text-slate-300">#{history.length - i}</span>
                  <span className="text-indigo-600 text-lg">{num}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- APP ---
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MasterDashboard />} />
        <Route path="/ticket/:playerId" element={<PlayerTicketView />} />
      </Routes>
    </Router>
  );
}
