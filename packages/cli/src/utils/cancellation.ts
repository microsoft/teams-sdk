let activeSignal: AbortSignal | undefined;

export function getCancellationSignal(): AbortSignal | undefined {
  return activeSignal;
}

export function setCancellationSignal(signal: AbortSignal): () => void {
  const previous = activeSignal;
  activeSignal = signal;
  return () => {
    activeSignal = previous;
  };
}

export function throwIfCancelled(): void {
  activeSignal?.throwIfAborted();
}
