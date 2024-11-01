import { injectable } from 'inversify';

@injectable()
export class ConfigurationService {
  readonly HTTP_PORT: string;

  // TODO: Move to settings, or make provision on the go
  readonly BINANCE_UID: string;
  readonly BYBIT_UID: string;
  readonly GATE_UID: string;
  readonly KUCOIN_UID: string;
  readonly MEXC_UID: string;
  readonly POLONIEX_UID: string;

  constructor() {
    this.HTTP_PORT = process.env.HTTP_PORT!;

    this.BINANCE_UID = process.env.BINANCE_UID!;
    this.BYBIT_UID = process.env.BYBIT_UID!;
    this.GATE_UID = process.env.GATE_UID!;
    this.KUCOIN_UID = process.env.KUCOIN_UID!;
    this.MEXC_UID = process.env.MEXC_UID!;
    this.POLONIEX_UID = process.env.POLONIEX_UID!;

    this.ensureDefinition();
  }

  private ensureDefinition(): void {
    const envVariables = Object.entries(this);

    envVariables.forEach(([key, value]) => {
      if (value === undefined) {
        throw new Error(`Required environment variable is missing: ${key}`);
      }
    });
  }
}
