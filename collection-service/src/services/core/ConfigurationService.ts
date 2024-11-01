import { injectable } from 'inversify';

function Env() {
  return (target: any, propertyKey: string) => {
    const envVars = Reflect.getMetadata('envVars', target) || [];
    envVars.push(propertyKey);
    Reflect.defineMetadata('envVars', envVars, target);
  };
}

@injectable()
export class ConfigurationService {
  @Env() readonly PUBLIC_IP!: string;
  @Env() readonly DATABASE_URI!: string;

  @Env() readonly INSTANCE_HOST!: string;
  @Env() readonly INSTANCE_HTTP_PORT!: string;

  @Env() readonly CONTROLLER_HOST!: string;
  @Env() readonly CONTROLLER_PORT!: string;

  @Env() readonly TASK_INTERVAL!: string;

  @Env() readonly RATE_LIMITER_HOST!: string;
  @Env() readonly RATE_LIMITER_PORT!: string;

  @Env() readonly HEARTBEAT_HOST!: string;
  @Env() readonly HEARTBEAT_PORT!: string;
  @Env() readonly HEARTBEAT_INTERVAL!: string;
  @Env() readonly HEARTBEAT_RETRY_INTERVAL!: string;

  @Env() readonly REGISTRY_HOST!: string;
  @Env() readonly REGISTRY_PORT!: string;
  @Env() readonly REGISTRY_RETRIES!: string;
  @Env() readonly REGISTRY_RETRY_INTERVAL!: string;

  @Env() readonly TASK_CONTROL_ENDPOINT!: string;
  @Env() readonly TASK_LOG_ENDPOINT!: string;
  @Env() readonly HEALTHCHECK_ENDPOINT!: string;
  @Env() readonly HEARTBEAT_ENDPOINT!: string;
  @Env() readonly REGISTER_ENDPOINT!: string;
  @Env() readonly DEREGISTER_ENDPOINT!: string;
  @Env() readonly TLS_ENABLED!: string;

  @Env() readonly ASSETS_RANK_THRESHOLD!: string;

  @Env() readonly COINMARKETCAP_API_KEY!: string;

  @Env() readonly BINANCE_UID!: string;
  @Env() readonly BINANCE_API_KEY!: string;
  @Env() readonly BINANCE_API_SECRET!: string;
  @Env() readonly BYBIT_UID!: string;
  @Env() readonly BYBIT_API_KEY!: string;
  @Env() readonly BYBIT_API_SECRET!: string;
  @Env() readonly GATE_UID!: string;
  @Env() readonly GATE_API_KEY!: string;
  @Env() readonly GATE_API_SECRET!: string;
  @Env() readonly KUCOIN_UID!: string;
  @Env() readonly KUCOIN_API_KEY!: string;
  @Env() readonly KUCOIN_API_SECRET!: string;
  @Env() readonly KUCOIN_PASSWORD!: string;
  @Env() readonly MEXC_UID!: string;
  @Env() readonly MEXC_API_KEY!: string;
  @Env() readonly MEXC_API_SECRET!: string;
  @Env() readonly POLONIEX_UID!: string;
  @Env() readonly POLONIEX_API_KEY!: string;
  @Env() readonly POLONIEX_API_SECRET!: string;

  constructor() {
    const envVars: string[] = Reflect.getMetadata('envVars', this) || [];

    envVars.forEach((key) => {
      const value = process.env[key];
      if (value === undefined) {
        throw new Error(`Required environment variable is missing: ${key}`);
      }
      (this as any)[key] = value;
    });
  }
}
