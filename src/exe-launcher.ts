import * as child from 'child_process';
import * as vscode from 'vscode';
import { getValidSdkPath } from './sdk-location';

export async function launchEditor() {
    const sdkPath = await getValidSdkPath();

    if (sdkPath === false) {
        vscode.window.showErrorMessage("XCom 2: cannot launch editor - the SDK path is not configured correctly");
        return;
    }

    // TODO: This still kills the editor when IDE is closed. Ship a powershell script with the extension and invoke that here

    const process = child.spawn(`${sdkPath}\\Binaries\\Win64\\XComGame.exe`, ['editor', '-noscriptcompile', '-nogadwarning'], {
        detached: true,
        stdio: "ignore"
    });

    process.unref();
}