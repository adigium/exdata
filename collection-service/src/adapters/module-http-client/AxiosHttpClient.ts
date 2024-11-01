import axios, { AxiosInstance } from 'axios';
import { injectable } from 'inversify';
import { HttpRequest, HttpResponse } from '@modules';
import { BaseHttpClient } from './BaseHttpClient';

@injectable()
export class AxiosHttpClient extends BaseHttpClient {
  private axios: AxiosInstance;

  constructor() {
    super({});
    this.axios = axios.create();
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
    } = await this.axios.post<R>(request.url, request.body, {
      baseURL: this.baseUrl,
      headers: request.headers,
      params: request.params,
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

  async put<D, R>(request: HttpRequest<D>): Promise<HttpResponse<R>> {
    const {
      data: axiosData,
      headers: axiosHeaders,
      status: axiosStatus,
    } = await this.axios.put<R>(request.url, request.body, {
      baseURL: this.baseUrl,
      headers: request.headers,
      params: request.params,
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
