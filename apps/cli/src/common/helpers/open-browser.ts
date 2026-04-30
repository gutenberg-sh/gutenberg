import { spawn } from 'node:child_process';

export function open_url_in_browser(url: string): void {
  const opts = { detached: true, stdio: 'ignore' as const };

  if (process.platform === 'darwin') {
    spawn('open', [url], opts).unref();
    return;
  }

  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { ...opts, shell: false }).unref();
    return;
  }

  spawn('xdg-open', [url], opts).unref();
}
