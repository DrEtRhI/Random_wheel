export function createExclusionStore() {
  const excluded = new Set();

  function getExclusions() {
    return new Set(excluded);
  }

  function excludeName(id) {
    excluded.add(id);
  }

  function clearExclusions() {
    excluded.clear();
  }

  function isExcluded(id) {
    return excluded.has(id);
  }

  return { getExclusions, excludeName, clearExclusions, isExcluded };
}
