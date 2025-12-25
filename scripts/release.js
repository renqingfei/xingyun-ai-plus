const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
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

function main() {
    log(colors.green, "🚀 Starting release process...");

    // 1. 读取版本号
    if (!fs.existsSync(PLUGINS_JSON_PATH)) {
        log(colors.red, `Error: Could not find ${PLUGINS_JSON_PATH}`);
        process.exit(1);
    }

    const pluginsConfig = JSON.parse(fs.readFileSync(PLUGINS_JSON_PATH, 'utf-8'));
    const version = pluginsConfig.version;

    if (!version) {
        log(colors.red, "Error: 'version' field not found in plugins.json");
        process.exit(1);
    }

    const tagName = `v${version}`;
    log(colors.yellow, `📦 Target Version: ${tagName}`);

    // 2. 检查 Git 状态
    try {
        const status = execSync('git status --porcelain').toString();
        if (status) {
            log(colors.yellow, "Changes detected, committing...");
            runCommand('git add .');
            runCommand(`git commit -m "chore: release ${tagName}"`);
        } else {
            log(colors.green, "✨ Working directory clean.");
        }
    } catch (e) {
        log(colors.red, "Error checking git status. Is this a git repository?");
        process.exit(1);
    }

    // 3. 检查 Tag 是否存在
    try {
        const existingTags = execSync('git tag').toString().split('\n');
        if (existingTags.includes(tagName)) {
            log(colors.red, `Error: Tag ${tagName} already exists! Please update version in releases/plugins.json`);
            process.exit(1);
        }
    } catch (e) {
        // Ignore error if no tags exist
    }

    // 4. 打 Tag 并推送
    runCommand(`git tag ${tagName}`);
    log(colors.green, `✅ Tag ${tagName} created.`);

    log(colors.yellow, "Pushing to remote...");
    runCommand('git push origin main'); // 假设主分支是 main，如果是 master 请修改
    runCommand(`git push origin ${tagName}`);

    log(colors.green, `🎉 Release ${tagName} completed successfully!`);
    log(colors.green, "GitHub Actions should now trigger the release workflow.");
}

main();
