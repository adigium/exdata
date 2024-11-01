import axios, { AxiosInstance, AxiosResponse, CreateAxiosDefaults } from 'axios';
import { HttpRequest, HttpResponse } from '../../modules/HttpClientModule';
import { BaseHttpClient } from './BaseHttpClient';

export class AxiosHttpClient extends BaseHttpClient {
  private axios: AxiosInstance;

  constructor(options: CreateAxiosDefaults) {
    super({ baseUrl: options.baseURL });
    this.axios = axios.create(options);
    this.baseUrl = options.baseURL;
  }

  async get<R>(request: HttpRequest<never>): Promise<HttpResponse<R>> {
    const {
      data: axiosData,
      headers: axiosHeaders,
      status: axiosStatus,
    } = await this.axios.get<R>(request.url, {
      baseURL: this.baseUrl,
      headers: request.headers,
      params: request.params,
      data: request.body,
      validateStatus: () => true,
    });

    const headers = Object.entries(axiosHeaders).reduce(
      (acc, [key, value]) => {
        if (
          key !== null &&
          key !== undefined &&
          value !== undefined &&
          value !== null &&
          typeof value !== 'function' &&
          typeof value !== 'object' &&
          typeof value !== 'symbol'
        )
          acc[key] = `${value}`;
        return acc;
      },
      {} as Record<string, string>,
    );

    return { data: axiosData, headers, request, status: axiosStatus };
  }

  async post<D, R>(request: HttpRequest<D>): Promise<HttpResponse<R>> {
    const {
      data: axiosData,
      headers: axiosHeaders,
      status: axiosStatus,
    } = await this.axios.post<R, AxiosResponse<R, any>, D>(request.url, request.body, {
      baseURL: this.baseUrl,
      headers: request.headers,
      params: request.params,
      data: request.body,
      validateStatus: () => true,
    });

    const headers = Object.entries(axiosHeaders).reduce(
      (acc, [key, value]) => {
        if (
          key !== null &&
          key !== undefined &&
          value !== undefined &&
          value !== null &&
          typeof value !== 'function' &&
          typeof value !== 'object' &&
          typeof value !== 'symbol'
        )
          acc[key] = `${value}`;
        return acc;
      },
      {} as Record<string, string>,
    );

    return { data: axiosData, headers, request, status: axiosStatus };
  }
}
