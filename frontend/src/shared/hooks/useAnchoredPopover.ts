import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const MARGEN = 8;
const SEPARACION = 4;
const ALTO_MINIMO = 160;

type Options = { matchWidth?: boolean };

// Lista o panel anclado a un control (desplegables, calendario, horas). Se pinta en un portal para que
// ningún contenedor con scroll lo recorte, se abre hacia arriba si abajo no entra y se cierra al hacer
// clic afuera. La posición se escribe como variables CSS en el nodo, sin estado por cada scroll.
export function useAnchoredPopover<A extends HTMLElement, P extends HTMLElement>({
  matchWidth = false,
}: Options = {}) {
  const anchorRef = useRef<A>(null);
  const popoverRef = useRef<P>(null);
  const [open, setOpen] = useState(false);
  const [container, setContainer] = useState<Element | null>(null);

  // Dentro de un <dialog> modal el portal va al propio diálogo: fuera de él quedaría debajo.
  const show = useCallback(() => {
    setContainer(anchorRef.current?.closest('dialog') ?? document.body);
    setOpen(true);
  }, []);
  const hide = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open) return;

    const ubicar = () => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;
      const rect = anchor.getBoundingClientRect();
      const abajo = window.innerHeight - rect.bottom - MARGEN;
      const arriba = rect.top - MARGEN;
      const haciaArriba = popover.scrollHeight > abajo && arriba > abajo;
      const ancho = matchWidth ? rect.width : popover.offsetWidth;
      const x = Math.max(MARGEN, Math.min(rect.left, window.innerWidth - ancho - MARGEN));
      const y = haciaArriba ? rect.top - SEPARACION : rect.bottom + SEPARACION;

      popover.dataset.placement = haciaArriba ? 'top' : 'bottom';
      popover.style.setProperty('--popover-x', `${x}px`);
      popover.style.setProperty('--popover-y', `${y}px`);
      popover.style.setProperty(
        '--popover-max-h',
        `${Math.max(haciaArriba ? arriba : abajo, ALTO_MINIMO) - SEPARACION}px`,
      );
      if (matchWidth) popover.style.setProperty('--popover-w', `${rect.width}px`);
    };

    const alHacerScroll = (e: Event) => {
      if (!popoverRef.current?.contains(e.target as Node)) ubicar();
    };
    const alPresionar = (e: PointerEvent) => {
      const destino = e.target as Node;
      if (anchorRef.current?.contains(destino) || popoverRef.current?.contains(destino)) return;
      setOpen(false);
    };

    ubicar();
    window.addEventListener('resize', ubicar, { passive: true });
    window.addEventListener('scroll', alHacerScroll, { capture: true, passive: true });
    document.addEventListener('pointerdown', alPresionar, true);
    return () => {
      window.removeEventListener('resize', ubicar);
      window.removeEventListener('scroll', alHacerScroll, { capture: true });
      document.removeEventListener('pointerdown', alPresionar, true);
    };
  }, [open, matchWidth]);

  const portal = (node: ReactNode) => (open && container ? createPortal(node, container) : null);

  return { open, show, hide, anchorRef, popoverRef, portal };
}
