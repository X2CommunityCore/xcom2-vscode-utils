import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as child from 'child_process';
import { promisify } from 'util';
import filterAsync from 'node-filter-async';
import { extensionConfigRoot } from './extension';

const fsStatAsync = promisify(fs.stat);
const childExecAsync = promisify(child.exec);

const gamePathSettingPath = "highlander.gameroot";
const sdkPathSettingPath = "highlander.sdkroot";

const gamePathEnding = "XCOM 2\\XCom2-WarOfTheChosen";
const sdkPathEnding = "XCOM 2 War of the Chosen SDK";

////////////////
/// Commands ///
////////////////

export async function validatePaths() {
    const checks = await checkConfiguredPaths();

    if (!checks.gamePathCorrect || !checks.sdkPathCorrect) {
        let problematicSettings: string[] = [];

        if (!checks.gamePathCorrect) { problematicSettings.push("game"); }
        if (!checks.sdkPathCorrect) { problematicSettings.push("SDK"); }

        const userSelection = await vscode.window.showWarningMessage(
            `Xcom 2: ${problematicSettings.join(" and ")} path${problematicSettings.length > 1 ? "s are" : " is"} incorrect`,
            'Detect automatically'
        );

        if (userSelection === 'Detect automatically') {
            await guessPaths();
        }
    } else {
        vscode.window.showInformationMessage("Xcom 2: both SDK and game paths are configured correctly");
    }
}

export async function guessPaths() {
    // Get the current situation so that we can know what to skip
    const checks = await checkConfiguredPaths();

    if (checks.gamePathCorrect && checks.sdkPathCorrect) {
        vscode.window.showInformationMessage("Xcom 2: both SDK and game paths are already configured correctly");
        return;
    }

    // The easiest way to do this would to use the native steam API
    // Unfortunately, we don't have such luxury - resort to manually scanning the filesystem

    let needGame = !checks.gamePathCorrect;
    let needSdk = !checks.sdkPathCorrect;

    const extensionConfig = vscode.workspace.getConfiguration(extensionConfigRoot);
    const libraries = await findSteamLibraries();

    for (let i = 0; i < libraries.length; i++) {
        if (needGame) {
            const gamePath = path.join(libraries[i], gamePathEnding);

            if (await isGameFolder(gamePath)) {
                needGame = false;
                extensionConfig.update(gamePathSettingPath, gamePath, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Xcom 2: game path found (${gamePath})`);
            }
        }

        if (needSdk) {
            const sdkPath = path.join(libraries[i], sdkPathEnding);

            if (await isSdkFolder(sdkPath)) {
                needSdk = false;
                extensionConfig.update(sdkPathSettingPath, sdkPath, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Xcom 2: SDK path found (${sdkPath})`);
            }
        }

        if (!needGame && !needSdk) {
            break;
        }
    }

    if (needGame || needSdk) {
        vscode.window.showWarningMessage(`Xcom 2: failed to automatically detect paths - please set them manually`);
    }
}

///////////////
/// Helpers ///
///////////////

async function checkConfiguredPaths(): Promise<{ gamePathCorrect: boolean, sdkPathCorrect: boolean }> {
    const extensionConfig = vscode.workspace.getConfiguration(extensionConfigRoot);
    const gamePath = <string>extensionConfig.get(gamePathSettingPath);
    const sdkPath = <string>extensionConfig.get(sdkPathSettingPath);

    const checks = await Promise.all([isGameFolder(gamePath), isSdkFolder(sdkPath)]);

    return {
        gamePathCorrect: checks[0] === true,
        sdkPathCorrect: checks[1] === true
    };
}

async function isGameFolder(path: string): Promise<boolean> {
    if (!path.endsWith(gamePathEnding)) { return false; }
    if (!await isPathValidFolder(path)) { return false; }

    return true;
}

async function isSdkFolder(path: string): Promise<boolean> {
    if (!path.endsWith(sdkPathEnding)) { return false; }
    if (!await isPathValidFolder(path)) { return false; }

    return true;
}

async function isPathValidFolder(path: string): Promise<boolean> {
    if (!await pathExists(path, fs.constants.F_OK)) { return false; }
    if (!(await fsStatAsync(path)).isDirectory()) { return false; }

    return true;
}

async function findSteamLibraries(): Promise<string[]> {
    let possibleSteamLibraries: string[] = [];

    // First, special handling for %ProgramFiles(x86)%/Steam
    const programFilesPath = process.env['ProgramFiles(x86)'];
    if (typeof programFilesPath !== "undefined" && await isPathValidFolder(programFilesPath)) {
        possibleSteamLibraries.push(path.win32.join(programFilesPath, "Steam"));
    }

    // Then we loop though mounted drives, looking for top-level "SteamLibrary" folder
    const drives = await getMountedDrives();
    for (let i = 0; i < drives.length; i++) {
        possibleSteamLibraries.push(path.win32.join(drives[i], "SteamLibrary"));
    }

    // Transform the collected paths to point to folder with games
    possibleSteamLibraries = possibleSteamLibraries
        .map(possibility => path.win32.join(possibility, 'steamapps', 'common'));

    // Return only those which are valid folders
    return filterAsync(possibleSteamLibraries, async (possibility) => await isPathValidFolder(possibility));
}

function pathExists(path: fs.PathLike, mode: number | undefined): Promise<boolean> {
    return new Promise(resolve => {
        fs.access(path, mode, (err) => {
            if (err) {
                resolve(false);
            }

            resolve(true);
        });
    });
}

// Based on https://stackoverflow.com/a/52411712/2588539
async function getMountedDrives(): Promise<string[]> {
    const output = await childExecAsync("wmic logicaldisk get name");

    return output.stdout
        .split('\r\r\n')
        .filter(value => /[A-Za-z]:/.test(value))
        .map(value => value.trim());
}