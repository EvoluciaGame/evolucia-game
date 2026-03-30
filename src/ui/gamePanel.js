export function createGamePanel({
  CRITTERS,
  getCritterAssetBase,
  getSettings,
  saveSettings,
  stopAllKnownMusic,
  applyGlobalMusicSettings,
  ensureMenuMusic,
  ensureOverworldMusic,
  ensureDungeonMusic,
  switchSceneToMenu,
}) {
  function ensureGamePanelDom({
    onSelectCritter,
    onEquipAccessory,
    onRefreshOwnership,
  }) {
    let root = document.getElementById("invRoot");

    if (root && root.__inv) {
      root.__inv.setHandlers({
        onSelectCritter,
        onEquipAccessory,
        onRefreshOwnership,
      });
      return root;
    }

    root = document.createElement("div");
    root.id = "invRoot";

    root.innerHTML = `
      <div id="invBackdrop" class="inv-hidden"></div>

      <div id="invWindow" class="inv-hidden">
        <div id="invWindowHeader">
          <div>
            <div id="invWindowTitle">Inventar</div>
            <div id="invWindowSub">Critter, Accessoires und Einstellungen</div>
          </div>
          <button id="invCloseBtn" title="Schließen">✕</button>
        </div>

        <div id="invTabs">
          <button id="tabCritter" class="tab active">Critter</button>
          <button id="tabAcc" class="tab">Accessoires</button>
          <button id="tabSettings" class="tab">Settings</button>
        </div>

        <div id="invToolbar">
          <button id="invSyncBtn" title="NFT Sync">NFT Sync</button>
        </div>

        <div id="invContent"></div>
      </div>
    `;

    document.body.appendChild(root);

    const oldStyle = document.getElementById("invRootStyle");
    if (oldStyle) oldStyle.remove();

    const style = document.createElement("style");
    style.id = "invRootStyle";
    style.textContent = `
      #invRoot {
        position: fixed;
        inset: 0;
        z-index: 120000;
        pointer-events: none;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }

      #invBackdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.58);
        backdrop-filter: blur(6px);
        pointer-events: auto;
      }

      #invWindow {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: min(920px, calc(100vw - 28px));
        height: min(700px, calc(100vh - 28px));
        background:
          linear-gradient(180deg, rgba(22,27,40,0.98), rgba(12,15,24,0.98));
        border: 1px solid rgba(170,216,255,0.22);
        border-radius: 22px;
        box-shadow:
          0 24px 70px rgba(0,0,0,0.48),
          inset 0 1px 0 rgba(255,255,255,0.04);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        pointer-events: auto;
      }

      .inv-hidden {
        display: none !important;
      }

      #invWindowHeader {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 20px 14px 20px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        background:
          linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
      }

      #invWindowTitle {
        color: #ffffff;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: 0.3px;
      }

      #invWindowSub {
        color: rgba(255,255,255,0.68);
        font-size: 13px;
        margin-top: 4px;
      }

      #invCloseBtn {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        color: #fff;
        font-size: 18px;
        cursor: pointer;
      }

      #invCloseBtn:hover {
        background: rgba(255,255,255,0.12);
      }

      #invTabs {
        display: flex;
        gap: 10px;
        padding: 16px 20px 10px 20px;
        flex-wrap: wrap;
      }

      #invTabs .tab {
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.05);
        color: rgba(255,255,255,0.9);
        padding: 12px 18px;
        border-radius: 14px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        min-width: 140px;
      }

      #invTabs .tab.active {
        background:
          linear-gradient(180deg, rgba(127,212,255,0.22), rgba(127,212,255,0.10));
        border-color: rgba(170,216,255,0.35);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
      }

      #invToolbar {
        display: flex;
        justify-content: flex-end;
        padding: 0 20px 12px 20px;
      }

      #invSyncBtn {
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.92);
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }

      #invSyncBtn:disabled {
        opacity: 0.45;
        cursor: default;
      }

      #invContent {
        flex: 1;
        overflow: auto;
        padding: 0 20px 20px 20px;
        -webkit-overflow-scrolling: touch;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 14px;
      }

      .item {
        position: relative;
        border: 1px solid rgba(255,255,255,0.10);
        background:
          linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
        border-radius: 18px;
        padding: 14px 12px;
        color: rgba(255,255,255,0.92);
        text-align: center;
        user-select: none;
        cursor: pointer;
        transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
        min-height: 170px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .item:hover {
        transform: translateY(-2px);
        border-color: rgba(170,216,255,0.28);
        background:
          linear-gradient(180deg, rgba(127,212,255,0.12), rgba(255,255,255,0.04));
      }

      .item.selected {
        border-color: rgba(170,216,255,0.95);
        background:
          linear-gradient(180deg, rgba(127,212,255,0.30), rgba(127,212,255,0.14));
        box-shadow:
          0 0 0 2px rgba(170,216,255,0.35) inset,
          0 0 18px rgba(127,212,255,0.22);
        transform: translateY(-2px);
      }

      .item.locked {
        opacity: 0.42;
        filter: grayscale(0.35);
      }

      .item img {
        width: 72px;
        height: 72px;
        object-fit: contain;
        display: block;
        margin: 0 auto 10px auto;
        image-rendering: auto;
        pointer-events: none;
      }

      .item .label {
        font-size: 14px;
        font-weight: 800;
      }

      .item .id {
        font-size: 12px;
        opacity: 0.72;
        margin-top: 6px;
      }

      .lockBadge {
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 11px;
        font-weight: 800;
        background: rgba(0,0,0,0.45);
        border: 1px solid rgba(255,255,255,0.15);
        padding: 4px 7px;
        border-radius: 999px;
      }

      .hint {
        font-size: 12px;
        opacity: 0.72;
        margin-top: 14px;
        line-height: 1.35;
        color: rgba(255,255,255,0.82);
      }

      .settingsList {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding-top: 4px;
      }

      .settingsRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border: 1px solid rgba(255,255,255,0.10);
        background:
          linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
        border-radius: 18px;
        padding: 18px 16px;
      }

      .settingsLabelWrap {
        min-width: 0;
        flex: 1;
      }

      .settingsLabel {
        color: rgba(255,255,255,0.96);
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0.2px;
      }

      .settingsSubLabel {
        color: rgba(255,255,255,0.66);
        font-size: 13px;
        margin-top: 5px;
        line-height: 1.35;
      }

      .settingsActionBtn,
      .settingsIconBtn,
      .settingsDangerBtn {
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.94);
        border-radius: 14px;
        cursor: pointer;
        font-weight: 800;
      }

      .settingsActionBtn,
      .settingsDangerBtn {
        min-width: 92px;
        padding: 12px 16px;
        font-size: 14px;
      }

      .settingsActionBtn:hover,
      .settingsIconBtn:hover,
      .settingsDangerBtn:hover {
        background: rgba(255,255,255,0.12);
      }

      .settingsDangerBtn {
        background: rgba(170, 40, 40, 0.22);
        border-color: rgba(255, 120, 120, 0.28);
      }

      .settingsDangerBtn:hover {
        background: rgba(170, 40, 40, 0.34);
        border-color: rgba(255, 150, 150, 0.42);
      }

      .settingsDangerBtn:disabled,
      .settingsActionBtn:disabled,
      .settingsIconBtn:disabled {
        opacity: 0.5;
        cursor: default;
      }

      .settingsVolumeWrap {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }

      .settingsIconBtn {
        width: 42px;
        height: 42px;
        font-size: 22px;
        line-height: 1;
      }

      .settingsVolumeValue {
        min-width: 70px;
        text-align: center;
        color: #ffffff;
        font-size: 16px;
        font-weight: 800;
      }

      @media (max-width: 700px) {
        #invWindow {
          width: calc(100vw - 16px);
          height: calc(100vh - 16px);
          border-radius: 18px;
        }

        #invWindowTitle {
          font-size: 20px;
        }

        #invTabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        #invTabs .tab {
          min-width: 0;
          width: 100%;
          padding: 12px 10px;
        }

        .grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .item {
          min-height: 150px;
          padding: 12px 10px;
        }

        .item img {
          width: 60px;
          height: 60px;
        }

        .settingsRow {
          align-items: stretch;
          flex-direction: column;
        }

        .settingsActionBtn,
        .settingsDangerBtn {
          width: 100%;
        }

        .settingsVolumeWrap {
          width: 100%;
          justify-content: space-between;
        }

        .settingsIconBtn {
          width: 48px;
          height: 48px;
        }

        .settingsVolumeValue {
          flex: 1;
        }
      }
    `;
    document.head.appendChild(style);

    const backdrop = root.querySelector("#invBackdrop");
    const win = root.querySelector("#invWindow");
    const closeBtn = root.querySelector("#invCloseBtn");
    const tabCritter = root.querySelector("#tabCritter");
    const tabAcc = root.querySelector("#tabAcc");
    const tabSettings = root.querySelector("#tabSettings");
    const content = root.querySelector("#invContent");
    const syncBtn = root.querySelector("#invSyncBtn");

    let handlers = {
      onSelectCritter,
      onEquipAccessory,
      onRefreshOwnership,
    };

    let activeTab = "critter";
    let currentProfile = null;
    let currentSelectedCritterId = null;
    let open = false;
    let currentScene = null;

    function setOpen(v) {
      open = !!v;
      backdrop.classList.toggle("inv-hidden", !open);
      win.classList.toggle("inv-hidden", !open);
      document.body.style.overflow = open ? "hidden" : "";
    }

    function setTabState(tab) {
      activeTab = tab;

      tabCritter.classList.toggle("active", tab === "critter");
      tabAcc.classList.toggle("active", tab === "acc");
      tabSettings.classList.toggle("active", tab === "settings");

      syncBtn.style.display = tab === "critter" ? "inline-flex" : "none";
    }

    function renderCritterTab() {
      const selected =
        currentSelectedCritterId ?? currentProfile?.selectedCritterId ?? "c1";

      const ownedSet = new Set(currentProfile?.ownedCritterIds ?? []);

      content.innerHTML = `
        <div class="grid">
          ${CRITTERS.map((c) => {
            const isOwned = ownedSet.has(c.id);
            const imgSrc = `${getCritterAssetBase(c.folder)}/spritesheet.png`;

            return `
              <div
                class="item ${c.id === selected ? "selected" : ""} ${!isOwned ? "locked" : ""}"
                data-id="${c.id}"
              >
                ${!isOwned ? `<div class="lockBadge">NFT</div>` : ""}
                <img src="${imgSrc}" alt="${c.name}" />
                <div class="label">${c.name}</div>
                <div class="id">#${c.nftNumber}</div>
              </div>
            `;
          }).join("")}
        </div>

        <div class="hint">
          Sichtbar sind alle Critter. Spielbar sind nur Critter aus <code>ownedCritterIds</code>.
        </div>
      `;

      content.querySelectorAll(".item").forEach((el) => {
        el.addEventListener("click", () => {
          const id = el.getAttribute("data-id");
          handlers.onSelectCritter?.(id);
        });
      });
    }

    function renderAccessoryTab() {
      const eq = currentProfile?.equippedAccessories ?? {
        head: null,
        body: null,
        aura: null,
      };

      content.innerHTML = `
        <div class="grid">
          ${["head", "body", "aura"]
            .map((slot) => {
              const val = eq[slot] ?? null;

              return `
                <div class="item ${val ? "selected" : ""}" data-slot="${slot}">
                  <div class="label">${slot.toUpperCase()}</div>
                  <div class="id">${val ?? "leer"}</div>
                </div>
              `;
            })
            .join("")}
        </div>

        <div class="hint">
          Accessoires sind aktuell noch Platzhalter.
        </div>
      `;

      content.querySelectorAll(".item").forEach((el) => {
        el.addEventListener("click", () => {
          const slot = el.getAttribute("data-slot");
          const cur = eq[slot] ?? null;
          const next = cur ? null : `a_${slot}_01`;
          handlers.onEquipAccessory?.(slot, next);
        });
      });
    }

    function renderSettingsTab() {
      const s = getSettings();
      const isMenu = currentScene?.scene?.key === "menu";

      content.innerHTML = `
        <div class="settingsList">
          <div class="settingsRow">
            <div class="settingsLabelWrap">
              <div class="settingsLabel">Musik</div>
              <div class="settingsSubLabel">Hintergrundmusik an oder aus</div>
            </div>
            <button id="invSettingsMusicToggle" class="settingsActionBtn">
              ${s.musicEnabled ? "AN" : "AUS"}
            </button>
          </div>

          <div class="settingsRow">
            <div class="settingsLabelWrap">
              <div class="settingsLabel">Lautstärke</div>
              <div class="settingsSubLabel">Globale Musiklautstärke</div>
            </div>
            <div class="settingsVolumeWrap">
              <button id="invSettingsMinus" class="settingsIconBtn">−</button>
              <div id="invSettingsVolumeValue" class="settingsVolumeValue">
                ${Math.round(s.musicVolume * 100)}%
              </div>
              <button id="invSettingsPlus" class="settingsIconBtn">+</button>
            </div>
          </div>

          <div class="settingsRow">
            <div class="settingsLabelWrap">
              <div class="settingsLabel">Navigation</div>
              <div class="settingsSubLabel">Zurück ins Hauptmenü wechseln</div>
            </div>
            <button
              id="invBackToMenuBtn"
              class="settingsDangerBtn"
              ${isMenu ? "disabled" : ""}
            >
              ${isMenu ? "Bereits im Menü" : "Back to Menu"}
            </button>
          </div>
        </div>
      `;

      const musicToggle = content.querySelector("#invSettingsMusicToggle");
      const minusBtn = content.querySelector("#invSettingsMinus");
      const plusBtn = content.querySelector("#invSettingsPlus");
      const backBtn = content.querySelector("#invBackToMenuBtn");

      musicToggle?.addEventListener("click", () => {
        const settings = getSettings();
        settings.musicEnabled = !settings.musicEnabled;
        saveSettings(settings);

        if (!currentScene) {
          renderSettingsTab();
          return;
        }

        if (!settings.musicEnabled) {
          stopAllKnownMusic(currentScene);
        } else {
          applyGlobalMusicSettings(currentScene.game);

          const sceneKey = currentScene.scene.key;
          if (sceneKey === "menu") ensureMenuMusic(currentScene);
          if (sceneKey === "main") ensureOverworldMusic(currentScene);
          if (sceneKey === "dungeon") ensureDungeonMusic(currentScene);
        }

        renderSettingsTab();
      });

      minusBtn?.addEventListener("click", () => {
        const settings = getSettings();
        settings.musicVolume = Math.max(
          0,
          Math.round((settings.musicVolume - 0.1) * 10) / 10
        );
        saveSettings(settings);

        if (currentScene?.game) {
          applyGlobalMusicSettings(currentScene.game);
        }

        renderSettingsTab();
      });

      plusBtn?.addEventListener("click", () => {
        const settings = getSettings();
        settings.musicVolume = Math.min(
          1,
          Math.round((settings.musicVolume + 0.1) * 10) / 10
        );
        saveSettings(settings);

        if (currentScene?.game) {
          applyGlobalMusicSettings(currentScene.game);
        }

        renderSettingsTab();
      });

      backBtn?.addEventListener("click", () => {
        if (!currentScene) return;
        if (currentScene.scene.key === "menu") return;

        setOpen(false);
        switchSceneToMenu(currentScene);
      });
    }

    function render() {
      if (!currentProfile && activeTab !== "settings") return;

      if (activeTab === "critter") {
        renderCritterTab();
        return;
      }

      if (activeTab === "acc") {
        renderAccessoryTab();
        return;
      }

      renderSettingsTab();
    }

    backdrop.addEventListener("click", () => setOpen(false));
    closeBtn.addEventListener("click", () => setOpen(false));

    tabCritter.addEventListener("click", () => {
      setTabState("critter");
      render();
    });

    tabAcc.addEventListener("click", () => {
      setTabState("acc");
      render();
    });

    tabSettings.addEventListener("click", () => {
      setTabState("settings");
      render();
    });

    syncBtn.addEventListener("click", async () => {
      if (!currentProfile?.wallet) return;

      syncBtn.disabled = true;
      syncBtn.textContent = "Sync läuft...";

      try {
        await handlers.onRefreshOwnership?.();
      } finally {
        syncBtn.disabled = false;
        syncBtn.textContent = "NFT Sync";
      }
    });

    root.__inv = {
      setHandlers(nextHandlers) {
        handlers = {
          ...handlers,
          ...nextHandlers,
        };
      },

      setScene(scene) {
        currentScene = scene;
      },

      setProfile(profile) {
        currentProfile = {
          ...profile,
          equippedAccessories: {
            head: profile?.equippedAccessories?.head ?? null,
            body: profile?.equippedAccessories?.body ?? null,
            aura: profile?.equippedAccessories?.aura ?? null,
          },
          ownedCritterIds: Array.isArray(profile?.ownedCritterIds)
            ? [...profile.ownedCritterIds]
            : [],
          ownedAccessoryIds: Array.isArray(profile?.ownedAccessoryIds)
            ? [...profile.ownedAccessoryIds]
            : [],
        };

        currentSelectedCritterId = currentProfile.selectedCritterId ?? "c1";
        render();
      },

      setSelectedCritter(id) {
        currentSelectedCritterId = id;

        if (currentProfile) {
          currentProfile.selectedCritterId = id;
        }

        render();
      },

      open() {
        setOpen(true);
      },

      close() {
        setOpen(false);
      },

      toggle() {
        setOpen(!open);
      },

      setTab(tab) {
        setTabState(tab);
        render();
      },

      isOpen() {
        return open;
      },
    };

    setOpen(false);
    setTabState("critter");
    return root;
  }

  return {
    ensureGamePanelDom,
  };
}