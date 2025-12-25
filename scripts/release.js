const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const PLUGINS_DIR = path.join(__dirname, '../plugins');
const PLUGINS_JSON_PATH = path.join(__dirname, '../releases/plugins.json');

// 颜色输出
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    blue: "\x1b[34m"
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command) {
    try {
        log(colors.blue, `Executing: ${command}`);
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        log(colors.red, `Error executing command: ${command}`);
        process.exit(1);
    }
}

function incrementVersion(version) {
    const parts = version.split('.').map(Number);
    if (parts.length < 3) {
        return version + ".1";
    }
    parts[parts.length - 1] += 1;
    return parts.join('.');
}

function loadJson(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (e) {
            log(colors.red, `Error parsing JSON from ${filePath}: ${e.message}`);
        }
    }
    return null;
}

function main() {
    log(colors.green, "🚀 Starting release process...");

    // 1. 同步 plugins/config.json 到 releases/plugins.json
    log(colors.blue, "🔄 Syncing plugin configs...");
    
    if (!fs.existsSync(PLUGINS_JSON_PATH)) {
        log(colors.red, `Error: Could not find ${PLUGINS_JSON_PATH}`);
        process.exit(1);
    }

    let pluginsConfig = loadJson(PLUGINS_JSON_PATH);
    if (!pluginsConfig) process.exit(1);

    // 清空现有的 plugins 列表，重新扫描
    pluginsConfig.plugins = [];

    if (fs.existsSync(PLUGINS_DIR)) {
        const items = fs.readdirSync(PLUGINS_DIR);
        for (const item of items) {
            if (item.startsWith('.')) continue;
            const pluginPath = path.join(PLUGINS_DIR, item);
            if (!fs.statSync(pluginPath).isDirectory()) continue;

            const configPath = path.join(pluginPath, 'config.json');
            const config = loadJson(configPath);

            if (config && config.id && config.version) {
                // 自动生成 fileName，确保 Actions 打包时名字一致
                const zipFileName = `${config.id}-${config.version}.zip`;
                
                const pluginEntry = { ...config };
                if (pluginEntry.downloadUrl) delete pluginEntry.downloadUrl;
                pluginEntry.fileName = zipFileName;
                
                pluginsConfig.plugins.push(pluginEntry);
                log(colors.green, `   + Added ${config.id} (${config.version})`);
            } else {
                log(colors.yellow, `   - Skipped ${item} (invalid config)`);
            }
        }
    }

    // 2. 自动递增版本号
    let version = pluginsConfig.version;
    if (!version) {
        log(colors.red, "Error: 'version' field not found in plugins.json");
        process.exit(1);
    }

    let tagName = `v${version}`;
    let isVersionUpdated = false;

    try {
        const existingTags = execSync('git tag').toString().split('\n').map(t => t.trim());
        while (existingTags.includes(tagName)) {
            log(colors.yellow, `Tag ${tagName} already exists. Incrementing version...`);
            version = incrementVersion(version);
            tagName = `v${version}`;
            isVersionUpdated = true;
        }
    } catch (e) {}

    // 始终更新文件（因为我们同步了 plugins 列表）
    pluginsConfig.version = version;
    pluginsConfig.lastUpdated = new Date().toISOString().split('T')[0];
    
    fs.writeFileSync(PLUGINS_JSON_PATH, JSON.stringify(pluginsConfig, null, 2), 'utf-8');
    log(colors.green, `✅ Updated ${PLUGINS_JSON_PATH} (Version: ${version})`);

    // 3. 提交更改
    try {
        const status = execSync('git status --porcelain').toString();
        if (status) {
            log(colors.yellow, "Changes detected, committing...");
            runCommand('git add .');
            runCommand(`git commit -m "chore: release ${tagName}"`);
        } else {
            log(colors.green, "✨ Working directory clean (nothing to commit).");
        }
    } catch (e) {
        log(colors.red, "Error checking git status. Is this a git repository?");
        process.exit(1);
    }

    // 4. 打 Tag 并推送
    try {
        const existingTags = execSync('git tag').toString().split('\n').map(t => t.trim());
        if (existingTags.includes(tagName)) {
             log(colors.yellow, `Tag ${tagName} already exists locally, skipping creation.`);
        } else {
            runCommand(`git tag ${tagName}`);
            log(colors.green, `✅ Tag ${tagName} created.`);
        }
    } catch (e) {}

    log(colors.yellow, "Pushing to remote...");
    try {
        const currentBranch = execSync('git branch --show-current').toString().trim();
        runCommand(`git push origin ${currentBranch}`);
    } catch (e) {
        runCommand('git push origin main');
    }
    
    runCommand(`git push origin ${tagName}`);

    log(colors.green, `🎉 Release ${tagName} completed! GitHub Actions will handle packaging.`);
}

main();
