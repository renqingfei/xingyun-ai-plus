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

function incrementVersion(version) {
    const parts = version.split('.').map(Number);
    if (parts.length < 3) {
        // 简单处理非语义化版本
        return version + ".1";
    }
    // 增加 Patch 版本
    parts[parts.length - 1] += 1;
    return parts.join('.');
}

function main() {
    log(colors.green, "🚀 Starting release process...");

    // 1. 读取版本号
    if (!fs.existsSync(PLUGINS_JSON_PATH)) {
        log(colors.red, `Error: Could not find ${PLUGINS_JSON_PATH}`);
        process.exit(1);
    }

    let pluginsConfig = JSON.parse(fs.readFileSync(PLUGINS_JSON_PATH, 'utf-8'));
    let version = pluginsConfig.version;

    if (!version) {
        log(colors.red, "Error: 'version' field not found in plugins.json");
        process.exit(1);
    }

    // 2. 自动检测并递增版本号
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
    } catch (e) {
        // Ignore error if no tags exist or git command fails (will be caught later)
    }

    if (isVersionUpdated) {
        log(colors.green, `✨ New version resolved: ${version}`);
        // 更新 plugins.json
        pluginsConfig.version = version;
        // 更新 lastUpdated
        pluginsConfig.lastUpdated = new Date().toISOString().split('T')[0];
        
        fs.writeFileSync(PLUGINS_JSON_PATH, JSON.stringify(pluginsConfig, null, 2), 'utf-8');
        log(colors.green, `Updated ${PLUGINS_JSON_PATH}`);
    } else {
        log(colors.yellow, `📦 Using existing version from file: ${tagName}`);
    }

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

    // 4. 双重检查 Tag (理论上上面已经处理了，但为了安全)
    try {
        const existingTags = execSync('git tag').toString().split('\n').map(t => t.trim());
        if (existingTags.includes(tagName)) {
            log(colors.red, `Error: Tag ${tagName} already exists locally! Unexpected state.`);
            process.exit(1);
        }
    } catch (e) {}

    // 5. 打 Tag 并推送
    runCommand(`git tag ${tagName}`);
    log(colors.green, `✅ Tag ${tagName} created.`);

    log(colors.yellow, "Pushing to remote...");
    // 尝试推送到当前分支
    try {
        const currentBranch = execSync('git branch --show-current').toString().trim();
        runCommand(`git push origin ${currentBranch}`);
    } catch (e) {
        log(colors.yellow, "Could not determine current branch, trying 'main'...");
        runCommand('git push origin main');
    }
    
    runCommand(`git push origin ${tagName}`);

    log(colors.green, `🎉 Release ${tagName} completed successfully!`);
    log(colors.green, "GitHub Actions should now trigger the release workflow.");
}

main();
