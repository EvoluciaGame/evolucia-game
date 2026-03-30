export const SETTINGS_STORAGE_KEY = "evolucia_settings";

export const defaultSettings = {
  musicEnabled: true,
  musicVolume: 0.4,
  sfxEnabled: true,
  sfxVolume: 0.7,
};

export function normalizeSettings(input) {
  const parsed = input && typeof input === "object" ? input : {};

  return {
    musicEnabled:
      typeof parsed.musicEnabled === "boolean"
        ? parsed.musicEnabled
        : defaultSettings.musicEnabled,

    musicVolume:
      typeof parsed.musicVolume === "number"
        ? Math.max(0, Math.min(1, parsed.musicVolume))
        : defaultSettings.musicVolume,

    sfxEnabled:
      typeof parsed.sfxEnabled === "boolean"
        ? parsed.sfxEnabled
        : defaultSettings.sfxEnabled,

    sfxVolume:
      typeof parsed.sfxVolume === "number"
        ? Math.max(0, Math.min(1, parsed.sfxVolume))
        : defaultSettings.sfxVolume,
  };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...defaultSettings };

    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed);
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function resetSettings() {
  const normalized = { ...defaultSettings };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}