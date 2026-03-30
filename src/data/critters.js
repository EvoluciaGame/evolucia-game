export const CRITTERS = [
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

export const critterIdleKey = (id) => `critter_${id}_idle`;
export const critterWalkKey = (id) => `critter_${id}_walk`;

export function getCritterAssetBase(folder) {
  return `/assets/critters/${folder}`;
}

export function getCritterIdleTexture(id) {
  return critterIdleKey(id);
}

export function getCritterWalkTexture(id) {
  return critterWalkKey(id);
}