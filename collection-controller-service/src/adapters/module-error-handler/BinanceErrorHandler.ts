import { AxiosError } from 'axios';
import { ErrorHandlerModule } from '@modules';

// TODO: Implement better error handling mechanism with retry
export class BinanceErrorHandler implements ErrorHandlerModule {
  async handleError(error: AxiosError | Error, retryFn: () => Promise<any>): Promise<void> {
    if (error instanceof AxiosError) {
      const status = error.status;
      const retryAfter = parseInt(error.response?.headers['Retry-After'] || '60');
      switch (status) {
        case 429:
          console.log(`Rate limit exceeded, retrying after ${retryAfter} seconds.`);
          await this.delay(retryAfter);
          await retryFn();
          break;
        case 418:
          console.log(`IP banned temporarily, waiting for ${retryAfter} seconds before retrying.`);
          await this.delay(retryAfter);
          break;
        case 403:
          console.error(`Forbidden request, action may be required.`);
          break;
        case 500:
        case 503:
          console.log(`Server error encountered, retrying after ${retryAfter} seconds.`);
          await this.delay(retryAfter);
          await retryFn();
          break;
        default:
          console.error(`Unhandled error status: ${status}`);
      }
    } else {
      console.error('Non-HTTP error occurred:', error);
    }
  }

  private async delay(seconds: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, seconds * 1000);
    });
  }
}
