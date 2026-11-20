import type { TelemetryClient } from './client.js';
import { manageSpinnerSignals, stopSpinners } from '../utils/spinner.js';
import { setCancellationSignal } from '../utils/cancellation.js';

export function installTelemetrySignalHandlers(
  client: TelemetryClient,
  onCancel: () => void
): () => void {
  if (!client.enabled) return () => undefined;
  const controller = new AbortController();
  const restoreCancellation = setCancellationSignal(controller.signal);
  const restoreSpinnerSignals = manageSpinnerSignals();
  const onInterrupt = (): void => {
    onCancel();
    controller.abort();
    stopSpinners();
    void client.close('cancelled').finally(() => process.exit(130));
  };
  const onTerminate = (): void => {
    onCancel();
    controller.abort();
    stopSpinners();
    void client.close('cancelled').finally(() => process.exit(143));
  };
  // Keep ownership during the flush so signal-exit cannot re-raise the signal.
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);
  return () => {
    restoreCancellation();
    restoreSpinnerSignals();
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onTerminate);
  };
}
