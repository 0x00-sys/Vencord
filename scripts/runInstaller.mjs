/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./checkNodeVersion.js";

import { execFileSync, execSync } from "child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from "fs";
import { dirname, join } from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { fileURLToPath } from "url";

const BASE_URL = "https://github.com/Vencord/Installer/releases/latest/download/";
const LATEST_RELEASE_URL = "https://api.github.com/repos/Vencord/Installer/releases/latest";

const BASE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE_DIR = join(BASE_DIR, "dist", "Installer");
const ETAG_FILE = join(FILE_DIR, "etag.txt");

function getFilename() {
    switch (process.platform) {
        case "win32":
            return "VencordInstallerCli.exe";
        case "darwin":
            return "VencordInstallerCli-darwin";
        case "linux":
            return "VencordInstallerCli-linux";
        default:
            throw new Error("Unsupported platform: " + process.platform);
    }
}

function fetchInstaller(filename) {
    const etag = existsSync(join(FILE_DIR, filename)) && existsSync(ETAG_FILE)
        ? readFileSync(ETAG_FILE, "utf-8")
        : null;

    return fetch(BASE_URL + filename, {
        headers: {
            "User-Agent": "Vencord (https://github.com/Vendicated/Vencord)",
            "If-None-Match": etag
        }
    });
}

async function findFilename() {
    const platform = { win32: /\.exe$/i, darwin: /darwin|mac/i, linux: /linux/i }[process.platform];

    try {
        const res = await fetch(LATEST_RELEASE_URL, {
            headers: { "User-Agent": "Vencord (https://github.com/Vendicated/Vencord)" }
        });
        const { assets } = await res.json();
        return assets.find(a => /cli/i.test(a.name) && platform.test(a.name))?.name ?? null;
    } catch {
        return null;
    }
}

async function ensureBinary() {
    mkdirSync(FILE_DIR, { recursive: true });

    let filename = getFilename();
    let res = await fetchInstaller(filename);

    // release file names have changed before, so look up the current one if ours is gone
    if (res.status === 404) {
        const found = await findFilename();
        if (found && found !== filename) {
            filename = found;
            res = await fetchInstaller(filename);
        }
    }

    console.log("Downloading " + filename);

    const outputFile = join(FILE_DIR, filename);

    if (res.status === 304) {
        console.log("Up to date, not redownloading!");
        return outputFile;
    }
    if (!res.ok)
        throw new Error(`Failed to download installer: ${res.status} ${res.statusText}`);

    writeFileSync(ETAG_FILE, res.headers.get("etag"));

    const body = Readable.fromWeb(res.body);
    await finished(body.pipe(createWriteStream(outputFile, {
        mode: 0o755,
        autoClose: true
    })));

    console.log("Finished downloading!");

    return outputFile;
}



const installerBin = await ensureBinary();

console.log("Now running Installer...");

const argStart = process.argv.indexOf("--");
const args = argStart === -1 ? [] : process.argv.slice(argStart + 1);

try {
    execFileSync(installerBin, args, {
        stdio: "inherit",
        env: {
            ...process.env,
            VENCORD_USER_DATA_DIR: BASE_DIR,
            VENCORD_DEV_INSTALL: "1"
        }
    });
} catch {
    console.error("Something went wrong. Please check the logs above.");
}
