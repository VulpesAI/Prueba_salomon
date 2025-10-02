"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRootEnv = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
let isLoaded = false;
const loadFromFile = (filePath, loader) => {
    if (process.env.NODE_ENV === 'test') {
        return;
    }
    if (!(0, node_fs_1.existsSync)(filePath)) {
        return;
    }
    if (typeof loader === 'function') {
        loader(filePath);
        return;
    }
    const content = (0, node_fs_1.readFileSync)(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex === -1) {
            continue;
        }
        const key = trimmed.slice(0, equalsIndex).trim();
        if (!key || key in process.env) {
            continue;
        }
        let value = trimmed.slice(equalsIndex + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    }
};
const loadRootEnv = () => {
    if (isLoaded) {
        return;
    }
    isLoaded = true;
    const candidatePaths = [
        (0, node_path_1.resolve)(process.cwd(), '..', '..', '.env'),
        (0, node_path_1.resolve)(process.cwd(), '.env'),
    ];
    const loader = process.loadEnvFile;
    for (const path of candidatePaths) {
        loadFromFile(path, loader);
    }
};
exports.loadRootEnv = loadRootEnv;
//# sourceMappingURL=env.loader.js.map