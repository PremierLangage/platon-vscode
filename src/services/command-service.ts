import { setState, useState } from '../utils/state';

import vscode = require("vscode");
import { FileService } from './file-service';

export const COMMAND_SYNC = 'platon-editor.sync';

export class CommandService {
    private constructor(
    ) {
        setState('command-service', this);
    }

    static create(): CommandService {
        const context = useState<vscode.ExtensionContext>('context');

        context.subscriptions.push(
            vscode.commands.registerCommand(COMMAND_SYNC, async () => {
                await FileService.instance().sync();
            })
        );

        return new CommandService();
    }

    static instance(): CommandService {
        return useState<CommandService>('command-service');
    }
}