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
  accountConnected,
  cloudConfigured,
  incomingFriendRequests,
  onNavigate,
  onStartMatchmaking,
  onUpdateProfile,
  onSearchPlayer,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onRemoveFriend,
  onEquipWeapon,
  onBuyItem,
  onBuyEmote,
  onSelectEmote,
  onClearHistory,
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
    <div className="lobby-home h-full min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-4 md:p-5 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 w-full">
      {/* Main content */}
      <div className="lobby-home__main md:col-span-8 xl:col-span-9 min-h-0 flex flex-col gap-4 overflow-hidden">
        {/* XP bar + status bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 bg-zinc-950/70 p-3 rounded border border-military/50 font-mono text-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="text-[#76a035] font-bold uppercase min-w-[40px]">
              XP
            </div>
            <div className="flex-1 sm:w-48 bg-stone-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#76a035] to-emerald-400 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (profile.xp / profile.xpRequired) * 100)}%`,
                }}
              />
            </div>
            <div className="text-stone-400 text-[10px] whitespace-nowrap">
              {profile.xp} / {profile.xpRequired}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-stone-400">ROLE:</span>
            <span className="font-bold text-[#76a035]">
              {profile.selectedRole}
            </span>
            <span className="text-stone-500">|</span>
            <span className="text-stone-400">MAP:</span>
            <span className="font-bold text-white">
              {profile.selectedPlace}
            </span>
            {ownedEmoteIds.length > 0 && (
              <>
                <span className="text-stone-500">|</span>
                <span className="text-purple-400 text-[10px]">
                  🎭 {ownedEmoteIds.length} emote
                  {ownedEmoteIds.length > 1 ? "s" : ""}
                </span>
              </>
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
      <div className="lobby-home__friends md:col-span-4 xl:col-span-3 min-h-0 flex flex-col overflow-hidden">
        <FriendList
          friends={friends}
          incomingRequests={incomingFriendRequests}
          accountConnected={accountConnected}
          cloudConfigured={cloudConfigured}
          onSearchPlayer={onSearchPlayer}
          onSendFriendRequest={onSendFriendRequest}
          onAcceptRequest={onAcceptFriendRequest}
          onRemoveFriend={onRemoveFriend}
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
