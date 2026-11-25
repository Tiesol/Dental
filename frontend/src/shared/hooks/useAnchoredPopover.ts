import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const MARGIN = 8;
const GAP = 4;
const MIN_HEIGHT = 160;

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

    const position = () => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;
      const rect = anchor.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - MARGIN;
      const above = rect.top - MARGIN;
      const upward = popover.scrollHeight > below && above > below;
      const width = matchWidth ? rect.width : popover.offsetWidth;
      const x = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - width - MARGIN));
      const y = upward ? rect.top - GAP : rect.bottom + GAP;

      popover.dataset.placement = upward ? 'top' : 'bottom';
      popover.style.setProperty('--popover-x', `${x}px`);
      popover.style.setProperty('--popover-y', `${y}px`);
      popover.style.setProperty(
        '--popover-max-h',
        `${Math.max(upward ? above : below, MIN_HEIGHT) - GAP}px`,
      );
      if (matchWidth) popover.style.setProperty('--popover-w', `${rect.width}px`);
    };

    const onScroll = (e: Event) => {
      if (!popoverRef.current?.contains(e.target as Node)) position();
    };
    const onPress = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };

    position();
    window.addEventListener('resize', position, { passive: true });
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    document.addEventListener('pointerdown', onPress, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('pointerdown', onPress, true);
    };
  }, [open, matchWidth]);

  const portal = (node: ReactNode) => (open && container ? createPortal(node, container) : null);

  return { open, show, hide, anchorRef, popoverRef, portal };
}
