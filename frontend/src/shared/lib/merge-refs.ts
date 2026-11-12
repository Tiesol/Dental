import type { Ref, RefCallback } from 'react';

// Une varias refs en una: los controles propios necesitan la suya y además exponen la del formulario.
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    }
  };
}
