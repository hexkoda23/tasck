// v3demoStore.js — DEPRECATED
// This module previously stored "demo" business case bundles in localStorage.
// It has been replaced by real API data from the backend.
// All exports are now no-ops to prevent breaking imports during migration.
// Pages that used these should be updated to use v3GetBusinessCase() from v3api.js.

const _warn = (fn) => {
  console.warn(`[v3demoStore] ${fn}() is deprecated and has no effect. Use the real API instead.`);
};

export const getStoredDemoBundle = (_id) => {
  _warn('getStoredDemoBundle');
  return null;
};

export const listStoredDemoBundles = () => {
  _warn('listStoredDemoBundles');
  return [];
};

export const saveStoredDemoBundle = (_bundle) => {
  _warn('saveStoredDemoBundle');
};

export const clearStoredDemoBundles = () => {
  _warn('clearStoredDemoBundles');
  // Also clear any leftover localStorage key from old demo sessions
  try {
    localStorage.removeItem('tasck_v3_demo_business_case_bundles');
  } catch (e) {}
};

export const applyStoredDemoRows = (rows) => {
  _warn('applyStoredDemoRows');
  return rows;
};
