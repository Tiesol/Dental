import { useCallback, useState } from 'react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

type ConfirmOptions = { title: string; message: string; confirmLabel: string };
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

// Reemplaza a window.confirm: `if (!(await confirm({...}))) return;`. Quien lo usa debe
// renderizar `dialog` en su JSX.
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  const finish = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const dialog = pending && (
    <ConfirmDialog
      title={pending.title}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      onConfirm={() => finish(true)}
      onCancel={() => finish(false)}
    />
  );

  return { confirm, dialog };
}
