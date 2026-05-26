const STORE_KEY = 'tasck_v3_demo_approved_creators';

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const readStore = () => {
  if (!canUseStorage()) return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
};

const writeStore = (store) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
};

export const listStoredDemoCreators = () => Object.values(readStore()).filter(Boolean);

export const getStoredDemoCreator = (id) => {
  if (!id) return null;
  return readStore()[id] || null;
};

export const saveStoredDemoCreator = (creator) => {
  if (!creator?.id) return;
  const store = readStore();
  store[creator.id] = {
    ...creator,
    source: creator.source || 'web_discovery_approved',
    pipeline_status: creator.pipeline_status || 'approved',
    demo_saved_at: new Date().toISOString(),
  };
  writeStore(store);
};
