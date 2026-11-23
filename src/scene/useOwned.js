import { useEffect, useMemo } from 'react';

function release(value) {
  if (!value) return;
  if (typeof value.dispose === 'function') value.dispose();
  else if (Array.isArray(value)) value.forEach(release);
  else if (typeof value === 'object') Object.values(value).forEach(release);
}

// useMemo for GPU resources (geometries, materials, textures) that belong to one component.
// React Three Fiber only frees what is declared as JSX; anything built with `new THREE.…` has to
// be released by hand, or every retry of a level leaves its buffers behind on the graphics card.
// `factory` may return a single resource, an array or a plain object of them.
export function useOwned(factory, deps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps);
  useEffect(() => () => release(value), [value]);
  return value;
}
