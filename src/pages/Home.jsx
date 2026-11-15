// Home.jsx is the main lobby page you see after logging in. It lays out the
// central menu, the friends list, and all the pop-up dialogs (shop, inventory,
// settings, etc.). It doesn't own the data itself — App.jsx passes everything
// in as props and Home just arranges it on screen.
import { useState } from "react";
import { MainMenu } from "@/components/MainMenu";
import { FriendList } from "@/components/FriendList";
import {
  LoadoutModal,
  StoreModal,
  HistoryModal,
  MenuModal,
} from "@/components/Modals";

// This is the main lobby screen (shown right after login): it combines the main menu,
// friends list, and whichever popup modal (loadout/store/history/menu) is currently open.
export default function Home({
  profile,
  friends,
  weapons,
  storeItems,
  matchHistory,
  activeMap,
  ownedEmoteIds,
  pendingModal,
  onClearModal,
  onNavigate,
  onStartMatchmaking,
  onUpdateProfile,
  onAddFriend,
  onRemoveFriend,
  onEquipWeapon,
  onBuyItem,
  onBuyEmote,
  onSelectEmote,
  onClearHistory,
  onPushAlert,
}) {
  // Each modal (loadout/store/history/settings) has its own open/closed flag
  const [loadoutOpen, setLoadoutOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // App.tsx can ask Home to open a specific modal (e.g. the header's settings button uses this)
  if (pendingModal === "loadout" && !loadoutOpen) {
    setLoadoutOpen(true);
    onClearModal();
  }
  if (pendingModal === "store" && !storeOpen) {
    setStoreOpen(true);
    onClearModal();
  }
  if (pendingModal === "history" && !historyOpen) {
    setHistoryOpen(true);
    onClearModal();
  }
  if (pendingModal === "settings" && !menuOpen) {
    setMenuOpen(true);
    onClearModal();
  }

  return (
    <div className="h-full min-h-0 overflow-hidden p-2.5 sm:p-3 md:p-4 short:p-2.5 grid grid-cols-[minmax(0,1fr)_170px] sm:grid-cols-[minmax(0,1fr)_200px] md:grid-cols-[minmax(0,1fr)_230px] xl:grid-cols-[minmax(0,1fr)_300px] gap-2.5 md:gap-3 w-full">
      {/* Main content */}
      <div className="min-h-0 flex flex-col gap-2.5 overflow-hidden">
        {/* XP + operator stats in one compact strip */}
        <div className="flex items-center gap-3 bg-zinc-950/70 px-3 py-2 rounded-lg border border-military/50 font-mono text-[10px] min-w-0">
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <span className="text-[#76a035] font-bold">XP</span>
            <div className="flex-1 bg-stone-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#76a035] to-emerald-400 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (profile.xp / profile.xpRequired) * 100)}%`,
                }}
              />
            </div>
            <span className="text-stone-400 whitespace-nowrap tabular-nums">
              {profile.xp}/{profile.xpRequired}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
            <span className="text-stone-500">
              ROLE <span className="font-bold text-[#76a035]">{profile.selectedRole}</span>
            </span>
            <span className="text-stone-700" aria-hidden="true">|</span>
            <span className="text-stone-500">
              WPN <span className="font-bold text-white">{profile.weaponsCount}</span>
            </span>
            <span className="text-stone-700" aria-hidden="true">|</span>
            <span className="text-stone-500">
              MATCH <span className="font-bold text-white">{profile.matchesCount}</span>
            </span>
            <span className="hidden md:inline text-stone-700" aria-hidden="true">|</span>
            <span className="hidden md:inline text-stone-500 max-w-[140px] truncate">
              MAP <span className="font-bold text-white">{profile.selectedPlace}</span>
            </span>
            {ownedEmoteIds.length > 0 && (
              <span className="hidden lg:inline text-purple-400">
                | {ownedEmoteIds.length} emote{ownedEmoteIds.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <MainMenu
          profile={profile}
          onOpenLoadout={() => setLoadoutOpen(true)}
          onOpenStore={() => setStoreOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
          onNavigate={onNavigate}
          onStartMatchmaking={onStartMatchmaking}
        />
      </div>

      {/* Friend Sidebar */}
      <div className="min-h-0 flex flex-col overflow-hidden">
        <FriendList
          friends={friends}
          onAddFriend={(f) => {
            onAddFriend(f);
            onPushAlert({
              message: `${f.name} added to friends!`,
              type: "success",
            });
          }}
          onRemoveFriend={onRemoveFriend}
          canInvite={false}
        />
      </div>

      {/* Modals */}
      <LoadoutModal
        isOpen={loadoutOpen}
        onClose={() => setLoadoutOpen(false)}
        weapons={weapons}
        profile={profile}
        ownedEmoteIds={ownedEmoteIds}
        onEquipToggle={onEquipWeapon}
        onSelectEmote={onSelectEmote}
      />

      <StoreModal
        isOpen={storeOpen}
        onClose={() => setStoreOpen(false)}
        coins={profile.coins}
        diamonds={profile.diamonds}
        storeItems={storeItems}
        weapons={weapons}
        ownedEmoteIds={ownedEmoteIds}
        onBuyItem={onBuyItem}
        onBuyEmote={onBuyEmote}
      />

      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        matches={matchHistory}
        onClearHistory={onClearHistory}
      />

      <MenuModal
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        profile={profile}
        onUpdateProfile={onUpdateProfile}
      />
    </div>
  );
}
