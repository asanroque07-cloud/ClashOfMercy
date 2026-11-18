// Gun pictures shown in the loadout and the store.
//
// The art is the CC0 "2D Guns" set by Kay Lousberg
// (https://opengameart.org/content/2d-guns), cropped into public/weapons.
// Every gun in the roster points at a real picture instead of the generic
// gun emoji, so the loadout/market read at a glance.
const GUN_ART = {
  ar15: "/weapons/rifle.png",
  smg9: "/weapons/smg.png",
  shotgun: "/weapons/shotgun.png",
  dmr: "/weapons/rifle-2.png",
  scout: "/weapons/sniper.png",
  awp: "/weapons/sniper-2.png",
  barrett: "/weapons/sniper.png",

  // The market lists its own gun ids (see lobbyData), so they get pictures too.
  weap_m4: "/weapons/rifle.png",
  weap_smg: "/weapons/smg.png",
  weap_shotgun: "/weapons/shotgun.png",
  weap_m249: "/weapons/rifle-2.png",
  weap_plasma: "/weapons/rifle-2.png",
  weap_pistol: "/weapons/smg.png",
  weap_sniper: "/weapons/sniper.png",
  weap_m14: "/weapons/rifle-2.png",
  weap_barrett: "/weapons/sniper.png",
  weap_awp: "/weapons/sniper-2.png",
};

// Falls back to the rifle picture so any new/renamed gun still shows art.
export function gunArtFor(id) {
  return GUN_ART[id] || "/weapons/rifle.png";
}
