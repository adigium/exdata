export interface ErrorHandlerModule {
  handleError(response: Error | Response, retryFn: () => Promise<any>): Promise<void>;
}
