export function createTopButtons() {
  let uiBlockTouchUntil = 0;
  let activeScene = null;

  function ensureTopButtonsDom() {
    let root = document.getElementById("sceneTopButtons");
    if (root && root.__topButtons) return root;

    const oldStyle = document.getElementById("sceneTopButtonsStyle");
    if (oldStyle) oldStyle.remove();

    if (!root) {
      root = document.createElement("div");
      root.id = "sceneTopButtons";
      root.innerHTML = `
        <button id="sceneInventoryBtn" class="scene-top-btn" title="Inventar" type="button">🎒</button>
        <button id="sceneSettingsBtn" class="scene-top-btn" title="Settings" type="button">⚙</button>
      `;
      document.body.appendChild(root);
    }

    const style = document.createElement("style");
    style.id = "sceneTopButtonsStyle";
    style.textContent = `
      #sceneTopButtons {
        position: fixed !important;
        top: max(12px, env(safe-area-inset-top, 0px)) !important;
        right: max(12px, env(safe-area-inset-right, 0px)) !important;
        left: auto !important;
        bottom: auto !important;
        transform: none !important;
        z-index: 125000 !important;
        display: flex;
        flex-direction: row;
        gap: 10px;
        pointer-events: auto !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .scene-top-btn {
        width: 52px;
        height: 52px;
        border-radius: 999px;
        border: 1px solid rgba(170,216,255,0.35);
        background: rgba(21,25,36,0.96);
        color: #ffffff;
        font-size: 24px;
        line-height: 1;
        display: grid;
        place-items: center;
        cursor: pointer;
        box-shadow:
          0 10px 24px rgba(0,0,0,0.32),
          inset 0 1px 0 rgba(255,255,255,0.04);
        backdrop-filter: blur(8px);
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        user-select: none;
        position: relative;
        pointer-events: auto !important;
      }

      .scene-top-btn:hover {
        background: rgba(32,40,58,0.98);
        border-color: rgba(198,236,255,0.72);
        transform: translateY(-1px);
      }

      .scene-top-btn:active {
        transform: scale(0.96);
      }

      @media (max-width: 700px) {
        #sceneTopButtons {
          top: max(10px, env(safe-area-inset-top, 0px)) !important;
          right: max(10px, env(safe-area-inset-right, 0px)) !important;
          gap: 8px;
        }

        .scene-top-btn {
          width: 48px;
          height: 48px;
          font-size: 22px;
        }
      }
    `;
    document.head.appendChild(style);

    const invBtn = root.querySelector("#sceneInventoryBtn");
    const settingsBtn = root.querySelector("#sceneSettingsBtn");

    const blockTouch = (e) => {
      e.stopPropagation();
      uiBlockTouchUntil = performance.now() + 250;
    };

    invBtn.addEventListener("pointerdown", blockTouch);
    settingsBtn.addEventListener("pointerdown", blockTouch);

    root.__topButtons = {
      bindHandlers({ onInventory, onSettings }) {
        invBtn.onclick = (e) => {
          e.stopPropagation();
          uiBlockTouchUntil = performance.now() + 250;
          if (!activeScene) return;
          onInventory?.(activeScene);
        };

        settingsBtn.onclick = (e) => {
          e.stopPropagation();
          uiBlockTouchUntil = performance.now() + 250;
          if (!activeScene) return;
          onSettings?.(activeScene);
        };
      },

      setScene(scene) {
        activeScene = scene;

        root.style.display = "flex";
        root.style.position = "fixed";
        root.style.top = "max(12px, env(safe-area-inset-top, 0px))";
        root.style.right = "max(12px, env(safe-area-inset-right, 0px))";
        root.style.left = "auto";
        root.style.bottom = "auto";
        root.style.transform = "none";
        root.style.zIndex = "125000";
        root.style.pointerEvents = "auto";
      },

      hide() {
        activeScene = null;
        root.style.display = "none";
      },

      getUiBlockUntil() {
        return uiBlockTouchUntil;
      },
    };

    root.style.display = "none";
    return root;
  }

  function attachTopButtons(scene, { onInventory, onSettings }) {
    const root = ensureTopButtonsDom();

    root.__topButtons.bindHandlers({ onInventory, onSettings });
    root.__topButtons.setScene(scene);

    scene.events.once("shutdown", () => {
      root.__topButtons?.hide?.();
    });

    return {
      getUiBlockUntil: () => root.__topButtons.getUiBlockUntil(),
      hide: () => root.__topButtons.hide(),
    };
  }

  return {
    ensureTopButtonsDom,
    attachTopButtons,
    getUiBlockUntil: () => uiBlockTouchUntil,
  };
}