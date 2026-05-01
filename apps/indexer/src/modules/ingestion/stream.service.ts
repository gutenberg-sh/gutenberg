import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';

import { PROGRAM_ID, SOLANA_WS_URL } from '../../common/config/config.tokens';

import { IngestService } from './ingest.service';

type LogsNotification = {
  jsonrpc: '2.0';
  method: 'logsNotification';
  params: {
    subscription: number;
    result: {
      context: { slot: number };
      value: {
        signature: string;
        err: unknown;
        logs: string[];
      };
    };
  };
};

@Injectable()
export class StreamService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(StreamService.name);
  private socket: WebSocket | null = null;
  private subscription_id: number | null = null;
  private next_request_id = 1;
  private reconnect_attempts = 0;
  private shutdown = false;
  private reconnect_timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(SOLANA_WS_URL) private readonly ws_url: string,
    @Inject(PROGRAM_ID) private readonly program_id: string,
    private readonly ingest: IngestService,
  ) {}

  onApplicationBootstrap(): void {
    this.connect();
  }

  onApplicationShutdown(): void {
    this.shutdown = true;

    if (this.reconnect_timer) {
      clearTimeout(this.reconnect_timer);
      this.reconnect_timer = null;
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.close();
      } catch (error) {
        this.logger.warn(`Error closing WebSocket: ${(error as Error).message}`);
      }
    }

    this.socket = null;
  }

  private connect(): void {
    if (this.shutdown) {
      return;
    }

    try {
      this.logger.log(`Opening WebSocket to ${this.ws_url}`);
      this.socket = new WebSocket(this.ws_url);
    } catch (error) {
      this.logger.error(
        `Failed to construct WebSocket: ${(error as Error).message}`,
      );
      this.schedule_reconnect();
      return;
    }

    this.socket.addEventListener('open', () => this.on_open());
    this.socket.addEventListener('message', (event) =>
      this.on_message(typeof event.data === 'string' ? event.data : ''),
    );
    this.socket.addEventListener('error', (event) => {
      this.logger.warn(
        `WebSocket error: ${'message' in event ? String((event as { message: unknown }).message) : 'unknown'}`,
      );
    });
    this.socket.addEventListener('close', (event) => {
      this.logger.warn(
        `WebSocket closed (code=${event.code} reason=${event.reason || 'n/a'})`,
      );
      this.subscription_id = null;
      this.socket = null;
      this.schedule_reconnect();
    });
  }

  private on_open(): void {
    this.reconnect_attempts = 0;
    this.logger.log('WebSocket open; subscribing to program logs');

    const id = ++this.next_request_id;

    this.send_json({
      jsonrpc: '2.0',
      id,
      method: 'logsSubscribe',
      params: [
        { mentions: [this.program_id] },
        { commitment: 'confirmed' },
      ],
    });
  }

  private on_message(raw: string): void {
    if (raw.length === 0) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return;
    }

    const message = parsed as Record<string, unknown>;

    if ('result' in message && typeof message.result === 'number') {
      this.subscription_id = message.result;
      this.logger.log(`Subscribed (subscription_id=${this.subscription_id})`);
      return;
    }

    if (message.method === 'logsNotification') {
      void this.handle_log_notification(parsed as LogsNotification);
    }
  }

  private async handle_log_notification(
    notification: LogsNotification,
  ): Promise<void> {
    const { result } = notification.params;

    if (result.value.err) {
      return;
    }

    try {
      const result_summary = await this.ingest.ingest_transaction({
        signature: result.value.signature,
        slot: result.context.slot,
        log_messages: result.value.logs,
      });

      if (result_summary.releases_indexed > 0) {
        this.logger.log(
          `Stream ingested ${result_summary.releases_indexed} release(s) from ${result.value.signature}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to ingest streamed tx ${result.value.signature}: ${(error as Error).message}`,
      );
    }
  }

  private send_json(payload: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(payload));
  }

  private schedule_reconnect(): void {
    if (this.shutdown) {
      return;
    }

    this.reconnect_attempts += 1;
    const delay_ms = Math.min(
      30_000,
      1_000 * Math.pow(2, Math.min(this.reconnect_attempts, 5)),
    );

    this.logger.log(`Reconnecting WebSocket in ${delay_ms}ms`);
    this.reconnect_timer = setTimeout(() => this.connect(), delay_ms);
  }
}
