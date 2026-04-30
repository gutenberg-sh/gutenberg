import { once } from 'node:events';

export async function wait_for_shutdown_signal(): Promise<void> {
  await once(process, 'SIGINT');
}
