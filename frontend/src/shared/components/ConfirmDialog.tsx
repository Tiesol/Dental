import { useId, useLayoutEffect, useRef } from 'react';

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// <dialog> nativo: showModal atrapa el foco, Escape lo cierra y al cerrar el navegador devuelve
// el foco al botón que lo abrió. El foco inicial cae en Cancelar, la opción que no hace daño.
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  // useLayoutEffect: cierra antes de que React quite el nodo, si no el foco no vuelve al botón.
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <p id={messageId} className="muted">
        {message}
      </p>
      <div className="dialog-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
