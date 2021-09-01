import { URLSearchParams } from 'url';
import { Settings } from '../models/settings';
import { setState, useState } from '../utils/state';
import vscode = require('vscode');

export class SettingsService {
    private constructor(
        readonly settings: Settings
    ) {
        setState('settings-service', this);
    }

    static create(uri: vscode.Uri): SettingsService {
        const params = new URLSearchParams(uri.query);
        const settings: Settings = {
            access: params.get('access')!,
            origin: params.get('origin')!,
            refresh: params.get('refresh')!,
            filesUrl: '',
        };

        const circle = params.get('circle');
        if (circle) {
            settings.circle = Number.parseInt(circle, 10);
            settings.filesUrl = `/api/v1/files/circle:${circle}/`;
        }

        const resource = params.get('resource');
        if (resource) {
            settings.resource = Number.parseInt(resource, 10);
            settings.filesUrl = `/api/v1/files/resource:${resource}/`;
        }

        return new SettingsService(settings);
    }

    static instance(): SettingsService {
        return useState<SettingsService>('settings-service');
    }
}