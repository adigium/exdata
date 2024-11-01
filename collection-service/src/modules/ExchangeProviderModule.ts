export interface ExchangeProviderModule<C = any, D = any> {
  getCredentials(): Promise<C>;
  getRequestDetails(): Promise<D>;
}
