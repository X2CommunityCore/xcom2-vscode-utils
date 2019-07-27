// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { validatePaths, guessPaths } from './sdk-location';
import { launchEditor } from './exe-launcher';

export const extensionConfigRoot = "xcom";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('xcom2.validatePaths', validatePaths));
	context.subscriptions.push(vscode.commands.registerCommand('xcom2.guessPaths', guessPaths));

	context.subscriptions.push(vscode.commands.registerCommand('xcom2.runEditor', launchEditor));
}

// this method is called when your extension is deactivated
export function deactivate() {}
