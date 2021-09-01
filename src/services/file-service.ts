import { Readable } from 'stream';
import { setState, useState } from '../utils/state';
import { HttpService } from "./http-service";
import { SettingsService } from './settings-service';

import vscode = require("vscode");
import fs = require('fs');
import util = require('util');
import FormData = require('form-data');

const exec = util.promisify(require('child_process').exec);

export class FileService {
    private constructor(
        private readonly bundleUri: vscode.Uri,
        private readonly folderUri: vscode.Uri,
    ) {
        setState('file-service', this);
    }

    async sync(): Promise<void> {
        if (await this.hasConflicts()) {
            vscode.window.showErrorMessage(`Your local repository contains conflicts, please resolves them before syncing with the server.`);
            return;
        }

        await this.commit('commit local changes');
        await this.pull();

        if (await this.hasConflicts()) {
            vscode.window.showErrorMessage(`Your local repository contains conflicts, please resolves them before syncing with the server.`);
            return;
        }

        await this.commit('merge remote changes');
        await this.push();
    }


    private async push(): Promise<void> {
        const { bundleUri, folderUri } = this;
        try {
            await exec(`cd "${folderUri.fsPath}" && git bundle create "${bundleUri.fsPath}" HEAD master`);

            const form = new FormData();
            const bundle = fs.readFileSync(bundleUri.fsPath);
            form.append('bundle', bundle, 'bundle.git');

            const { settings } = SettingsService.instance();
            const httpService = HttpService.instance();
            await httpService.put(settings.filesUrl, form, {
                headers: { ...form.getHeaders() },
            });

            vscode.window.showInformationMessage('Successfully synced the repository with the server.');
        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage(`An error occurred while trying to sync with the server.`);
        } finally {
            await vscode.workspace.fs.delete(bundleUri, { recursive: true, useTrash: false });
        }
    }

    private async pull(): Promise<void> {
        try {
            const { bundleUri, folderUri } = this;
            await FileService.clone();
            await exec(`cd "${folderUri.fsPath}" && git pull "${bundleUri.fsPath}"`);
        } catch (error) {
            console.error(error);
        }
    }

    private async commit(message: string): Promise<void> {
        const { folderUri } = this;
        try {
            await exec(`cd "${folderUri.fsPath}" && git add . && git commit -m "${message}"`);
        } catch (error) {
            console.error(error);
        } // git commit -am will fail if working tree is clean
    }

    private async hasConflicts(): Promise<boolean> {
        try {
            const { folderUri } = this;
            const { stdout, stderr } = await exec(`cd "${folderUri.fsPath}" && git diff --check`);
            return !!stdout || !!stderr;
        } catch (error) {
            console.error(error);
            return true;
        }
    }


    static async create(): Promise<FileService> {
        const { settings } = SettingsService.instance();
        const httpService = HttpService.instance();

        let resource: any;
        if (settings.resource) {
            resource = await httpService.get<any>(`/api/v1/resources/${settings.resource}/`);
        } else if (settings.circle) {
            resource = await httpService.get<any>(`/api/v1/circles/${settings.circle}/`);
        }

        if (!resource.permissions.write) {
            throw new Error("You don't have the rights to edit these files.");
        }

        await FileService.clone();

        const { globalStorageUri } = useState<vscode.ExtensionContext>('context');
        const bundleUri = vscode.Uri.joinPath(globalStorageUri, 'bundle.git');
        const folderUri = vscode.Uri.joinPath(globalStorageUri, 'bundle');

        await exec(`git clone "${bundleUri.fsPath}" "${folderUri.fsPath}"`);
        await vscode.workspace.fs.delete(bundleUri, { recursive: true, useTrash: false });

        vscode.workspace.updateWorkspaceFolders(
            0, vscode.workspace.workspaceFolders?.length, { uri: folderUri, name: resource.name }
        );

        return new FileService(bundleUri, folderUri);
    }

    static instance(): FileService {
        return useState<FileService>('file-service');
    }

    private static clone(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const { settings } = SettingsService.instance();
            const httpService = HttpService.instance();

            const { globalStorageUri } = useState<vscode.ExtensionContext>('context');
            const output = vscode.Uri.joinPath(globalStorageUri, 'bundle.git');

            const buffer: Readable = await httpService.get<any>(
                `${settings.filesUrl}?git-bundle`, { responseType: 'stream' }
            );

            const write = fs.createWriteStream(output.fsPath);
            buffer.pipe(write);

            let hasError = false;
            write.on('error', error => {
                hasError = true;
                write.close();
                reject(error);
            });

            write.on('close', () => {
                if (!hasError) {
                    try {
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                }
            });
        });
    }
}

