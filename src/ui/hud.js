const hud = document.getElementById("hud");
const hudLine = document.getElementById("hudLine");

if (hud) {
  hud.style.pointerEvents = "none";
  hud.style.userSelect = "none";
  hud.style.zIndex = "20";
  hud.style.left = "12px";
  hud.style.top = "12px";
  hud.style.right = "auto";
}

if (hudLine) {
  hudLine.style.pointerEvents = "none";
  hudLine.style.userSelect = "none";
}

export function updateHud(profile, extra = "") {
  if (!hudLine || !profile) return;

  const parts = [`XP: ${profile.xp}`, `Level: ${profile.level}`];
  if (extra) parts.push(extra);

  hudLine.textContent = parts.join(" | ");
}