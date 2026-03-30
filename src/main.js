import Phaser from "phaser";
import { createGamePanel } from "./gamePanel";
import { createTopButtons } from "./topButtons";
import { loadSettings, saveSettings as persistSettings } from "./settings";

function getViewportSize() {
  const vv = window.visualViewport;
  return {
    width: Math.round(vv?.width || window.innerWidth),
    height: Math.round(vv?.height || window.innerHeight),
  };
}

const SERVER_URL = "/api";
const FORCE_NO_DECOMPOSE = true;

/**
 * ----------------------
 * DEBUG / TILED QUIRKS
 * ----------------------
 */
const DEBUG_DRAW_TILED_COLLISION = false;
const DEBUG_DRAW_TILED_TRIGGERS = false;
const DEBUG_LOG_BAD_POLYS = true;

// Wichtig: ObjectGroup x/y mitnehmen, sonst entstehen oft Versätze.
const OBJECTGROUP_XY_MODE = "include"; // "include" | "ignore"

// "world" ist in Phaser/Matter meist am stabilsten
const FROM_VERTICES_MODE = "world"; // "world" | "centerLocal"

const FROM_VERTICES_FLAGS = {
  removeCollinear: 0.01,
  minimumArea: 1,
};

// Kamera
const CAMERA_ZOOM_MAIN = 1;
const CAMERA_ZOOM_DUNGEON = 0.8;

// Feste World-Größe
const WORLD_WIDTH = 4096;
const WORLD_HEIGHT = 4096;

// Standard-Spawn
const DEFAULT_MAIN_SPAWN_X = 2048;
const DEFAULT_MAIN_SPAWN_Y = 2300;

// Jetzt true, damit DB-Position wieder genutzt wird.
const USE_SAVED_POSITION = true;

// Audio
const AUDIO_MENU_KEY = "menu_music";
const AUDIO_OVERWORLD_KEY = "bgm_overworld";
const AUDIO_DUNGEON_KEY = "bgm_dungeon";
const AUDIO_MENU_PATH = "/audio/menu.mp3";
const AUDIO_OVERWORLD_PATH = "/audio/overworld.mp3";
const AUDIO_DUNGEON_PATH = "/audio/dungeon.mp3";
const AUDIO_VOLUME_MENU = 0.4;
const AUDIO_VOLUME_OVERWORLD = 0.4;
const AUDIO_VOLUME_DUNGEON = 0.35;

// Mobile / Device
const IS_TOUCH_DEVICE =
  window.matchMedia?.("(pointer: coarse)")?.matches ||
  navigator.maxTouchPoints > 0 ||
  "ontouchstart" in window;

const MOBILE_LIGHT_MODE = false;
const GAME_RENDERER_TYPE = Phaser.AUTO;

let settings = loadSettings();

function saveSettings(nextSettings = settings) {
  settings = { ...nextSettings };
  persistSettings(settings);
}

// ----------------------
// Telegram / User
// ----------------------
function getTelegramUserId() {
  const tg = window.Telegram?.WebApp;
  const id = tg?.initDataUnsafe?.user?.id;
  if (id) return String(id);

  const key = "dev_user_id";
  let dev = localStorage.getItem(key);
  if (!dev) {
    dev = String(Math.floor(Math.random() * 1e9));
    localStorage.setItem(key, dev);
  }
  return dev;
}

const USER_ID = getTelegramUserId();

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.disableVerticalSwipes?.();
}

// ----------------------
// Critter catalog
// ----------------------
const CRITTERS = [
  { id: "c1", nftNumber: "001", name: "Fluffel", folder: "001_fluffel" },
  { id: "c2", nftNumber: "002", name: "Sparkling", folder: "002_sparkling" },
  { id: "c3", nftNumber: "003", name: "Glowbe", folder: "003_glowbe" },
  { id: "c4", nftNumber: "004", name: "Puddle", folder: "004_puddle" },
  { id: "c5", nftNumber: "005", name: "Bounceling", folder: "005_bounceling" },
  { id: "c6", nftNumber: "006", name: "Nutkin", folder: "006_nutkin" },
  { id: "c7", nftNumber: "007", name: "Zapsy", folder: "007_zapsy" },
  { id: "c8", nftNumber: "008", name: "Bubblepub", folder: "008_bubblepub" },
  { id: "c9", nftNumber: "009", name: "Leaflet", folder: "009_leaflet" },
  { id: "c10", nftNumber: "010", name: "Starling", folder: "010_starling" },
  { id: "c11", nftNumber: "011", name: "Pebblet", folder: "011_pebblet" },
  { id: "c12", nftNumber: "012", name: "Whiskling", folder: "012_whiskling" },
];

const critterIdleKey = (id) => `critter_${id}_idle`;
const critterWalkKey = (id) => `critter_${id}_walk`;

function getCritterAssetBase(folder) {
  return `/assets/critters/${folder}`;
}

function getCritterIdleTexture(id) {
  return critterIdleKey(id);
}

function getCritterWalkTexture(id) {
  return critterWalkKey(id);
}

// ----------------------
// Default profile fallback
// ----------------------
function makeDefaultProfile() {
  return {
    userId: USER_ID,
    xp: 0,
    level: 1,
    selectedCritterId: "c1",
    ownedCritterIds: [
      "c1",
      "c2",
      "c3",
      "c4",
      "c5",
      "c6",
      "c7",
      "c8",
      "c9",
      "c10",
      "c11",
      "c12",
    ],
    ownedAccessoryIds: [],
    equippedAccessories: {
      head: null,
      body: null,
      aura: null,
    },
    wallet: null,
    ownership: {
      lastCheckedAt: null,
      source: "dev",
    },
    x: null,
    y: null,
  };
}

function normalizeProfile(p) {
  const profile = p && typeof p === "object" ? p : makeDefaultProfile();

  profile.xp = typeof profile.xp === "number" ? profile.xp : 0;
  profile.level = typeof profile.level === "number" ? profile.level : 1;

  profile.ownedCritterIds =
    Array.isArray(profile.ownedCritterIds) && profile.ownedCritterIds.length
      ? Array.from(
          new Set(
            profile.ownedCritterIds.filter((id) =>
              CRITTERS.some((c) => c.id === id)
            )
          )
        )
      : ["c1"];

  if (profile.ownedCritterIds.length === 0) {
    profile.ownedCritterIds = ["c1"];
  }

  profile.selectedCritterId =
    typeof profile.selectedCritterId === "string"
      ? profile.selectedCritterId
      : profile.ownedCritterIds[0] ?? "c1";

  if (!profile.ownedCritterIds.includes(profile.selectedCritterId)) {
    profile.selectedCritterId = profile.ownedCritterIds[0] ?? "c1";
  }

  if (!Array.isArray(profile.ownedAccessoryIds)) {
    profile.ownedAccessoryIds = [];
  }

  if (
    !profile.equippedAccessories ||
    typeof profile.equippedAccessories !== "object"
  ) {
    profile.equippedAccessories = { head: null, body: null, aura: null };
  } else {
    profile.equippedAccessories = {
      head: profile.equippedAccessories.head ?? null,
      body: profile.equippedAccessories.body ?? null,
      aura: profile.equippedAccessories.aura ?? null,
    };
  }

  profile.wallet = typeof profile.wallet === "string" ? profile.wallet : null;

  if (!profile.ownership || typeof profile.ownership !== "object") {
    profile.ownership = { lastCheckedAt: null, source: "dev" };
  } else {
    profile.ownership = {
      lastCheckedAt: profile.ownership.lastCheckedAt ?? null,
      source: profile.ownership.source ?? "dev",
    };
  }

  profile.x = typeof profile.x === "number" ? profile.x : null;
  profile.y = typeof profile.y === "number" ? profile.y : null;

  return profile;
}

let profile = makeDefaultProfile();

// ----------------------
// API
// ----------------------
async function apiGetMe() {
  try {
    const r = await fetch(`${SERVER_URL}/me`, {
      headers: { "x-user-id": USER_ID },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`GET /me failed (${r.status}) ${text}`);
    }

    return normalizeProfile(await r.json());
  } catch (err) {
    console.error("apiGetMe fallback:", err);
    return normalizeProfile(makeDefaultProfile());
  }
}

async function apiSave(state) {
  try {
    const r = await fetch(`${SERVER_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": USER_ID },
      body: JSON.stringify(state),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`POST /save failed (${r.status}) ${text}`);
    }
  } catch (err) {
    console.error("apiSave failed:", err);
  }
}

async function apiOwnershipRefresh() {
  const r = await fetch(`${SERVER_URL}/ownership/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": USER_ID },
    body: JSON.stringify({}),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`POST /ownership/refresh failed (${r.status}) ${text}`);
  }

  return r.json();
}

// ----------------------
// Save helper
// ----------------------
function saveCurrentPlayerState(scene) {
  if (!scene?.player) return;

  profile.x = scene.player.x;
  profile.y = scene.player.y;

  apiSave({
    xp: profile.xp,
    level: profile.level,
    selectedCritterId: profile.selectedCritterId,
    x: profile.x,
    y: profile.y,
    equippedAccessories: profile.equippedAccessories,
  });
}

// ----------------------
// Audio helpers
// ----------------------
function stopMusic(scene, key) {
  const s = scene.sound.get(key);
  if (s) s.stop();
}

function stopAllKnownMusic(scene) {
  stopMusic(scene, AUDIO_MENU_KEY);
  stopMusic(scene, AUDIO_OVERWORLD_KEY);
  stopMusic(scene, AUDIO_DUNGEON_KEY);
}

function getMusicVolume(baseVolume) {
  return Math.max(0, Math.min(1, baseVolume * settings.musicVolume));
}

function playLoopIfNeeded(scene, key, volume) {
  let s = scene.sound.get(key);

  if (!settings.musicEnabled) {
    if (s && s.isPlaying) s.stop();
    return null;
  }

  const finalVolume = getMusicVolume(volume);

  if (s) {
    s.setVolume(finalVolume);
    if (!s.isPlaying) s.play();
    return s;
  }

  s = scene.sound.add(key, {
    loop: true,
    volume: finalVolume,
  });

  s.play();
  return s;
}

function ensureMenuMusic(scene) {
  stopMusic(scene, AUDIO_OVERWORLD_KEY);
  stopMusic(scene, AUDIO_DUNGEON_KEY);
  playLoopIfNeeded(scene, AUDIO_MENU_KEY, AUDIO_VOLUME_MENU);
}

function ensureOverworldMusic(scene) {
  stopMusic(scene, AUDIO_MENU_KEY);
  stopMusic(scene, AUDIO_DUNGEON_KEY);
  playLoopIfNeeded(scene, AUDIO_OVERWORLD_KEY, AUDIO_VOLUME_OVERWORLD);
}

function ensureDungeonMusic(scene) {
  stopMusic(scene, AUDIO_MENU_KEY);
  stopMusic(scene, AUDIO_OVERWORLD_KEY);
  playLoopIfNeeded(scene, AUDIO_DUNGEON_KEY, AUDIO_VOLUME_DUNGEON);
}

function attachAudioUnlock(scene, startFn) {
  if (!settings.musicEnabled) return;

  if (scene.sound.locked) {
    scene.input.once("pointerdown", () => startFn());
  } else {
    startFn();
  }
}

function applySceneMusicSettings(scene) {
  if (!scene?.sound) return;

  const menuMusic = scene.sound.get(AUDIO_MENU_KEY);
  const overworldMusic = scene.sound.get(AUDIO_OVERWORLD_KEY);
  const dungeonMusic = scene.sound.get(AUDIO_DUNGEON_KEY);

  if (menuMusic) {
    if (!settings.musicEnabled) {
      if (menuMusic.isPlaying) menuMusic.stop();
    } else {
      menuMusic.setVolume(getMusicVolume(AUDIO_VOLUME_MENU));
    }
  }

  if (overworldMusic) {
    if (!settings.musicEnabled) {
      if (overworldMusic.isPlaying) overworldMusic.stop();
    } else {
      overworldMusic.setVolume(getMusicVolume(AUDIO_VOLUME_OVERWORLD));
    }
  }

  if (dungeonMusic) {
    if (!settings.musicEnabled) {
      if (dungeonMusic.isPlaying) dungeonMusic.stop();
    } else {
      dungeonMusic.setVolume(getMusicVolume(AUDIO_VOLUME_DUNGEON));
    }
  }
}

function applyGlobalMusicSettings(game) {
  if (!game?.scene?.scenes) return;

  for (const scene of game.scene.scenes) {
    if (!scene || !scene.scene?.isActive()) continue;
    applySceneMusicSettings(scene);
  }
}

function switchSceneToMenu(scene) {
  if (!scene) return;

  scene.invRoot?.__inv?.close?.();
  saveCurrentPlayerState(scene);
  stopAllKnownMusic(scene);

  if (scene.isTransitioning) return;
  scene.isTransitioning = true;

  if (scene.scene.key === "menu") return;

  if (scene.cameras?.main) {
    scene.cameras.main.fadeOut(300, 0, 0, 0);

    scene.time.delayedCall(320, () => {
      scene.scene.start("menu");
    });
  } else {
    scene.scene.start("menu");
  }
}

const gamePanelApi = createGamePanel({
  CRITTERS,
  getCritterAssetBase,
  getSettings: () => settings,
  saveSettings,
  stopAllKnownMusic,
  applyGlobalMusicSettings,
  ensureMenuMusic,
  ensureOverworldMusic,
  ensureDungeonMusic,
  switchSceneToMenu,
});

const topButtonsApi = createTopButtons();

// ----------------------
// HUD
// ----------------------
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

function updateHud(extra = "") {
  if (!hudLine) return;

  const parts = [`XP: ${profile.xp}`, `Level: ${profile.level}`];
  if (extra) parts.push(extra);

  hudLine.textContent = parts.join(" | ");
}

// ----------------------
// Legacy DOM joystick
// ----------------------
const stickBase = document.getElementById("stickBase");
const stickKnob = document.getElementById("stickKnob");

let stickActive = false;
let stickCenter = { x: 0, y: 0 };
let stickVec = { x: 0, y: 0 };

function setKnob(dx, dy) {
  if (!stickKnob) return;
  stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}

function clampStick(dx, dy, maxR) {
  const len = Math.hypot(dx, dy);
  if (len <= maxR) return { dx, dy };
  const s = maxR / len;
  return { dx: dx * s, dy: dy * s };
}

function resetStick() {
  stickActive = false;
  stickVec = { x: 0, y: 0 };
  setKnob(0, 0);
}

if (stickBase) {
  stickBase.addEventListener("pointerdown", (e) => {
    stickActive = true;
    const r = stickBase.getBoundingClientRect();
    stickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    stickBase.setPointerCapture(e.pointerId);
  });

  stickBase.addEventListener("pointermove", (e) => {
    if (!stickActive) return;
    const dx = e.clientX - stickCenter.x;
    const dy = e.clientY - stickCenter.y;
    const maxR = 46;
    const c = clampStick(dx, dy, maxR);
    setKnob(c.dx, c.dy);
    stickVec = { x: c.dx / maxR, y: c.dy / maxR };
  });

  stickBase.addEventListener("pointerup", resetStick);
  stickBase.addEventListener("pointercancel", resetStick);
  stickBase.addEventListener("pointerleave", resetStick);
}

// ----------------------
// Mobile touch drag movement
// ----------------------
let touchMoveActive = false;
let touchMovePointerId = null;
let touchMoveStart = { x: 0, y: 0 };
let touchMoveVec = { x: 0, y: 0 };

function resetTouchMove() {
  touchMoveActive = false;
  touchMovePointerId = null;
  touchMoveVec = { x: 0, y: 0 };
}

function isTouchLikePointer(pointer) {
  return !!(pointer?.wasTouch || pointer?.pointerType === "touch");
}

function updateTouchMoveVector(pointer) {
  const dx = pointer.x - touchMoveStart.x;
  const dy = pointer.y - touchMoveStart.y;
  const maxR = 84;
  const len = Math.hypot(dx, dy);

  if (len < 10) {
    touchMoveVec = { x: 0, y: 0 };
    return;
  }

  const clampedScale = len > maxR ? maxR / len : 1;

  touchMoveVec = {
    x: (dx * clampedScale) / maxR,
    y: (dy * clampedScale) / maxR,
  };
}

function getAnalogMoveVector() {
  let x = 0;
  let y = 0;

  if (touchMoveActive) {
    x = touchMoveVec.x;
    y = touchMoveVec.y;
  } else if (stickActive) {
    x = stickVec.x;
    y = stickVec.y;
  }

  if (Math.hypot(x, y) < 0.18) {
    return { x: 0, y: 0 };
  }

  return { x, y };
}

function bindSceneTouchMovement(scene) {
  if (!IS_TOUCH_DEVICE) return;

  const onDown = (pointer) => {
    if (!isTouchLikePointer(pointer)) return;
    if (touchMoveActive) return;
    if (performance.now() < topButtonsApi.getUiBlockUntil()) return;

    if (pointer.event?.target instanceof HTMLCanvasElement === false) return;
    if (pointer.downElement && pointer.downElement !== scene.game.canvas) return;

    touchMoveActive = true;
    touchMovePointerId = pointer.id;
    touchMoveStart = { x: pointer.x, y: pointer.y };
    touchMoveVec = { x: 0, y: 0 };
  };

  const onMove = (pointer) => {
    if (!touchMoveActive) return;
    if (pointer.id !== touchMovePointerId) return;
    updateTouchMoveVector(pointer);
  };

  const onUp = (pointer) => {
    if (pointer.id !== touchMovePointerId) return;
    resetTouchMove();
  };

  scene.input.on("pointerdown", onDown);
  scene.input.on("pointermove", onMove);
  scene.input.on("pointerup", onUp);
  scene.input.on("pointercancel", onUp);

  scene.events.once("shutdown", () => {
    scene.input.off("pointerdown", onDown);
    scene.input.off("pointermove", onMove);
    scene.input.off("pointerup", onUp);
    scene.input.off("pointercancel", onUp);
    resetTouchMove();
  });
}

window.addEventListener("blur", () => {
  resetStick();
  resetTouchMove();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    resetStick();
    resetTouchMove();
  }
});

// ----------------------
// Geometry helpers
// ----------------------
function rectContains(x, y, rx, ry, rw, rh) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

function pointInPoly(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;

    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

function getObjProps(obj) {
  const p = obj?.properties;
  if (!p) return {};
  if (Array.isArray(p)) {
    const out = {};
    for (const it of p) out[it.name] = it.value;
    return out;
  }
  return p;
}

function pointInTiledObject(px, py, obj, offX = 0, offY = 0) {
  const ox = offX + (obj.x ?? 0);
  const oy = offY + (obj.y ?? 0);

  if (
    typeof obj.width === "number" &&
    typeof obj.height === "number" &&
    !obj.polygon
  ) {
    return rectContains(px, py, ox, oy, obj.width, obj.height);
  }

  if (Array.isArray(obj.polygon) && obj.polygon.length >= 3) {
    const pts = obj.polygon.map((p) => ({
      x: ox + p.x,
      y: oy + p.y,
    }));
    return pointInPoly(px, py, pts);
  }

  return false;
}

function pointHitsAnyCollision(x, y, objects, offX, offY) {
  if (!Array.isArray(objects)) return false;
  for (const o of objects) {
    if (pointInTiledObject(x, y, o, offX, offY)) return true;
  }
  return false;
}

function findNearbyFreePoint(
  baseX,
  baseY,
  objects,
  offX,
  offY,
  maxRadius = 320,
  step = 24
) {
  if (!pointHitsAnyCollision(baseX, baseY, objects, offX, offY)) {
    return { x: baseX, y: baseY };
  }

  for (let radius = step; radius <= maxRadius; radius += step) {
    const candidates = [
      { x: baseX + radius, y: baseY },
      { x: baseX - radius, y: baseY },
      { x: baseX, y: baseY + radius },
      { x: baseX, y: baseY - radius },
      { x: baseX + radius, y: baseY + radius },
      { x: baseX - radius, y: baseY + radius },
      { x: baseX + radius, y: baseY - radius },
      { x: baseX - radius, y: baseY - radius },
    ];

    for (const p of candidates) {
      if (
        p.x >= 0 &&
        p.x <= WORLD_WIDTH &&
        p.y >= 0 &&
        p.y <= WORLD_HEIGHT &&
        !pointHitsAnyCollision(p.x, p.y, objects, offX, offY)
      ) {
        return p;
      }
    }
  }

  return { x: baseX, y: baseY };
}

// ----------------------
// Tiled helpers
// ----------------------
function getMapData(scene, key) {
  const entry = scene.cache.tilemap.get(key);
  return entry?.data ?? entry ?? null;
}

function findObjectLayer(mapData, layerName) {
  const root = mapData?.layers;
  if (!Array.isArray(root)) return null;

  function walk(layers, parentX = 0, parentY = 0) {
    for (const layer of layers) {
      if (!layer) continue;

      let layerX = parentX + (layer.offsetx ?? 0);
      let layerY = parentY + (layer.offsety ?? 0);

      if (layer.type === "group") {
        layerX += layer.x ?? 0;
        layerY += layer.y ?? 0;
      }

      if (layer.type === "objectgroup") {
        if (OBJECTGROUP_XY_MODE === "include") {
          layerX += layer.x ?? 0;
          layerY += layer.y ?? 0;
        }

        if (layer.name === layerName) {
          return {
            layer,
            offsetX: layerX,
            offsetY: layerY,
          };
        }
      }

      if (layer.type === "group" && Array.isArray(layer.layers)) {
        const found = walk(layer.layers, layerX, layerY);
        if (found) return found;
      }
    }
    return null;
  }

  return walk(root, 0, 0);
}

function findSpawn(mapData, spawnName = "entry") {
  const sp =
    findObjectLayer(mapData, "spawns") ?? findObjectLayer(mapData, "triggers");
  const objs = Array.isArray(sp?.layer?.objects) ? sp.layer.objects : [];
  const offX = sp?.offsetX ?? 0;
  const offY = sp?.offsetY ?? 0;

  const isSpawn = (o) => {
    const props = getObjProps(o);
    const t = String(o.type || props.type || "").toLowerCase();
    return t === "spawn";
  };

  const byName = objs.find(
    (o) =>
      isSpawn(o) &&
      String(o.name || "").toLowerCase() === String(spawnName).toLowerCase()
  );

  const any = objs.find((o) => isSpawn(o));
  const o = byName ?? any;
  if (!o) return null;

  const widthHalf = typeof o.width === "number" ? o.width / 2 : 0;
  const heightHalf = typeof o.height === "number" ? o.height / 2 : 0;

  return {
    x: offX + (o.x ?? 0) + widthHalf,
    y: offY + (o.y ?? 0) + heightHalf,
  };
}

function debugDrawTiledObjects(
  scene,
  objects,
  offX,
  offY,
  color = 0xff00ff,
  alpha = 0.9,
  depth = 100000
) {
  const g = scene.add.graphics().setDepth(depth);
  g.lineStyle(2, color, alpha);

  for (const o of objects) {
    const ox = offX + (o.x ?? 0);
    const oy = offY + (o.y ?? 0);

    if (Array.isArray(o.polygon) && o.polygon.length >= 2) {
      g.beginPath();
      g.moveTo(ox + o.polygon[0].x, oy + o.polygon[0].y);
      for (let i = 1; i < o.polygon.length; i++) {
        g.lineTo(ox + o.polygon[i].x, oy + o.polygon[i].y);
      }
      g.lineTo(ox + o.polygon[0].x, oy + o.polygon[0].y);
      g.strokePath();
    } else if (typeof o.width === "number" && typeof o.height === "number") {
      g.strokeRect(ox, oy, o.width, o.height);
    }
  }

  return g;
}

// ----------------------
// Polygon validation
// ----------------------
function isSelfIntersecting(poly) {
  const n = poly.length;
  if (n < 4) return false;

  const cross = (p, q, r) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);

  function segIntersects(a, b, c, d) {
    const d1 = cross(a, b, c);
    const d2 = cross(a, b, d);
    const d3 = cross(c, d, a);
    const d4 = cross(c, d, b);

    const abStraddles = (d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0);
    const cdStraddles = (d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0);
    return abStraddles && cdStraddles;
  }

  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];

    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1) continue;
      if (i === 0 && j === n - 1) continue;

      const c = poly[j];
      const d = poly[(j + 1) % n];
      if (segIntersects(a, b, c, d)) return true;
    }
  }

  return false;
}

function validatePoly(scene, name, worldPts) {
  if (!DEBUG_LOG_BAD_POLYS) return;
  const Matter = Phaser.Physics.Matter.Matter;

  const convex = Matter.Vertices.isConvex(worldPts);
  const selfX = isSelfIntersecting(worldPts);
  const tooMany = worldPts.length > 40;

  if (!convex || selfX || tooMany) {
    console.warn(
      `[POLY WARN] ${name} points=${worldPts.length} convex=${convex} selfIntersect=${selfX} tooMany=${tooMany}`
    );
  }
}

function addStaticPoly(scene, worldPts, nameForLogs = "poly") {
  if (!Array.isArray(worldPts) || worldPts.length < 3) return;

  const Matter = Phaser.Physics.Matter.Matter;
  validatePoly(scene, nameForLogs, worldPts);

  const centre = Matter.Vertices.centre(worldPts);

  try {
    if (FROM_VERTICES_MODE === "world") {
      scene.matter.add.fromVertices(
        centre.x,
        centre.y,
        [worldPts],
        { isStatic: true },
        !FORCE_NO_DECOMPOSE,
        FROM_VERTICES_FLAGS
      );
      return;
    }

    const localVerts = worldPts.map((p) => ({
      x: p.x - centre.x,
      y: p.y - centre.y,
    }));

    scene.matter.add.fromVertices(
      centre.x,
      centre.y,
      [localVerts],
      { isStatic: true },
      !FORCE_NO_DECOMPOSE,
      FROM_VERTICES_FLAGS
    );
  } catch (err) {
    console.warn(`[POLY ERROR] ${nameForLogs}`, err);
  }
}

// ----------------------
// Critter visual helpers
// ----------------------
function setCritterIdle(scene) {
  if (!scene.player) return;
  const id = profile.selectedCritterId;
  const idleKey = getCritterIdleTexture(id);

  if (scene.player.texture.key !== idleKey) {
    scene.player.setTexture(idleKey);
  }
}

function setCritterMoving(scene, time) {
  if (!scene.player) return;
  const id = profile.selectedCritterId;
  const idleKey = getCritterIdleTexture(id);
  const walkKey = getCritterWalkTexture(id);

  const frameFlip = Math.floor(time / 140) % 2 === 0;
  const nextKey = frameFlip ? walkKey : idleKey;

  if (scene.player.texture.key !== nextKey) {
    scene.player.setTexture(nextKey);
  }
}

function updateCritterMotionTexture(scene, moving, time) {
  if (moving) {
    setCritterMoving(scene, time);
  } else {
    setCritterIdle(scene);
  }
}

function updatePlayerFacing(player, vx) {
  if (!player) return;

  if (vx < -0.05) {
    player.setFlipX(true);
  } else if (vx > 0.05) {
    player.setFlipX(false);
  }
}

function getSceneUiScale(scene) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const base = Math.min(w / 1280, h / 720);
  return Phaser.Math.Clamp(base, 0.62, 1.12);
}

// ----------------------
// Menu Scene
// ----------------------
class MenuScene extends Phaser.Scene {
  constructor() {
    super("menu");
    this.bg = null;
    this.overlay = null;
    this.titleText = null;
    this.subText = null;
    this.menuMusic = null;
    this.menuButtons = [];
    this.isStartingGame = false;
    this.isTransitioning = false;
    this.invRoot = null;
  }

  preload() {
    this.load.image("menu_bg", "/maps/menu_bg.png");
    this.load.audio(AUDIO_MENU_KEY, AUDIO_MENU_PATH);
  }

  getUiScale() {
    return getSceneUiScale(this);
  }

  getMenuLayout() {
    const { width, height } = this.scale;
    const ui = this.getUiScale();

    const btnW = Math.min(width * 0.78, Math.round(340 * ui));
    const btnH = Math.min(height * 0.1, Math.round(60 * ui));

    return {
      width,
      height,
      ui,
      btnW,
      btnH,
      titleY: height * (IS_TOUCH_DEVICE ? 0.16 : 0.18),
      subY: height * (IS_TOUCH_DEVICE ? 0.25 : 0.27),
      buttonYs: [
        height * (IS_TOUCH_DEVICE ? 0.45 : 0.48),
        height * (IS_TOUCH_DEVICE ? 0.57 : 0.60),
        height * (IS_TOUCH_DEVICE ? 0.69 : 0.72),
      ],
    };
  }

  create() {
    const layout = this.getMenuLayout();

    this.isStartingGame = false;
    this.isTransitioning = false;

    topButtonsApi.ensureTopButtonsDom().__topButtons.hide();
    this.isTransitioning = false;

    this.invRoot = gamePanelApi.ensureGamePanelDom({
      onSelectCritter: () => {},
      onEquipAccessory: () => {},
      onRefreshOwnership: async () => {},
    });
    this.invRoot.__inv.setScene(this);
    this.invRoot.__inv.setProfile(profile);
    this.invRoot.__inv.close();

    this.cameras.main.setBackgroundColor("#0b0b0f");

    this.bg = this.add.image(0, 0, "menu_bg").setOrigin(0, 0).setDepth(-100);
    this.bg.setDisplaySize(layout.width, layout.height);

    this.overlay = this.add
      .rectangle(
        layout.width / 2,
        layout.height / 2,
        layout.width,
        layout.height,
        0x000000,
        0.42
      )
      .setDepth(-50);

    this.titleText = this.add
      .text(layout.width / 2, layout.titleY, "EVOLUCIA", {
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.round(48 * layout.ui)}px`,
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: Math.max(2, Math.round(6 * layout.ui)),
        shadow: {
          offsetX: 0,
          offsetY: Math.max(1, Math.round(2 * layout.ui)),
          color: "#000000",
          blur: Math.max(2, Math.round(8 * layout.ui)),
          fill: true,
        },
      })
      .setOrigin(0.5);

    this.subText = this.add
      .text(layout.width / 2, layout.subY, "Prototype Build", {
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.round(18 * layout.ui)}px`,
        color: "#d7d7e6",
        stroke: "#000000",
        strokeThickness: Math.max(1, Math.round(3 * layout.ui)),
      })
      .setOrigin(0.5);

    this.menuButtons = [
      this.createMenuButton(
        layout.width / 2,
        layout.buttonYs[0],
        layout.btnW,
        layout.btnH,
        "Start Game",
        () => this.startGameWithFade()
      ),

      this.createMenuButton(
        layout.width / 2,
        layout.buttonYs[1],
        layout.btnW,
        layout.btnH,
        "Settings",
        () => {
          this.invRoot.__inv.setScene(this);
          this.invRoot.__inv.setTab("settings");
          this.invRoot.__inv.open();
        }
      ),

      this.createMenuButton(
        layout.width / 2,
        layout.buttonYs[2],
        layout.btnW,
        layout.btnH,
        "Inventory Test später",
        () => {
          alert("Weitere Menüpunkte kommen später.");
        }
      ),
    ];

    this.menuMusic = this.sound.add(AUDIO_MENU_KEY, {
      loop: true,
      volume: getMusicVolume(AUDIO_VOLUME_MENU),
    });

    if (settings.musicEnabled) {
      if (this.sound.locked) {
        this.input.once("pointerdown", () => {
          ensureMenuMusic(this);
        });
      } else {
        ensureMenuMusic(this);
      }
    }

    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.scale.on("resize", this.onResize, this);

    this.events.once("shutdown", () => {
      this.scale.off("resize", this.onResize, this);
      this.invRoot?.__inv?.close?.();
    });
  }

  createMenuButton(x, y, width, height, label, onClick) {
    const ui = this.getUiScale();
    const container = this.add.container(x, y);

    const shadow = this.add
      .rectangle(0, 4 * ui, width, height, 0x000000, 0.28)
      .setStrokeStyle(0);

    const bg = this.add
      .rectangle(0, 0, width, height, 0x1a1f2e, 0.88)
      .setStrokeStyle(Math.max(1, Math.round(2 * ui)), 0xaad8ff, 0.35);

    const glow = this.add
      .rectangle(0, 0, width, height, 0x7fd4ff, 0.08)
      .setVisible(false);

    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.round(26 * ui)}px`,
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: Math.max(1, Math.round(3 * ui)),
      })
      .setOrigin(0.5);

    const hit = this.add
      .rectangle(0, 0, width, height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: !IS_TOUCH_DEVICE });

    hit.on("pointerover", () => {
      if (IS_TOUCH_DEVICE) return;
      bg.setFillStyle(0x232b3f, 0.96);
      bg.setStrokeStyle(Math.max(1, Math.round(2 * ui)), 0xc6ecff, 0.65);
      glow.setVisible(true);
      container.setScale(1.02);
    });

    hit.on("pointerout", () => {
      bg.setFillStyle(0x1a1f2e, 0.88);
      bg.setStrokeStyle(Math.max(1, Math.round(2 * ui)), 0xaad8ff, 0.35);
      glow.setVisible(false);
      container.setScale(1);
    });

    hit.on("pointerdown", () => {
      if (this.isStartingGame) return;
      container.setScale(0.98);
    });

    hit.on("pointerup", () => {
      if (this.isStartingGame) return;
      container.setScale(IS_TOUCH_DEVICE ? 1 : 1.02);
      onClick();
    });

    container.add([shadow, bg, glow, text, hit]);
    return container;
  }

  startGameWithFade() {
    if (this.isStartingGame) return;
    this.isStartingGame = true;

    if (this.menuMusic) {
      this.tweens.add({
        targets: this.menuMusic,
        volume: 0,
        duration: 500,
        ease: "Sine.easeInOut",
        onComplete: () => {
          if (this.menuMusic) {
            this.menuMusic.stop();
          }
        },
      });
    }

    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.time.delayedCall(520, () => {
      this.scene.start("main");
    });
  }

  onResize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;
    const layout = this.getMenuLayout();

    if (this.bg) {
      this.bg.setDisplaySize(width, height);
    }

    if (this.overlay) {
      this.overlay.setPosition(width / 2, height / 2);
      this.overlay.setSize(width, height);
    }

    if (this.titleText) {
      this.titleText.setPosition(width / 2, layout.titleY);
      this.titleText.setFontSize(Math.round(48 * layout.ui));
      this.titleText.setStroke(
        "#000000",
        Math.max(2, Math.round(6 * layout.ui))
      );
    }

    if (this.subText) {
      this.subText.setPosition(width / 2, layout.subY);
      this.subText.setFontSize(Math.round(18 * layout.ui));
      this.subText.setStroke(
        "#000000",
        Math.max(1, Math.round(3 * layout.ui))
      );
    }

    if (this.menuButtons[0]) {
      this.menuButtons[0].setPosition(width / 2, layout.buttonYs[0]);
    }

    if (this.menuButtons[1]) {
      this.menuButtons[1].setPosition(width / 2, layout.buttonYs[1]);
    }

    if (this.menuButtons[2]) {
      this.menuButtons[2].setPosition(width / 2, layout.buttonYs[2]);
    }
  }
}

// ----------------------
// Main Scene
// ----------------------
class MainScene extends Phaser.Scene {
  constructor() {
    super("main");

    this.player = null;
    this.foreground = null;
    this.cursors = null;
    this.wasd = null;

    this.nextSaveAt = 0;

    this.worldWidth = WORLD_WIDTH;
    this.worldHeight = WORLD_HEIGHT;

    this.zones = [];
    this.zonesOffset = { x: 0, y: 0 };

    this.triggers = [];
    this.triggersOffset = { x: 0, y: 0 };
    this.triggerCooldownUntil = 0;

    this.targetMarker = null;
    this.invRoot = null;
    this.topButtons = null;
    this.isTransitioning = false;
  }

  preload() {
    this.load.on("loaderror", (file) => {
      console.error("LOAD ERROR:", file.key, file.src);
    });

    this.load.tilemapTiledJSON("evoMap", "/maps/evolucia.json");
    this.load.image("evoBg", "/maps/background_v2.png");
    this.load.image("evoFg", "/maps/foreground_v2.png");

    if (!MOBILE_LIGHT_MODE) {
      this.load.image("spore", "/effects/spore.png");
    }

    this.load.tilemapTiledJSON("dungeon1", "/maps/dungeon1.json");
    this.load.image("dungeon1_bg", "/maps/dungeon1.png");

    this.load.audio(AUDIO_OVERWORLD_KEY, AUDIO_OVERWORLD_PATH);
    this.load.audio(AUDIO_DUNGEON_KEY, AUDIO_DUNGEON_PATH);

    for (const c of CRITTERS) {
      const base = getCritterAssetBase(c.folder);
      this.load.image(critterIdleKey(c.id), `${base}/spritesheet.png`);
      this.load.image(critterWalkKey(c.id), `${base}/walk_01.png`);
    }
  }

  getZoneName(x, y) {
    for (const z of this.zones) {
      if (!z) continue;

      const ox = (this.zonesOffset?.x ?? 0) + (z.x ?? 0);
      const oy = (this.zonesOffset?.y ?? 0) + (z.y ?? 0);

      if (
        typeof z.width === "number" &&
        typeof z.height === "number" &&
        !z.polygon
      ) {
        if (rectContains(x, y, ox, oy, z.width, z.height)) {
          return z.name || "zone";
        }
      }

      if (Array.isArray(z.polygon) && z.polygon.length >= 3) {
        const pts = z.polygon.map((p) => ({ x: ox + p.x, y: oy + p.y }));
        if (pointInPoly(x, y, pts)) return z.name || "zone";
      }
    }

    return "unknown";
  }

  create(data) {
    console.log("MAIN CREATE START", data);

    this.isTransitioning = false;
    this.triggerCooldownUntil = 0;

    this.cameras.main.roundPixels = false;
    this.cameras.main.setBackgroundColor("#111122");
    this.cameras.main.fadeIn(500, 0, 0, 0);

    attachAudioUnlock(this, () => ensureOverworldMusic(this));
    bindSceneTouchMovement(this);

    this.matter.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.add.image(0, 0, "evoBg").setOrigin(0, 0).setDepth(-100);

    if (this.textures.exists("spore")) {
      const spores = this.add.particles(0, 0, "spore", {
        x: { min: 0, max: this.worldWidth },
        y: { min: 0, max: this.worldHeight },
        lifespan: 8000,
        speedY: { min: -10, max: -20 },
        scale: { start: 0.4, end: 0 },
        quantity: 1,
        blendMode: "ADD",
      });
      spores.setDepth(10);
    }

    const mapData = getMapData(this, "evoMap");
    if (!mapData) console.error("No map data found in cache for evoMap");

    const tiledSpawn = mapData ? findSpawn(mapData, "entry") : null;

    const zonesFound = findObjectLayer(mapData, "zones");
    this.zones = Array.isArray(zonesFound?.layer?.objects)
      ? zonesFound.layer.objects
      : [];
    this.zonesOffset = {
      x: zonesFound?.offsetX ?? 0,
      y: zonesFound?.offsetY ?? 0,
    };

    const collFound = findObjectLayer(mapData, "collision");
    const collObjects = Array.isArray(collFound?.layer?.objects)
      ? collFound.layer.objects
      : [];
    const collOffX = collFound?.offsetX ?? 0;
    const collOffY = collFound?.offsetY ?? 0;

    const trigFound = findObjectLayer(mapData, "triggers");
    this.triggers = Array.isArray(trigFound?.layer?.objects)
      ? trigFound.layer.objects
      : [];
    this.triggersOffset = {
      x: trigFound?.offsetX ?? 0,
      y: trigFound?.offsetY ?? 0,
    };

    for (const o of collObjects) {
      if (Array.isArray(o.polygon) && o.polygon.length >= 3) {
        const ox = collOffX + (o.x ?? 0);
        const oy = collOffY + (o.y ?? 0);
        const worldPts = o.polygon.map((p) => ({ x: ox + p.x, y: oy + p.y }));
        addStaticPoly(this, worldPts, o.name || `id:${o.id}`);
        continue;
      }

      if (typeof o.width === "number" && typeof o.height === "number") {
        const rx = collOffX + (o.x ?? 0);
        const ry = collOffY + (o.y ?? 0);
        this.matter.add.rectangle(
          rx + o.width / 2,
          ry + o.height / 2,
          o.width,
          o.height,
          { isStatic: true }
        );
      }
    }

    const overrideX =
      data && typeof data.spawnX === "number" ? data.spawnX : null;
    const overrideY =
      data && typeof data.spawnY === "number" ? data.spawnY : null;

    const rawStartX =
      overrideX ??
      (USE_SAVED_POSITION && typeof profile.x === "number"
        ? profile.x
        : tiledSpawn?.x ?? DEFAULT_MAIN_SPAWN_X);

    const rawStartY =
      overrideY ??
      (USE_SAVED_POSITION && typeof profile.y === "number"
        ? profile.y
        : tiledSpawn?.y ?? DEFAULT_MAIN_SPAWN_Y);

    const safeSpawn = findNearbyFreePoint(
      rawStartX,
      rawStartY,
      collObjects,
      collOffX,
      collOffY
    );

    const startX = safeSpawn.x;
    const startY = safeSpawn.y;

    this.player = this.matter.add.sprite(
      startX,
      startY,
      getCritterIdleTexture(profile.selectedCritterId)
    );
    this.player.setCircle(18, { label: "player" });
    this.player.setFixedRotation();
    this.player.setFrictionAir(0.15);
    this.player.setDepth(100);
    this.player.setFlipX(false);

    if (this.textures.exists("evoFg")) {
      this.foreground = this.add
        .image(0, 0, "evoFg")
        .setOrigin(0, 0)
        .setDepth(1000);
    }

    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.cameras.main.setZoom(CAMERA_ZOOM_MAIN);
    this.cameras.main.setRoundPixels(false);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");

    this.invRoot = gamePanelApi.ensureGamePanelDom({
      onSelectCritter: (id) => {
        if (!profile.ownedCritterIds.includes(id)) return;

        profile.selectedCritterId = id;
        this.player.setTexture(getCritterIdleTexture(id));
        this.invRoot.__inv.setSelectedCritter(id);

        apiSave({
          xp: profile.xp,
          level: profile.level,
          selectedCritterId: profile.selectedCritterId,
          x: this.player.x,
          y: this.player.y,
          equippedAccessories: profile.equippedAccessories,
        });

        this.invRoot.__inv.setProfile(profile);
      },

      onEquipAccessory: (slot, accessoryIdOrNull) => {
        profile.equippedAccessories =
          profile.equippedAccessories ?? {
            head: null,
            body: null,
            aura: null,
          };

        profile.equippedAccessories[slot] = accessoryIdOrNull;

        apiSave({
          xp: profile.xp,
          level: profile.level,
          selectedCritterId: profile.selectedCritterId,
          x: this.player.x,
          y: this.player.y,
          equippedAccessories: profile.equippedAccessories,
        });

        this.invRoot.__inv.setProfile(profile);
      },

      onRefreshOwnership: async () => {
        try {
          await apiOwnershipRefresh();
          profile = normalizeProfile(await apiGetMe());
          this.player.setTexture(
            getCritterIdleTexture(profile.selectedCritterId)
          );
          this.invRoot.__inv.setScene(this);
          this.invRoot.__inv.setProfile(profile);
          updateHud();
        } catch (err) {
          console.error("ownership refresh failed:", err);
        }
      },
    });

    this.invRoot.__inv.setScene(this);
    this.invRoot.__inv.setProfile(profile);

    this.topButtons = topButtonsApi.attachTopButtons(this, {
      onInventory: (scene) => {
        scene.invRoot?.__inv?.setScene?.(scene);
        scene.invRoot?.__inv?.setTab?.("critter");
        scene.invRoot?.__inv?.open?.();
      },
      onSettings: (scene) => {
        scene.invRoot?.__inv?.setScene?.(scene);
        scene.invRoot?.__inv?.setTab?.("settings");
        scene.invRoot?.__inv?.open?.();
      },
    });

    profile.x = startX;
    profile.y = startY;

    apiSave({
      xp: profile.xp,
      level: profile.level,
      selectedCritterId: profile.selectedCritterId,
      x: profile.x,
      y: profile.y,
      equippedAccessories: profile.equippedAccessories,
    });

    if (DEBUG_DRAW_TILED_COLLISION) {
      debugDrawTiledObjects(
        this,
        collObjects,
        collOffX,
        collOffY,
        0xff00ff,
        0.9,
        100000
      );
    }

    if (DEBUG_DRAW_TILED_TRIGGERS) {
      debugDrawTiledObjects(
        this,
        this.triggers,
        this.triggersOffset.x,
        this.triggersOffset.y,
        0x00ffff,
        0.9,
        100001
      );
    }

    updateHud();

    this.scale.on("resize", this.onResize, this);
    this.events.once("shutdown", () => {
      this.scale.off("resize", this.onResize, this);
      saveCurrentPlayerState(this);
      this.invRoot?.__inv?.close?.();
    });
  }

  onResize() {}

  update(time) {
    if (!this.player || !this.cursors || !this.wasd) return;

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;

    const analog = getAnalogMoveVector();
    vx += analog.x;
    vy += analog.y;

    const nlen = Math.hypot(vx, vy);
    if (nlen > 1) {
      vx /= nlen;
      vy /= nlen;
    }

    const speed = 3.2;
    this.player.setVelocity(vx * speed, vy * speed);

    updatePlayerFacing(this.player, vx);

    const moving = Math.abs(vx) > 0.001 || Math.abs(vy) > 0.001;
    updateCritterMotionTexture(this, moving, time);

    if (time > this.triggerCooldownUntil && this.triggers.length) {
      for (const tr of this.triggers) {
        if (!tr) continue;

        const hit = pointInTiledObject(
          this.player.x,
          this.player.y,
          tr,
          this.triggersOffset.x,
          this.triggersOffset.y
        );
        if (!hit) continue;

        const props = getObjProps(tr);
        const type = String(tr.type || props.type || "").toLowerCase();

        if (type === "dungeon" || props.targetMap) {
          if (this.isTransitioning) return;
          this.isTransitioning = true;

          const targetMap = String(props.targetMap || "dungeon1");
          const spawnX =
            props.spawnX != null ? Number(props.spawnX) : undefined;
          const spawnY =
            props.spawnY != null ? Number(props.spawnY) : undefined;

          this.triggerCooldownUntil = time + 1200;
          this.player.setVelocity(0, 0);

          profile.x = this.player.x;
          profile.y = this.player.y;

          apiSave({
            xp: profile.xp,
            level: profile.level,
            selectedCritterId: profile.selectedCritterId,
            x: profile.x,
            y: profile.y,
            equippedAccessories: profile.equippedAccessories,
          });

          this.cameras.main.fadeOut(400, 0, 0, 0);

          this.time.delayedCall(420, () => {
            this.scene.start("dungeon", {
              mapKey: targetMap,
              bgKey: `${targetMap}_bg`,
              spawnX,
              spawnY,
            });
          });

          return;
        }
      }
    }

    if (time > this.nextSaveAt) {
      this.nextSaveAt = time + 3000;
      profile.x = this.player.x;
      profile.y = this.player.y;

      apiSave({
        xp: profile.xp,
        level: profile.level,
        selectedCritterId: profile.selectedCritterId,
        x: profile.x,
        y: profile.y,
        equippedAccessories: profile.equippedAccessories,
      });
    }
  }
}

// ----------------------
// Dungeon Scene
// ----------------------
class DungeonScene extends Phaser.Scene {
  constructor() {
    super("dungeon");
    this.player = null;
    this.cursors = null;
    this.wasd = null;

    this.worldWidth = WORLD_WIDTH;
    this.worldHeight = WORLD_HEIGHT;

    this.triggers = [];
    this.triggersOffset = { x: 0, y: 0 };
    this.triggerCooldownUntil = 0;

    this._dbgGfx = null;
    this.nextSaveAt = 0;
    this.isTransitioning = false;
    this.invRoot = null;
    this.topButtons = null;
  }

  create(data) {
    console.log("DUNGEON CREATE START", data);

    this.isTransitioning = false;
    this.triggerCooldownUntil = 0;

    this.cameras.main.roundPixels = false;
    this.cameras.main.setBackgroundColor("#111122");
    this.cameras.main.fadeIn(500, 0, 0, 0);

    attachAudioUnlock(this, () => ensureDungeonMusic(this));
    bindSceneTouchMovement(this);

    const mapKey = data?.mapKey || "dungeon1";
    const bgKey = data?.bgKey || "dungeon1_bg";

    const mapData = getMapData(this, mapKey);
    if (!mapData) console.error("No map data found in cache for", mapKey);

    const tiledSpawn = mapData ? findSpawn(mapData, "entry") : null;

    this.add.image(0, 0, bgKey).setOrigin(0, 0).setDepth(-100);

    this.matter.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    const collFound = findObjectLayer(mapData, "collision");
    const collObjects = Array.isArray(collFound?.layer?.objects)
      ? collFound.layer.objects
      : [];
    const collOffX = collFound?.offsetX ?? 0;
    const collOffY = collFound?.offsetY ?? 0;

    const trigFound = findObjectLayer(mapData, "triggers");
    this.triggers = Array.isArray(trigFound?.layer?.objects)
      ? trigFound.layer.objects
      : [];
    this.triggersOffset = {
      x: trigFound?.offsetX ?? 0,
      y: trigFound?.offsetY ?? 0,
    };

    for (const o of collObjects) {
      if (Array.isArray(o.polygon) && o.polygon.length >= 3) {
        const ox = collOffX + (o.x ?? 0);
        const oy = collOffY + (o.y ?? 0);
        const worldPts = o.polygon.map((p) => ({ x: ox + p.x, y: oy + p.y }));
        addStaticPoly(this, worldPts, o.name || `id:${o.id}`);
        continue;
      }

      if (typeof o.width === "number" && typeof o.height === "number") {
        const rx = collOffX + (o.x ?? 0);
        const ry = collOffY + (o.y ?? 0);
        this.matter.add.rectangle(
          rx + o.width / 2,
          ry + o.height / 2,
          o.width,
          o.height,
          { isStatic: true }
        );
      }
    }

    const rawSpawnX = Number(data?.spawnX ?? tiledSpawn?.x ?? 2000);
    const rawSpawnY = Number(data?.spawnY ?? tiledSpawn?.y ?? 512);
    const safeSpawn = findNearbyFreePoint(
      rawSpawnX,
      rawSpawnY,
      collObjects,
      collOffX,
      collOffY
    );

    if (DEBUG_DRAW_TILED_COLLISION) {
      this._dbgGfx?.destroy();
      this._dbgGfx = debugDrawTiledObjects(
        this,
        collObjects,
        collOffX,
        collOffY,
        0xff00ff,
        0.9,
        100000
      );
    }

    if (DEBUG_DRAW_TILED_TRIGGERS) {
      debugDrawTiledObjects(
        this,
        this.triggers,
        this.triggersOffset.x,
        this.triggersOffset.y,
        0x00ffff,
        0.9,
        100001
      );
    }

    this.player = this.matter.add.sprite(
      safeSpawn.x,
      safeSpawn.y,
      getCritterIdleTexture(profile.selectedCritterId)
    );
    this.player.setCircle(18, { label: "player" });
    this.player.setFixedRotation();
    this.player.setFrictionAir(0.15);
    this.player.setDepth(100);
    this.player.setFlipX(false);

    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.cameras.main.setZoom(CAMERA_ZOOM_DUNGEON);
    this.cameras.main.setRoundPixels(false);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");

    this.invRoot = gamePanelApi.ensureGamePanelDom({
      onSelectCritter: (id) => {
        if (!profile.ownedCritterIds.includes(id)) return;

        profile.selectedCritterId = id;
        this.player.setTexture(getCritterIdleTexture(id));
        this.invRoot.__inv.setSelectedCritter(id);

        apiSave({
          xp: profile.xp,
          level: profile.level,
          selectedCritterId: profile.selectedCritterId,
          x: this.player.x,
          y: this.player.y,
          equippedAccessories: profile.equippedAccessories,
        });

        this.invRoot.__inv.setProfile(profile);
      },

      onEquipAccessory: (slot, accessoryIdOrNull) => {
        profile.equippedAccessories =
          profile.equippedAccessories ?? {
            head: null,
            body: null,
            aura: null,
          };

        profile.equippedAccessories[slot] = accessoryIdOrNull;

        apiSave({
          xp: profile.xp,
          level: profile.level,
          selectedCritterId: profile.selectedCritterId,
          x: this.player.x,
          y: this.player.y,
          equippedAccessories: profile.equippedAccessories,
        });

        this.invRoot.__inv.setProfile(profile);
      },

      onRefreshOwnership: async () => {
        try {
          await apiOwnershipRefresh();
          profile = normalizeProfile(await apiGetMe());
          this.player.setTexture(
            getCritterIdleTexture(profile.selectedCritterId)
          );
          this.invRoot.__inv.setScene(this);
          this.invRoot.__inv.setProfile(profile);
          updateHud("Dungeon");
        } catch (err) {
          console.error("ownership refresh failed:", err);
        }
      },
    });

    this.invRoot.__inv.setScene(this);
    this.invRoot.__inv.setProfile(profile);

    this.topButtons = topButtonsApi.attachTopButtons(this, {
      onInventory: (scene) => {
        scene.invRoot?.__inv?.setScene?.(scene);
        scene.invRoot?.__inv?.setTab?.("critter");
        scene.invRoot?.__inv?.open?.();
      },
      onSettings: (scene) => {
        scene.invRoot?.__inv?.setScene?.(scene);
        scene.invRoot?.__inv?.setTab?.("settings");
        scene.invRoot?.__inv?.open?.();
      },
    });

    updateHud("Dungeon");

    this.scale.on("resize", this.onResize, this);
    this.events.once("shutdown", () => {
      this.scale.off("resize", this.onResize, this);
      saveCurrentPlayerState(this);
      this.invRoot?.__inv?.close?.();
    });
  }

  onResize() {}

  update(time) {
    if (!this.player || !this.cursors || !this.wasd) return;

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;

    const analog = getAnalogMoveVector();
    vx += analog.x;
    vy += analog.y;

    const len = Math.hypot(vx, vy);
    if (len > 1) {
      vx /= len;
      vy /= len;
    }

    const speed = 3.2;
    this.player.setVelocity(vx * speed, vy * speed);

    updatePlayerFacing(this.player, vx);

    const moving = Math.abs(vx) > 0.001 || Math.abs(vy) > 0.001;
    updateCritterMotionTexture(this, moving, time);

    if (time > this.triggerCooldownUntil && this.triggers.length) {
      for (const tr of this.triggers) {
        const hit = pointInTiledObject(
          this.player.x,
          this.player.y,
          tr,
          this.triggersOffset.x,
          this.triggersOffset.y
        );
        if (!hit) continue;

        const props = getObjProps(tr);

        if (props.targetMap) {
          if (this.isTransitioning) return;
          this.isTransitioning = true;

          const targetMap = String(props.targetMap);
          const spawnX = Number(props.spawnX ?? DEFAULT_MAIN_SPAWN_X);
          const spawnY = Number(props.spawnY ?? DEFAULT_MAIN_SPAWN_Y);

          this.triggerCooldownUntil = time + 1200;
          this.player.setVelocity(0, 0);

          profile.x = spawnX;
          profile.y = spawnY;

          apiSave({
            xp: profile.xp,
            level: profile.level,
            selectedCritterId: profile.selectedCritterId,
            x: profile.x,
            y: profile.y,
            equippedAccessories: profile.equippedAccessories,
          });

          this.cameras.main.fadeOut(400, 0, 0, 0);

          this.time.delayedCall(420, () => {
            if (
              targetMap === "evolucia" ||
              targetMap === "evoMap" ||
              targetMap === "overworld"
            ) {
              this.scene.start("main", { spawnX, spawnY });
              return;
            }

            this.scene.start("dungeon", {
              mapKey: targetMap,
              bgKey: `${targetMap}_bg`,
              spawnX,
              spawnY,
            });
          });

          return;
        }
      }
    }

    if (time > this.nextSaveAt) {
      this.nextSaveAt = time + 3000;
      profile.x = this.player.x;
      profile.y = this.player.y;

      apiSave({
        xp: profile.xp,
        level: profile.level,
        selectedCritterId: profile.selectedCritterId,
        x: profile.x,
        y: profile.y,
        equippedAccessories: profile.equippedAccessories,
      });
    }
  }
}

// ----------------------
// Game config
// ----------------------
const config = {
  type: GAME_RENDERER_TYPE,
  parent: "app",
  ...getViewportSize(),
  backgroundColor: "#0b0b0f",

  resolution: 1,

  render: {
    antialias: !IS_TOUCH_DEVICE,
    pixelArt: false,
    roundPixels: false,
    powerPreference: "high-performance",
  },

  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  fps: {
    target: 60,
    min: 30,
    forceSetTimeOut: true,
  },

  physics: {
    default: "matter",
    matter: {
      debug: false,
      gravity: { y: 0 },
    },
  },

  input: {
    activePointers: IS_TOUCH_DEVICE ? 3 : 2,
  },

  scene: [MenuScene, MainScene, DungeonScene],
};

// ----------------------
// Bootstrap
// ----------------------
async function bootstrap() {
  profile = normalizeProfile(await apiGetMe());
  updateHud();

  window.addEventListener("error", (e) => {
    console.error("WINDOW ERROR:", e.message, e.error);
  });

  window.addEventListener("unhandledrejection", (e) => {
    console.error("PROMISE ERROR:", e.reason);
  });

  const game = new Phaser.Game(config);

  if (game.renderer?.config) {
    game.renderer.config.antialias = !IS_TOUCH_DEVICE;
    game.renderer.config.antialiasGL = !IS_TOUCH_DEVICE;
  }

  const applyViewportResize = () => {
    const { width, height } = getViewportSize();
    game.scale.resize(width, height);
  };

  window.addEventListener("resize", applyViewportResize);
  window.visualViewport?.addEventListener("resize", applyViewportResize);

  window.screen?.orientation?.addEventListener?.("change", () => {
    setTimeout(applyViewportResize, 150);
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(applyViewportResize, 150);
  });
}

bootstrap().catch((err) => {
  console.error("BOOTSTRAP FAILED:", err);
  document.body.style.background = "#220000";
  document.body.style.color = "#ffffff";
  document.body.innerHTML = `
    <div style="padding:16px;font-family:system-ui;">
      Spielstart fehlgeschlagen.<br />
      Schau in ngrok / Server / Browser-Konsole.
    </div>
  `;
});