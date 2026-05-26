const STORE_KEY = 'tasck_v3_demo_business_case_bundles';

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

export const getStoredDemoBundle = (id) => {
  if (!id) return null;
  return readStore()[id] || null;
};

export const listStoredDemoBundles = () => Object.values(readStore()).filter(Boolean);

export const saveStoredDemoBundle = (bundle) => {
  const id = bundle?.business_case?.id;
  if (!id) return;
  const store = readStore();
  store[id] = {
    ...bundle,
    source: 'demo',
    demo_saved_at: new Date().toISOString(),
  };
  writeStore(store);
};

export const clearStoredDemoBundles = () => writeStore({});

export const applyStoredDemoRows = (rows) => {
  const store = readStore();
  return rows.map((row) => {
    const stored = store[row.id]?.business_case;
    return stored ? { ...row, ...stored } : row;
  });
};
