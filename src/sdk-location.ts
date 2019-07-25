import * as vscode from 'vscode';
import * as fs from 'fs';
import { promisify } from 'util';
import { extensionConfigRoot } from './extension';

const fsStatAsync = promisify(fs.stat);

const gamePathSettingPath = "highlander.gameroot";
const sdkPathSettingPath = "highlander.sdkroot";

const gamePathEnding = "XCOM 2\\XCom2-WarOfTheChosen";
const sdkPathEnding = "\\XCOM 2 War of the Chosen SDK";

////////////////
/// Commands ///
////////////////

export async function validatePaths() {
    const extensionConfig = vscode.workspace.getConfiguration(extensionConfigRoot);
    const gamePath = <string> extensionConfig.get(gamePathSettingPath);
    const sdkPath = <string> extensionConfig.get(sdkPathSettingPath);

    const checks = await Promise.all([isGameFolder(gamePath), isSdkFolder(sdkPath)]);

    const gamePathCorrect = checks[0] === true;
    const sdkPathCorrect = checks[1] === true;

    if (!gamePathCorrect || !sdkPathCorrect) {
        let problematicSettings: string[] = [];

        if (!gamePathCorrect) { problematicSettings.push("game"); }
        if (!sdkPathCorrect) { problematicSettings.push("SDK"); }

        vscode.window.showWarningMessage(
            `Xcom 2: ${problematicSettings.join(" and ")} path${problematicSettings.length > 1 ? "s are" : " is"} incorrect`
        );
    }
}

///////////////
/// Helpers ///
///////////////

async function isGameFolder(path: string) : Promise<boolean> {
    if (!path.endsWith(gamePathEnding)) { return false; }
    if (!await pathExists(path, fs.constants.F_OK)) { return false; }
    if (!(await fsStatAsync(path)).isDirectory()) { return false; }

    return true;
}

async function isSdkFolder(path: string) : Promise<boolean> {
    if (!path.endsWith(sdkPathEnding)) { return false; }
    if (!await pathExists(path, fs.constants.F_OK)) { return false; }
    if (!(await fsStatAsync(path)).isDirectory()) { return false; }

    return true;
}

function pathExists (path: fs.PathLike, mode: number | undefined) : Promise<boolean> {
    return new Promise(resolve => {
        fs.access(path, mode, (err) => {
            if (err) {
                resolve(false);
            }

            resolve(true);
        });
    });
}