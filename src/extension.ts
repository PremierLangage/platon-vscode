import { AuthService } from './services/auth-service';
import { CommandService } from './services/command-service';
import { FileService } from './services/file-service';
import { HttpService } from './services/http-service';
import { SettingsService } from './services/settings-service';
import { setState } from './utils/state';

import vscode = require('vscode');

export async function activate(context: vscode.ExtensionContext) {
    setState('context', context);

    CommandService.create();

    context.subscriptions.push(
        vscode.window.registerUriHandler({
            handleUri: async (uri) => {
                SettingsService.create(uri);
                HttpService.create();

                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    cancellable: false,
                    title: 'Connecting to PLaTon...',
                }, async (progress, token) => {
                    try {
                        progress.report({ increment: 10, message: "Creating extension directories..." });
                        const { fs } = vscode.workspace;
                        try {
                            await fs.delete(context.globalStorageUri, { recursive: true, useTrash: false });
                        } catch {}
                        await fs.createDirectory(context.globalStorageUri);

                        progress.report({ increment: 20, message: "Trying to login into PLaTon..." });
                        await AuthService.create();

                        progress.report({ increment: 30, message: "Pulling files from PLaTon..." });
                        await FileService.create();

                        await vscode.commands.executeCommand('setContext', 'platon-editor:activated', true);
                        progress.report({ increment: 100, message: "Ready..." });
                    } catch (error) {
                        console.error(error);
                        vscode.window.showErrorMessage('An error occured while trying to connect to PLaTon');
                    }
                });
            }
        })
    );
}

export function deactivate() { }



