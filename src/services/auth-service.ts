import vscode = require("vscode");

import { User } from '../models/user';
import { setState, useState } from '../utils/state';
import { HttpService } from "./http-service";


export class AuthService {
    private constructor(
        readonly user: User,
    ) {
        setState('auth-service', this);
    }

    static async create(): Promise<AuthService> {
        const httpService = HttpService.instance();    
        const user = await httpService.get<User>(`/api/v1/users/me/`);
        if (!user) {
            vscode.window.showInformationMessage('Failed to login into PLaTon.');
            throw new Error('Failed to login into PLaTon.');
        }
        vscode.window.showInformationMessage(`Logged in into PLaTon as ${user.username}`);
        return new AuthService(user);
    }

    static instance(): AuthService {
        return useState<AuthService>('auth-service');
    }
}