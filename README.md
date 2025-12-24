# 星云AI插件市场

这是星云AI的官方插件仓库，软件通过此仓库获取可用插件列表。

## 获取插件列表

软件端通过以下地址获取插件索引：
```
https://raw.githubusercontent.com/renqingfei/xingyun-ai-plugins/main/plugins.json
```

## 仓库结构

```
xingyun-ai-plugins/
├── plugins.json          # 插件索引文件
├── README.md             # 本文档
└── plugins/              # 插件zip包存放目录
    ├── plugin-a-1.0.0.zip
    ├── plugin-b-2.0.0.zip
    └── ...
```

## plugins.json 格式

```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-12-24",
  "plugins": [
    {
      "id": "plugin-id",
      "name": "插件名称",
      "version": "1.0.0",
      "type": "image",
      "description": "插件描述",
      "author": "作者",
      "downloadUrl": "https://raw.githubusercontent.com/.../plugins/xxx.zip"
    }
  ]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| id | 是 | 插件唯一标识，需与zip包内config.json的id一致 |
| name | 是 | 插件显示名称 |
| version | 是 | 版本号，用于检测更新 |
| type | 是 | 类型：`image`、`video` 或 `image,video` |
| description | 否 | 插件描述 |
| author | 否 | 作者名称 |
| downloadUrl | 是 | zip包的下载地址 |

---

# 插件开发与使用指南

## 插件管理页面功能

应用内置插件管理系统，支持以下功能：

### 添加插件
- **手动添加**：点击"添加插件"按钮，填写插件名称、类型（生成图片/视频）、主机地址、端口等信息
- **导入插件包**：点击"导入插件包(.zip)"，选择符合规范的 ZIP 压缩包自动解析并导入
- **插件市场**：点击"插件市场"，浏览云端插件列表，一键安装或更新

### 插件卡片
每个插件以卡片形式展示，包含：
- **基本信息**：插件名称、版本号、类型标签（生成图片/视频）
- **连接信息**：主机地址、端口
- **运行状态**：本地插件显示"运行中"或"已停止"状态
- **更新提示**：已安装插件如有新版本会显示提示

### 插件操作
- **启动/停止**：本地插件可一键启动或停止服务进程
- **编辑**：修改插件配置（名称、类型、地址、端口、启动参数等）
- **删除**：移除不需要的插件

### 插件市场
- 自动从云端获取可用插件列表
- 显示插件名称、版本、类型、描述
- 对比本地版本，提示"未安装"、"已安装"或"可更新"
- 一键安装或更新插件

---

## 发布插件到插件市场

如果你开发了一个插件并希望发布到插件市场，需要：

### 1. 准备插件包
按照下方"插件打包指南"制作 ZIP 压缩包，确保 `config.json` 中包含唯一的 `id` 和正确的 `version`。

### 2. 上传插件包
将 ZIP 文件上传到可公开访问的地址（如 GitHub Releases、云存储等），获取下载链接。

### 3. 提交到插件仓库
向插件仓库 [xingyun-ai-plugins](https://github.com/renqingfei/xingyun-ai-plugins) 提交 PR，在 `plugins.json` 中添加你的插件信息：

```json
{
  "id": "your-plugin-id",
  "name": "插件名称",
  "version": "1.0.0",
  "type": "image",
  "description": "插件功能描述",
  "downloadUrl": "https://your-download-url/plugin.zip"
}
```

### 字段说明
| 字段 | 必填 | 说明 |
|------|------|------|
| id | 是 | 插件唯一标识，需与 config.json 中的 id 一致 |
| name | 是 | 插件显示名称 |
| version | 是 | 版本号，用于检测更新 |
| type | 是 | 类型：`image`、`video` 或 `image,video` |
| description | 否 | 插件描述，显示在市场列表中 |
| downloadUrl | 是 | ZIP 包的公开下载地址 |

---

## 插件打包指南

要制作一个可导入的插件包（.zip），请遵循以下结构：

## 1. 文件结构
压缩包根目录应包含：
- `config.json` (必须)
- `你的程序.exe` (必须，主程序入口)
- 其他依赖文件或文件夹

## 2. config.json 字段说明

```json
{
  "id": "plugin-sample",       // [必填] 插件唯一标识符
  "version": "1.0.0",          // [必填] 插件版本号
  "name": "我的AI绘图插件",      // [必填] 在界面上显示的名称
  "type": "image,video",       // [必填] 类型：'image' (生图)、'video' (生视频) 或 'image,video' (同时支持)
  "host": "http://127.0.0.1",  // [必填] 服务启动后的访问地址
  "port": 7860,                // [必填] 服务端口
  "exe": "start_app.exe",      // [必填] 可执行文件的名称
  "params": ["--api-mode", "--listen"],  // [可选] 启动时的命令行参数
  "description": "这是一个使用SD WebUI的插件示例",  // [可选] 插件描述
  "options": [...]             // [可选] 用户可配置的选项，详见下方
}
```

## 3. options 配置项说明

`options` 数组用于定义用户可在界面上配置的参数，支持以下类型：

### select (下拉选择)
```json
{
  "key": "style",
  "label": "风格",
  "type": "select",
  "default": "realistic",
  "placeholder": "请选择风格",
  "options": [
    { "label": "写实", "value": "realistic" },
    { "label": "动漫", "value": "anime" },
    { "label": "油画", "value": "oil" },
    { "label": "水彩", "value": "watercolor" }
  ]
}
```

### number (数字输入)
```json
{
  "key": "quality",
  "label": "图片质量",
  "type": "number",
  "default": 80,
  "placeholder": "输入1-100之间的数值"
}
```

### boolean (开关)
```json
{
  "key": "enableHD",
  "label": "启用高清模式",
  "type": "boolean",
  "default": false
}
```

### text (文本输入)
```json
{
  "key": "negativePrompt",
  "label": "负面提示词",
  "type": "text",
  "default": "",
  "placeholder": "输入不想出现的内容，如：模糊, 低质量"
}
```

## 4. 打包方式
选中所有文件（config.json, exe等），右键 -> 发送到 -> 压缩(zipped)文件夹。
**注意**：请直接压缩文件，不要把它们放在一个文件夹里再压缩文件夹，虽然系统也支持自动查找一层子目录，但直接压缩文件最稳妥。
