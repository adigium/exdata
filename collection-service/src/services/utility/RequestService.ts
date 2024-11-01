import createLimit from 'p-limit';
import { ExchangeID } from '@entities';
import { LoggerModule, RateLimiterModule } from '@modules';
import { color, colors, ConsoleLoggerStrategy, Logger } from '@frameworks/logger';

interface RequestServiceClassCaller {
  exchangeId: ExchangeID;
  rateLimiter: RateLimiterModule;
  logger?: LoggerModule;
}

// TODO: Rewrite limiting according to the best code style practices
const limitLogger = new Logger(new ConsoleLoggerStrategy(), 'RequestLimit');
const limit = createLimit(5);

setInterval(() => {
  limitLogger.info(`Requests: Active count: ${limit.activeCount}; Pending: ${limit.pendingCount}`);
}, 4000);

export class RequestService {
  public static with(me: RequestServiceClassCaller) {
    if (!me.rateLimiter)
      throw new Error('For using request service rate limiter should be defined in the provided context');

    return { request: RequestService.request.bind(me) };
  }

  private static async request<R = any, T = any>(
    this: any,
    request: FunctionWithDetails<(...args: T[]) => Promise<R>, any>,
    options?: {
      args?: T[];
      context?: string;
      verbose?: boolean;
      onError?: (error: any) => Promise<void> | void;
    },
  ): Promise<R | undefined> {
    const handle = async () => {
      try {
        if (options?.verbose)
          this.logger?.info(
            `Preparing for the request: ${color(options?.context || 'unknown', colors.blue)}`,
          );

        if (this.rateLimiter) {
          const limitInfo = await this.rateLimiter.getLimitInfo(this.exchangeId, request.details[0]);
          await this.rateLimiter.waitForLimit(limitInfo);

          for (const requestDetails of request.details) {
            const limitInfo = await this.rateLimiter.addUsage(this.exchangeId, requestDetails);
            await this.rateLimiter.waitForLimit(limitInfo);
          }
        }

        if (options?.verbose)
          this.logger?.info(`Rate limiter passed: ${color(options?.context || 'unknown', colors.blue)}`);

        const result = await request(...(options?.args || []));

        if (!result) {
          this.logger?.error(`Request failed: ${color(options?.context || 'unknown', colors.red)}`);
          return;
        }

        if (options?.verbose)
          this.logger?.info(`Request was successful: ${color(options?.context || 'unknown', colors.green)}`);

        return result;
      } catch (error: any) {
        await options?.onError?.(error);
      }
    };
    return limit(() => handle.call(this));
  }
}
