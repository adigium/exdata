import { ExchangeID } from '@entities';
import { RateLimiterModule } from '@modules';

export class WebsocketRateLimiter {
  private exchangeId: ExchangeID;
  private rateLimiter: RateLimiterModule;
  private uid: string;
  private ip: string;

  constructor(options: { exchangeId: ExchangeID; rateLimiter: RateLimiterModule; uid: string; ip: string }) {
    this.exchangeId = options.exchangeId;
    this.rateLimiter = options.rateLimiter;

    this.uid = options.uid;
    this.ip = options.ip;
  }

  public async ensureConnectionLimit() {
    await this.wait(`wss://connect`);
  }

  public async ensureSendLimit(websocketId: string) {
    await this.wait(`wss://send/${websocketId}`);
  }

  private async wait(endpoint: string) {
    const limitInfo = await this.rateLimiter.getLimitInfo(this.exchangeId, {
      endpoint,
      weight: 1,
      id: this.uid,
      ip: this.ip,
    });

    await this.rateLimiter.waitForLimit(limitInfo);
    await this.rateLimiter.addUsage(this.exchangeId, {
      endpoint,
      weight: 1,
      id: this.uid,
      ip: this.ip,
    });
  }
}
