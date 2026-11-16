// Modals.jsx holds all the pop-up dialog boxes used around the lobby (loadout,
// shop, match history, stats, settings, and so on). Each one is exported as its
// own component so other screens can open just the dialog they need. A "modal"
// is simply a window that floats on top of the page until you close it.
import { useState } from "react";
import {
  X,
  Shield,
  Coins,
  Sparkles,
  Swords,
  Check,
  Trash2,
  Award,
  Trophy,
  Target,
  Bomb,
  Paperclip,
  Laugh,
  Settings,
  User,
  Star,
  LogIn,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { ADMIRALS_AVATARS, LOBBY_EMOTES } from "@/lib/lobbyData";

// This file holds the popup dialogs opened from the Home screen: Loadout (equip weapons/attachments/
// emotes), Store (buy skins/badges/crates), History (past matches), and Menu (settings/logout).

export function LoadoutModal({
  isOpen,
  onClose,
  weapons,
  profile,
  ownedEmoteIds,
  onEquipToggle,
  onSelectEmote,
}) {
  const [tab, setTab] = useState("weapons");
  const [expandedWeapon, setExpandedWeapon] = useState(null); // reserved for a future "expand weapon details" UI; not wired up yet

  if (!isOpen) return null;

  const isAllowedForRole = (category) => {
    const role = profile.selectedRole;
    if (role === "Core") return true;
    if (role === "Sniper") return category === "Sniper Rifle";
    if (role === "Marksman") return category === "Marksman Weapon";
    if (role === "Gunner") return category === "Heavy Gun";
    if (role === "Scout")
      return category === "Silenced Weapon" || category === "Tactical Gear";
    return true;
  };

  const mainWeapons = weapons.filter(
    (w) =>
      w.owned && w.category !== "Attachment" && w.category !== "Tactical Gear",
  );
  const attachments = weapons.filter(
    (w) =>
      w.owned &&
      (w.category === "Attachment" || w.category === "Tactical Gear"),
  );
  const ownedEmotes = LOBBY_EMOTES.filter((e) => ownedEmoteIds.includes(e.id));
  const activeEmoteId = profile.activeEmoteId;

  const TABS = [
    {
      id: "weapons",
      label: "WEAPONS",
      icon: <Swords size={13} />,
      count: mainWeapons.length,
    },
    {
      id: "attachments",
      label: "ATTACHMENTS",
      icon: <Paperclip size={13} />,
      count: attachments.length,
    },
    {
      id: "emotes",
      label: "EMOTES",
      icon: <Laugh size={13} />,
      count: ownedEmotes.length,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-stone-950 border border-military-active text-stone-100 rounded-lg overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-zinc-900/90 border-b border-military flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Swords className="text-[#76a035] w-6 h-6 animate-pulse" />
            <h2 className="text-xl font-display font-bold tracking-wider text-[#76a035]">
              OPERATOR LOADOUT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white hover:bg-stone-800 p-1.5 rounded transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-0 overflow-x-auto flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t border-b-2 font-mono text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                tab === t.id
                  ? "border-[#76a035] text-[#76a035] bg-[#76a035]/10"
                  : "border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/50"
              }`}
            >
              {t.icon}
              {t.label}
              <span
                className={`ml-1 text-[9px] px-1.5 py-0.5 rounded font-bold ${tab === t.id ? "bg-[#76a035]/20 text-[#76a035]" : "bg-stone-800 text-stone-500"}`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="h-px bg-military/50 flex-shrink-0" />

        {/* Weapons tab */}
        {tab === "weapons" && (
          <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            {mainWeapons.map((weapon) => {
              const allowed = isAllowedForRole(weapon.category);
              return (
                <div
                  key={weapon.id}
                  className={`p-4 border rounded-md relative flex flex-col justify-between transition-all ${!allowed ? "border-red-900/50 bg-red-950/5 opacity-75" : weapon.equipped ? "border-emerald-500 bg-emerald-950/20" : "border-military bg-stone-900/40 hover:bg-stone-900/70"}`}
                >
                  {weapon.equipped && (
                    <span
                      className={`absolute top-3 right-3 text-[10px] px-2 py-0.5 font-mono font-bold tracking-wider rounded ${!allowed ? "bg-red-500 text-white animate-pulse" : "bg-emerald-500 text-black"}`}
                    >
                      {!allowed ? "RESTRICTED" : "EQUIPPED"}
                    </span>
                  )}
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-display font-bold text-base tracking-wide text-white">
                          {weapon.name}
                        </h3>
                        {!allowed && (
                          <div className="text-[9px] font-mono font-bold text-red-400 mt-0.5 tracking-widest uppercase">
                            ⚠️ INCOMPATIBLE — {profile.selectedRole}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-stone-400 bg-stone-800 px-2 py-0.5 rounded ml-2 flex-shrink-0">
                        {weapon.category}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 font-sans mb-3 min-h-[28px]">
                      {weapon.description}
                    </p>
                    <div className="space-y-1.5 mb-3 font-mono text-[10px]">
                      {[
                        {
                          label: "DAMAGE",
                          val: weapon.damage,
                          color: "bg-red-500",
                        },
                        {
                          label: "FIRE RATE",
                          val: weapon.fireRate,
                          color: "bg-blue-500",
                        },
                        {
                          label: "ACCURACY",
                          val: weapon.accuracy,
                          color: "bg-emerald-500",
                        },
                        {
                          label: "RANGE",
                          val: weapon.range,
                          color: "bg-yellow-500",
                        },
                      ].map((s) => (
                        <div key={s.label}>
                          <div className="flex justify-between mb-0.5 text-stone-300">
                            <span>{s.label}</span>
                            <span className="font-bold">{s.val}</span>
                          </div>
                          <div className="w-full bg-stone-800 h-1 rounded-full overflow-hidden">
                            <div
                              className={`${s.color} h-full`}
                              style={{ width: `${Math.min(100, s.val)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-military/40 flex items-center justify-between">
                    <span className="text-xs font-mono tracking-wider text-emerald-500">
                      OWNED
                    </span>
                    <button
                      onClick={() => onEquipToggle(weapon.id)}
                      disabled={!allowed && !weapon.equipped}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all ${weapon.equipped ? "bg-amber-600/20 hover:bg-amber-600 hover:text-white border border-amber-600 text-amber-400" : !allowed ? "bg-red-950/20 border border-red-500/30 text-red-400 cursor-not-allowed" : "bg-[#76a035] hover:bg-[#86b53b] text-black cursor-pointer"}`}
                    >
                      {weapon.equipped
                        ? "Unequip"
                        : !allowed
                          ? "RESTRICTED"
                          : "Equip"}
                    </button>
                  </div>
                </div>
              );
            })}
            {mainWeapons.length === 0 && (
              <div className="col-span-2 text-center py-16 text-stone-500 font-mono">
                <div className="text-4xl mb-3">🔫</div>
                <div className="font-bold uppercase tracking-widest">
                  No weapons owned yet
                </div>
                <div className="text-xs mt-2">
                  Visit the Store to purchase weapons.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attachments tab */}
        {tab === "attachments" && (
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="text-[10px] font-mono text-stone-500 font-bold uppercase tracking-widest border-b border-military/30 pb-2">
              Equip attachments to boost your weapon stats in-game.
            </div>
            {attachments.length === 0 ? (
              <div className="text-center py-16 text-stone-500 font-mono">
                <div className="text-4xl mb-3">🔧</div>
                <div className="font-bold uppercase tracking-widest">
                  No attachments owned
                </div>
                <div className="text-xs mt-2">
                  Buy attachments from the Store → ATTACHMENTS tab.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className={`p-4 border rounded-md flex flex-col gap-3 transition-all ${att.equipped ? "border-cyan-500/60 bg-cyan-950/15" : "border-military bg-stone-900/40 hover:bg-stone-900/70"}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-display font-bold text-sm tracking-wide text-white">
                          {att.name}
                        </h3>
                        <span className="text-[9px] font-mono text-stone-400 uppercase tracking-widest">
                          {att.category}
                        </span>
                      </div>
                      {att.equipped && (
                        <span className="text-[10px] px-2 py-0.5 font-mono font-bold tracking-wider rounded bg-cyan-500 text-black">
                          EQUIPPED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 font-sans">
                      {att.description}
                    </p>
                    <div className="grid grid-cols-4 gap-2 font-mono text-[9px]">
                      {[
                        ["ACC", att.accuracy, "text-emerald-400"],
                        ["RNG", att.range, "text-yellow-400"],
                        ["DMG", att.damage, "text-red-400"],
                        ["RoF", att.fireRate, "text-blue-400"],
                      ].map(([l, v, c]) => (
                        <div
                          key={l}
                          className="text-center bg-black/30 rounded py-1"
                        >
                          <div className="text-stone-500">{l}</div>
                          <div
                            className={`font-bold ${c} ${Number(v) > 0 ? "" : Number(v) < 0 ? "text-red-400" : "text-stone-600"}`}
                          >
                            {Number(v) > 0 ? `+${v}` : v}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => onEquipToggle(att.id)}
                      className={`w-full py-1.5 rounded text-xs font-mono font-bold uppercase transition-all cursor-pointer ${att.equipped ? "bg-amber-600/20 hover:bg-amber-600 hover:text-white border border-amber-600 text-amber-400" : "bg-cyan-600/80 hover:bg-cyan-500 text-white"}`}
                    >
                      {att.equipped ? "Remove Attachment" : "Equip Attachment"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Equipped summary */}
            {attachments.filter((a) => a.equipped).length > 0 && (
              <div className="border border-cyan-500/30 bg-cyan-950/10 rounded p-3 font-mono text-[10px]">
                <div className="text-cyan-400 font-black uppercase tracking-wider mb-2">
                  ACTIVE ATTACHMENTS (
                  {attachments.filter((a) => a.equipped).length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {attachments
                    .filter((a) => a.equipped)
                    .map((a) => (
                      <span
                        key={a.id}
                        className="bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded font-bold text-[9px]"
                      >
                        {a.name}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emotes tab */}
        {tab === "emotes" && (
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="text-[10px] font-mono text-stone-500 font-bold uppercase tracking-widest border-b border-military/30 pb-2">
              Select your active in-game emote. Only one can be active at a
              time.
            </div>
            {ownedEmotes.length === 0 ? (
              <div className="text-center py-16 text-stone-500 font-mono">
                <div className="text-4xl mb-3">🎭</div>
                <div className="font-bold uppercase tracking-widest">
                  No emotes owned
                </div>
                <div className="text-xs mt-2">
                  Buy emotes from the Store → EMOTES tab.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {ownedEmotes.map((emote) => {
                  const isActive = activeEmoteId === emote.id;
                  return (
                    <div
                      key={emote.id}
                      className={`p-3 border rounded text-center flex flex-col items-center transition-all ${isActive ? "border-purple-500 bg-purple-950/25" : "border-military/50 bg-stone-900/30 hover:bg-stone-900/60"}`}
                    >
                      <div className="text-3xl mb-1">{emote.icon}</div>
                      <div className="font-display font-bold text-sm tracking-wider text-white mb-0.5">
                        {emote.name}
                      </div>
                      <div className="text-[9px] text-stone-400 font-sans mb-2">
                        {emote.description}
                      </div>
                      <div className="font-mono text-xs text-stone-300 bg-stone-800/50 px-2 py-0.5 rounded mb-3 tracking-wider">
                        {emote.frames[0]}
                      </div>
                      {isActive ? (
                        <div className="w-full">
                          <span className="w-full block text-center text-xs text-purple-300 font-mono font-bold flex items-center justify-center gap-1">
                            <Check size={12} /> ACTIVE IN-GAME
                          </span>
                          <button
                            onClick={() => onSelectEmote("")}
                            className="w-full mt-1.5 py-1 rounded text-[9px] font-mono font-bold uppercase bg-stone-800 hover:bg-stone-700 text-stone-400 transition-all cursor-pointer"
                          >
                            Deselect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onSelectEmote(emote.id)}
                          className="w-full py-1.5 rounded text-xs font-mono font-bold uppercase bg-purple-700/80 hover:bg-purple-600 text-white transition-all cursor-pointer"
                        >
                          Set Active
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {activeEmoteId && (
              <div className="border border-purple-500/30 bg-purple-950/10 rounded p-3 font-mono text-[10px]">
                <div className="text-purple-400 font-black uppercase tracking-wider">
                  ACTIVE EMOTE:{" "}
                  {LOBBY_EMOTES.find((e) => e.id === activeEmoteId)?.name ||
                    "—"}{" "}
                  {LOBBY_EMOTES.find((e) => e.id === activeEmoteId)?.icon}
                </div>
                <div className="text-stone-500 mt-0.5">
                  This emote will be used when you trigger emotes in the game
                  canvas.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const STORE_TABS = [
  { id: "all", label: "ALL", icon: <Shield size={13} /> },
  { id: "assault", label: "ASSAULT", icon: <Swords size={13} /> },
  { id: "sniper", label: "SNIPERS", icon: <Target size={13} /> },
  { id: "bomb", label: "BOMBS", icon: <Bomb size={13} /> },
  { id: "attachment", label: "ATTACHMENTS", icon: <Paperclip size={13} /> },
  { id: "emote", label: "EMOTES", icon: <Laugh size={13} /> },
  { id: "cosmetic", label: "COSMETICS", icon: <Sparkles size={13} /> },
];

// this is for deciding which store tab a weapon belongs under (used to filter the weapon grid)
function weaponMatchesTab(w, tab) {
  if (tab === "all") return true;
  if (tab === "assault")
    return [
      "Assault Rifle",
      "Heavy Gun",
      "Silenced Weapon",
      "Shotgun",
      "Pistol",
      "Melee",
    ].includes(w.category);
  if (tab === "sniper")
    return ["Sniper Rifle", "Marksman Weapon"].includes(w.category);
  if (tab === "bomb") return w.category === "Bomb";
  if (tab === "attachment") return w.category === "Attachment";
  return false;
}

export function StoreModal({
  isOpen,
  onClose,
  coins,
  diamonds,
  storeItems,
  weapons,
  ownedEmoteIds,
  onBuyItem,
  onBuyEmote,
}) {
  const [tab, setTab] = useState("all");

  if (!isOpen) return null;

  const lockedWeapons = weapons.filter((w) => !w.owned && w.cost > 0);
  const filteredWeapons =
    tab === "cosmetic" || tab === "emote"
      ? []
      : lockedWeapons.filter((w) => weaponMatchesTab(w, tab));
  const filteredCosmetics =
    tab === "all" || tab === "cosmetic" ? storeItems : [];
  const filteredEmotes = tab === "all" || tab === "emote" ? LOBBY_EMOTES : [];

  const renderCurrencyBadge = (cost, type) =>
    type === "coins" ? (
      <span className="flex items-center gap-1 font-mono text-sm font-bold text-yellow-400">
        <Coins size={14} className="text-yellow-500" />
        {cost.toLocaleString()}
      </span>
    ) : (
      <span className="flex items-center gap-1 font-mono text-sm font-bold text-cyan-400">
        <Sparkles size={14} className="text-cyan-400" />
        {cost}
      </span>
    );

  const canAfford = (cost, type) =>
    type === "coins" ? coins >= cost : diamonds >= cost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl bg-stone-950 border border-military-active text-stone-100 rounded-lg overflow-hidden flex flex-col max-h-[88vh]">
        <div className="p-4 bg-zinc-900/90 border-b border-military flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <Shield className="text-amber-500 w-6 h-6 animate-pulse" />
            <h2 className="text-xl font-display font-bold tracking-wider text-amber-500">
              QUARTERMASTER ARMORY
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded border border-[#76a035]/30">
              <Coins className="text-yellow-500 w-4 h-4" />
              <span className="font-mono text-sm text-yellow-400 font-bold">
                {coins.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded border border-cyan-500/30">
              <Sparkles className="text-cyan-400 w-4 h-4" />
              <span className="font-mono text-sm text-cyan-400 font-bold">
                {diamonds}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white hover:bg-stone-800 p-1.5 rounded transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 px-4 pt-3 pb-0 overflow-x-auto flex-shrink-0">
          {STORE_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t border-b-2 font-mono text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${tab === t.id ? "border-[#76a035] text-[#76a035] bg-[#76a035]/10" : "border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/50"}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="h-px bg-military/50 flex-shrink-0" />

        <div className="p-5 overflow-y-auto flex-1 space-y-7">
          {filteredWeapons.length > 0 && (
            <div>
              <h3 className="text-xs font-mono font-black tracking-widest text-[#76a035] mb-3 flex items-center gap-2">
                <span className="inline-block w-6 h-px bg-[#76a035]" />
                {tab === "all"
                  ? "WEAPONS FOR PURCHASE"
                  : STORE_TABS.find((t) => t.id === tab)?.label + " WEAPONS"}
                <span className="text-stone-600">
                  ({filteredWeapons.length})
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredWeapons.map((weapon) => {
                  const affordable = canAfford(weapon.cost, weapon.costType);
                  return (
                    <div
                      key={weapon.id}
                      className="p-4 border border-military/60 bg-stone-900/40 hover:bg-stone-900/70 rounded flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <h4 className="font-display font-bold text-white text-sm leading-tight">
                            {weapon.name}
                          </h4>
                          <span className="text-[9px] bg-[#76a035]/10 border border-[#76a035]/30 text-[#76a035] px-1.5 py-0.5 rounded font-mono uppercase whitespace-nowrap flex-shrink-0">
                            {weapon.category}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 font-sans mb-3">
                          {weapon.description}
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[9px] mb-3">
                          {[
                            ["DMG", weapon.damage, "text-red-400"],
                            ["RoF", weapon.fireRate, "text-blue-400"],
                            ["ACC", weapon.accuracy, "text-emerald-400"],
                            ["RNG", weapon.range, "text-yellow-400"],
                          ].map(([l, v, c]) => (
                            <div
                              key={l}
                              className="flex justify-between items-center"
                            >
                              <span className="text-stone-500 font-bold">
                                {l}
                              </span>
                              <div className="flex items-center gap-1">
                                <div className="w-12 bg-stone-800 h-1 rounded overflow-hidden">
                                  <div
                                    className={`${c} h-full`}
                                    style={{
                                      width: `${Math.min(100, Number(v))}%`,
                                    }}
                                  />
                                </div>
                                <span className={c}>{v}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-military/20">
                        {renderCurrencyBadge(weapon.cost, weapon.costType)}
                        <button
                          onClick={() =>
                            onBuyItem(
                              weapon.id,
                              weapon.cost,
                              weapon.costType,
                              "weapon",
                            )
                          }
                          disabled={!affordable}
                          className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all ${affordable ? "bg-amber-500 text-stone-950 hover:bg-amber-400 cursor-pointer" : "bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed"}`}
                        >
                          {affordable ? "Purchase" : "Need Funds"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredEmotes.length > 0 && (
            <div>
              <h3 className="text-xs font-mono font-black tracking-widest text-purple-400 mb-3 flex items-center gap-2">
                <span className="inline-block w-6 h-px bg-purple-500" />
                EMOTE CATALOG
                <span className="text-stone-600">
                  ({filteredEmotes.length})
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredEmotes.map((emote) => {
                  const owned = ownedEmoteIds.includes(emote.id);
                  const affordable = canAfford(emote.price, emote.priceType);
                  return (
                    <div
                      key={emote.id}
                      className={`p-3 border rounded text-center transition-all flex flex-col items-center ${owned ? "border-purple-500/40 bg-purple-950/15" : "border-military/50 bg-stone-900/30 hover:bg-stone-900/60"}`}
                    >
                      <div className="text-3xl mb-1">{emote.icon}</div>
                      <div className="font-display font-bold text-sm tracking-wider text-white mb-0.5">
                        {emote.name}
                      </div>
                      <div className="text-[9px] text-stone-400 font-sans mb-2">
                        {emote.description}
                      </div>
                      <div className="font-mono text-xs text-stone-300 bg-stone-800/50 px-2 py-0.5 rounded mb-2 tracking-wider">
                        {emote.frames[0]}
                      </div>
                      {owned ? (
                        <span className="text-xs text-purple-400 font-mono font-bold flex items-center gap-1">
                          <Check size={12} /> OWNED
                        </span>
                      ) : (
                        <div className="w-full space-y-1.5">
                          <div className="flex justify-center">
                            {renderCurrencyBadge(emote.price, emote.priceType)}
                          </div>
                          <button
                            onClick={() =>
                              onBuyEmote(emote.id, emote.price, emote.priceType)
                            }
                            disabled={!affordable}
                            className={`w-full py-1.5 rounded text-xs font-mono font-bold uppercase transition-all ${affordable ? "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer" : "bg-stone-800 text-stone-500 cursor-not-allowed"}`}
                          >
                            {affordable ? "Buy Emote" : "Need Funds"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredCosmetics.length > 0 && (
            <div>
              <h3 className="text-xs font-mono font-black tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                <span className="inline-block w-6 h-px bg-amber-500" />
                COSMETIC BUNDLES & CRATES
                <span className="text-stone-600">
                  ({filteredCosmetics.length})
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCosmetics.map((item) => {
                  const affordable = canAfford(item.cost, item.costType);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 border rounded flex flex-col justify-between transition-all ${item.owned ? "border-military/30 bg-stone-900/10 opacity-70" : "border-military/60 bg-stone-900/40 hover:bg-stone-900/60"}`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <h4 className="font-display font-bold text-white text-base">
                            {item.name}
                          </h4>
                          <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-500 px-2 py-0.5 rounded font-mono uppercase whitespace-nowrap flex-shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 font-sans mb-4">
                          {item.description}
                        </p>
                      </div>
                      <div className="mt-2 pt-3 border-t border-military/20 flex justify-between items-center">
                        {item.owned ? (
                          <span className="text-xs text-emerald-500 font-mono font-bold flex items-center gap-1.5">
                            <Check size={14} /> OWNED
                          </span>
                        ) : (
                          renderCurrencyBadge(item.cost, item.costType)
                        )}
                        {!item.owned && (
                          <button
                            onClick={() =>
                              onBuyItem(
                                item.id,
                                item.cost,
                                item.costType,
                                "skin",
                              )
                            }
                            disabled={!affordable}
                            className={`px-4 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all ${affordable ? "bg-amber-500 text-stone-950 hover:bg-amber-400 cursor-pointer" : "bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed"}`}
                          >
                            {affordable ? "Buy" : "Need Funds"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredWeapons.length === 0 &&
            filteredEmotes.length === 0 &&
            filteredCosmetics.length === 0 && (
              <div className="text-center py-16 text-stone-500 font-mono">
                <div className="text-4xl mb-3">🎖️</div>
                <div className="font-bold uppercase tracking-widest text-sm">
                  All Items In This Category Are Owned
                </div>
                <div className="text-xs mt-2">
                  Check other tabs for more items.
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export function HistoryModal({ isOpen, onClose, matches, onClearHistory }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-stone-950 border border-military-active text-stone-100 rounded-lg overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 bg-zinc-900/90 border-b border-military flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Trophy className="text-[#76a035] w-6 h-6" />
            <h2 className="text-xl font-display font-bold tracking-wider text-[#76a035]">
              COMBAT EXPEDITION RECORDS
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {matches.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-red-400 hover:text-red-300 hover:bg-red-950/20 px-3 py-1.5 rounded text-xs font-mono font-bold tracking-wider border border-red-500/20 transition-all flex items-center gap-1"
              >
                <Trash2 size={13} /> WIPE
              </button>
            )}
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white hover:bg-stone-800 p-1.5 rounded transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {matches.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <Award size={48} className="text-stone-600 mb-3 animate-bounce" />
              <p className="text-sm font-mono font-bold text-stone-400 uppercase mb-1">
                Combat Intel Log Is Blank
              </p>
              <p className="text-xs text-stone-500 max-w-xs font-sans">
                Play offline, custom, or queue in Classic/Rank to build your
                record!
              </p>
            </div>
          ) : (
            <div className="space-y-3 font-mono">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className={`p-4 border rounded flex flex-col sm:flex-row justify-between items-start sm:items-center ${match.outcome === "victory" ? "border-emerald-500/50 bg-emerald-950/10" : "border-red-500/50 bg-red-950/10"}`}
                >
                  <div className="space-y-1">
                    <div className="flex gap-2 items-center">
                      <span
                        className={`text-xs font-bold uppercase px-2 py-0.5 rounded tracking-widest ${match.outcome === "victory" ? "bg-emerald-500 text-black" : "bg-red-500 text-stone-100"}`}
                      >
                        {match.outcome}
                      </span>
                      <span className="text-stone-400 text-xs">
                        {match.timestamp}
                      </span>
                    </div>
                    <div className="text-sm text-stone-200">
                      Map:{" "}
                      <span className="text-white font-bold">{match.map}</span>{" "}
                      | Score:{" "}
                      <span className="text-[#76a035]">{match.score}</span>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 flex gap-4 text-[11px] items-center">
                    <div className="bg-black/30 px-3 py-1.5 rounded border border-military/20 flex gap-3">
                      <div>
                        K{" "}
                        <span className="text-white font-bold">
                          {match.kills}
                        </span>
                      </div>
                      <div>
                        D{" "}
                        <span className="text-red-400 font-bold">
                          {match.deaths}
                        </span>
                      </div>
                      <div>
                        A{" "}
                        <span className="text-cyan-400 font-bold">
                          {match.assists}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      {match.coinsEarned > 0 && (
                        <div className="text-yellow-500 font-bold text-xs">
                          +{match.coinsEarned} 💰
                        </div>
                      )}
                      {match.diamondsEarned > 0 && (
                        <div className="text-cyan-400 font-bold text-xs">
                          +{match.diamondsEarned} 💎
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const AVATAR_BORDERS = [
  {
    id: "none",
    label: "None",
    cls: "border-stone-700",
    preview: "border-stone-700 bg-stone-800/20",
  },
  {
    id: "green",
    label: "Military",
    cls: "border-[#76a035]",
    preview: "border-[#76a035] bg-[#76a035]/10",
  },
  {
    id: "gold",
    label: "Gold",
    cls: "border-amber-500",
    preview: "border-amber-500 bg-amber-950/20",
  },
  {
    id: "diamond",
    label: "Diamond",
    cls: "border-cyan-400",
    preview: "border-cyan-400 bg-cyan-950/20",
  },
  {
    id: "combat",
    label: "Combat",
    cls: "border-red-500",
    preview: "border-red-500 bg-red-950/20",
  },
  {
    id: "elite",
    label: "Elite",
    cls: "border-purple-500",
    preview: "border-purple-500 bg-purple-950/20",
  },
];

const RANK_ORDER = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Master",
];

// this is for building the achievement medal list shown on the profile tab, based on profile stats
function getMedals(profile) {
  const medals = [
    { icon: "🎖️", label: "First Blood", earned: profile.matchesCount >= 1 },
    { icon: "⚔️", label: "Veteran", earned: profile.matchesCount >= 10 },
    {
      icon: "🥇",
      label: "Gold Rank",
      earned: RANK_ORDER.indexOf(profile.rankName) >= 2,
    },
    {
      icon: "💠",
      label: "Platinum Rank",
      earned: RANK_ORDER.indexOf(profile.rankName) >= 3,
    },
    {
      icon: "💎",
      label: "Diamond Rank",
      earned: RANK_ORDER.indexOf(profile.rankName) >= 4,
    },
    { icon: "💰", label: "Rich Operator", earned: profile.coins >= 10000 },
    { icon: "🔫", label: "Arsenal", earned: profile.weaponsCount >= 5 },
    { icon: "🏆", label: "Champion", earned: profile.matchesCount >= 25 },
  ];
  return medals;
}

function getGameId(profile) {
  const seed = profile.name.length * 1337 + profile.level * 97;
  return `#OPW${String(seed % 9999).padStart(4, "0")}`;
}

export function MenuModal({ isOpen, onClose, profile, onUpdateProfile, cloudAccount }) {
  const [tab, setTab] = useState("profile");
  const [name, setName] = useState(profile.name);

  if (!isOpen) return null;

  const xpPct = Math.min(100, (profile.xp / profile.xpRequired) * 100);
  const medals = getMedals(profile);
  const gameId = getGameId(profile);
  const currentAvatar =
    ADMIRALS_AVATARS.find((a) => a.id === profile.avatarId) ||
    ADMIRALS_AVATARS[0];
  const currentBorder = profile.avatarBorder ?? "none";
  const borderDef =
    AVATAR_BORDERS.find((b) => b.id === currentBorder) || AVATAR_BORDERS[0];

  const PROFILE_TABS = [
    { id: "profile", label: "PROFILE", icon: <User size={13} /> },
    { id: "avatar", label: "AVATAR", icon: <Star size={13} /> },
    { id: "border", label: "BORDER", icon: <Settings size={13} /> },
  ];

  const getRankColor = (rankName) => {
    switch (rankName) {
      case "Bronze":
        return "text-amber-700";
      case "Silver":
        return "text-slate-300";
      case "Gold":
        return "text-yellow-500";
      case "Platinum":
        return "text-cyan-400";
      case "Diamond":
        return "text-blue-400";
      case "Master":
        return "text-purple-400";
      default:
        return "text-[#76a035]";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-stone-950 border border-military-active text-stone-100 rounded-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-zinc-900/90 border-b border-military flex justify-between items-center">
          <div className="flex items-center gap-3">
            <User className="text-[#76a035] w-5 h-5" />
            <h2 className="text-lg font-display font-bold tracking-wider text-[#76a035]">
              COMMANDER PROFILE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white hover:bg-stone-800 p-1.5 rounded transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0">
          {PROFILE_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t border-b-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-all ${tab === t.id ? "border-[#76a035] text-[#76a035] bg-[#76a035]/10" : "border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/50"}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="h-px bg-military/50 flex-shrink-0" />

        {/* PROFILE tab */}
        {tab === "profile" && (
          <div className="p-5 overflow-y-auto flex-1 space-y-5">
            {/* Identity card */}
            <div className="flex items-center gap-4 p-4 bg-zinc-900/60 rounded border border-military/50">
              <div
                className={`w-16 h-16 rounded-full border-2 ${borderDef.cls} overflow-hidden bg-stone-900 flex-shrink-0`}
              >
                <img
                  src={currentAvatar.url}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-black text-lg text-white tracking-wide truncate">
                  {profile.name}
                </div>
                <div className="font-mono text-[10px] text-stone-500 tracking-widest">
                  {gameId}
                </div>
                <div
                  className={`font-mono text-xs font-bold mt-0.5 ${getRankColor(profile.rankName)}`}
                >
                  {profile.rankName} {profile.rankTier} — LVL {profile.level}
                </div>
              </div>
            </div>

            {/* Account: log in with an existing account, or switch between them */}
            <div className="p-4 bg-zinc-900/60 rounded border border-military/50 space-y-2.5">
              <div className="flex items-center gap-2">
                <LogIn size={14} className="text-[#76a035]" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-300">
                  {cloudAccount?.user
                    ? "GOOGLE ACCOUNT CONNECTED"
                    : "CONNECT AN ACCOUNT"}
                </span>
              </div>
              <p className="font-mono text-[10px] text-stone-500 leading-relaxed break-all">
                {cloudAccount?.user
                  ? cloudAccount.user.email ||
                    cloudAccount.playerProfile?.username ||
                    "Signed in"
                  : "Log in with an existing Google account to save your progress and play with friends. Guest progress stays on this device."}
              </p>
              <div className="flex flex-wrap gap-2">
                {cloudAccount?.user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void cloudAccount.switchAccount?.()}
                      disabled={cloudAccount.busy}
                      className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 rounded border border-[#76a035]/50 bg-[#76a035]/15 text-[#d6f5aa] font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-[#76a035]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      {cloudAccount.busy ? "PLEASE WAIT…" : "SWITCH ACCOUNT"}
                    </button>
                    <button
                      type="button"
                      onClick={cloudAccount.disconnectGoogle}
                      disabled={cloudAccount.busy}
                      className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 rounded border border-military text-stone-400 font-mono text-[10px] font-bold uppercase tracking-widest hover:text-white hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <LogOut size={12} />
                      {cloudAccount.busy ? "PLEASE WAIT…" : "LOG OUT"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void cloudAccount?.connectGoogle?.()}
                    disabled={!cloudAccount?.configured || cloudAccount?.busy}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded border border-[#76a035]/50 bg-[#76a035]/15 text-[#d6f5aa] font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-[#76a035]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <LogIn size={12} />
                    {cloudAccount?.busy
                      ? "CONNECTING…"
                      : cloudAccount?.configured
                        ? "LOG IN WITH GOOGLE"
                        : "LOGIN UNAVAILABLE"}
                  </button>
                )}
              </div>
              {cloudAccount && !cloudAccount.configured && (
                <p className="font-mono text-[9px] text-amber-500/80">
                  Cloud login needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
                  in the app environment.
                </p>
              )}
              {cloudAccount?.error && (
                <p className="font-mono text-[9px] text-red-400" role="alert">
                  {cloudAccount.error}
                </p>
              )}
            </div>

            {/* Name editor */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400">
                OPERATOR CALLSIGN
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                className="w-full bg-stone-900 border border-military text-white font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-[#76a035] transition-colors"
                placeholder="Enter callsign…"
              />
            </div>

            {/* Level + XP */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400">
                  LEVEL PROGRESS
                </span>
                <span className="font-mono text-xs font-bold text-[#76a035]">
                  LVL {profile.level}
                </span>
              </div>
              <div className="w-full bg-stone-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#76a035] to-emerald-400 h-full rounded-full transition-all"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
              <div className="flex justify-between font-mono text-[9px] text-stone-500">
                <span>{profile.xp} XP</span>
                <span>{profile.xpRequired} XP needed</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: "MATCHES",
                  val: profile.matchesCount,
                  color: "text-[#76a035]",
                },
                {
                  label: "WEAPONS",
                  val: profile.weaponsCount,
                  color: "text-amber-400",
                },
                {
                  label: "RANK TIER",
                  val: profile.rankTier,
                  color: getRankColor(profile.rankName),
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-stone-900/60 border border-military/40 rounded p-3 text-center"
                >
                  <div className={`font-mono text-lg font-black ${s.color}`}>
                    {s.val}
                  </div>
                  <div className="font-mono text-[8px] text-stone-500 uppercase tracking-widest mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Medals */}
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400 mb-2">
                MEDALS
              </div>
              <div className="grid grid-cols-4 gap-2">
                {medals.map((m) => (
                  <div
                    key={m.label}
                    className={`flex flex-col items-center gap-1 p-2 rounded border transition-all ${m.earned ? "border-[#76a035]/50 bg-[#76a035]/10" : "border-military/30 bg-stone-900/20 opacity-35"}`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span className="font-mono text-[7px] text-center font-bold uppercase tracking-wide text-stone-400 leading-tight">
                      {m.label}
                    </span>
                    {m.earned && (
                      <span className="text-[6px] font-mono text-[#76a035] font-black uppercase">
                        ✓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Save button */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 bg-stone-900 hover:bg-stone-800 border border-military text-stone-400 py-2.5 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateProfile({ name: name.trim() || profile.name });
                  onClose();
                }}
                className="flex-1 bg-[#76a035] hover:bg-[#86b53b] text-stone-950 py-2.5 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* AVATAR tab */}
        {tab === "avatar" && (
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            <div className="text-[10px] font-mono text-stone-500 font-bold uppercase tracking-widest border-b border-military/30 pb-2">
              Choose your operator portrait.
            </div>
            <div className="grid grid-cols-3 gap-3">
              {ADMIRALS_AVATARS.map((av) => {
                const selected = profile.avatarId === av.id;
                return (
                  <button
                    key={av.id}
                    onClick={() => onUpdateProfile({ avatarId: av.id })}
                    className={`p-2 rounded border transition-all flex flex-col items-center gap-2 cursor-pointer ${selected ? "border-[#76a035] bg-[#76a035]/15" : "border-military/40 bg-stone-900/30 hover:bg-stone-900/60 hover:border-stone-500"}`}
                  >
                    <div
                      className={`w-16 h-16 rounded-full overflow-hidden border-2 ${selected ? "border-[#76a035]" : "border-military/50"}`}
                    >
                      <img
                        src={av.url}
                        alt={av.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="font-mono text-[10px] font-bold text-stone-300 uppercase tracking-wider">
                      {av.name}
                    </div>
                    {selected && <Check size={12} className="text-[#76a035]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* BORDER tab */}
        {tab === "border" && (
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            <div className="text-[10px] font-mono text-stone-500 font-bold uppercase tracking-widest border-b border-military/30 pb-2">
              Choose your avatar border style.
            </div>
            <div className="grid grid-cols-3 gap-3">
              {AVATAR_BORDERS.map((b) => {
                const selected = currentBorder === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => onUpdateProfile({ avatarBorder: b.id })}
                    className={`p-3 rounded border transition-all flex flex-col items-center gap-2.5 cursor-pointer ${selected ? "border-[#76a035] bg-[#76a035]/10" : "border-military/40 bg-stone-900/30 hover:bg-stone-900/60"}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full border-[3px] ${b.cls} ${b.preview} flex items-center justify-center`}
                    >
                      <span className="text-stone-400 text-xs font-mono font-black">
                        A
                      </span>
                    </div>
                    <div className="font-mono text-[10px] font-bold text-stone-300 uppercase tracking-wider">
                      {b.label}
                    </div>
                    {selected && <Check size={12} className="text-[#76a035]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
