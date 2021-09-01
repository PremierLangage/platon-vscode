/* eslint-disable @typescript-eslint/naming-convention */
import https = require("https");

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { setState, useState } from '../utils/state';
import { SettingsService } from './settings-service';
import { camelCase } from "../utils/camelcase";


export class HttpService {
    private constructor(
        private readonly axiosInstance: AxiosInstance,
    ) {
        setState('http-service', this);
    }

    async get<T>(url: string, config?: AxiosRequestConfig) {
        const response = await this.axiosInstance.get<T>(url, config);
        return response.data;
    }

    async post<T>(url: string, data: any, config?: AxiosRequestConfig) {
        const response = await this.axiosInstance.post<T>(url, data, config);
        return response.data;
    }

    async put<T>(url: string, data: any, config?: AxiosRequestConfig) {
        const response = await this.axiosInstance.put<T>(url, data, config);
        return response.data;
    }

    async patch<T>(url: string, data: any, config?: AxiosRequestConfig) {
        const response = await this.axiosInstance.patch<T>(url, data, config);
        return response.data;
    }

    async delete<T>(url: string, config?: AxiosRequestConfig) {
        const response = await this.axiosInstance.delete<T>(url, config);
        return response.data;
    }

    static create(): HttpService {
        const instance = axios.create({
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });

        instance.interceptors.request.use(
            async config => {
                const { settings } = SettingsService.instance();
                config.headers = {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    ...(config.headers || {}),
                    'Authorization': `Bearer ${settings.access}`
                };
                config.baseURL = settings.origin;
                return config;
            },
            error => Promise.reject(error)
        );

        instance.interceptors.response.use((response) => {
            if (typeof response.data  === 'object' && response.data.constructor === Object) {
                response.data = camelCase(response.data);
            }
            return response;
        }, async function (error) {
            const originalRequest = error.config;
            if (error.response.status === 403 && !originalRequest._retry) {
                originalRequest._retry = true;

                const { settings } = SettingsService.instance();
                const response = await instance.post('/api/v1/auth/refresh/', {
                    refresh: settings.refresh
                });
                settings.access = response.data.access;

                axios.defaults.headers.common['Authorization'] = 'Bearer ' + settings.access;

                return instance(originalRequest);
            }

            return Promise.reject(error);
        });

        return new HttpService(instance);
    }

    static instance(): HttpService {
        return useState<HttpService>('http-service');
    }
}