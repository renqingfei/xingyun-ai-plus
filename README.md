# 星云 AI 插件仓库

这是一个用于管理星云 AI (Xingyun AI Plus) 插件的仓库。

## 目录结构

```
/
├── releases/               # [手动维护] 存放打包好的插件 (.zip) 和 plugins.json
│   ├── plugins.json        # 插件索引文件 (版本号在此管理)
│   └── *.zip               # 插件包
└── plugins/                # 插件源码目录 (开发用)
    ├── test-plugin/        # 示例插件
    │   ├── config.json     # 插件配置文件
    │   └── ...
    └── ... (更多插件)
```

## 插件发布流程

1. **开发与打包**
   - 开发您的插件代码。
   - 手动将插件打包成 `.zip` 文件，放入 `releases/` 目录。
   - 更新 `releases/plugins.json` 文件：
     - **更新外层的 `version` 字段**（这决定了发布的 Tag 版本）。
     - **确保 `baseUrl` 正确**（通常为 `https://github.com/renqingfei/xingyun-ai-plus/releases/latest/download/`）。
     - 在 `plugins` 列表中添加插件信息，使用 `fileName` 指定对应的 zip 包名。

2. **一键发布**

## 配置说明

在使用前，请打开 `build_plugins.py` 文件，修改 `BASE_URL` 变量为你自己的 GitHub 仓库地址前缀：

```python
# build_plugins.py
BASE_URL = "https://raw.githubusercontent.com/<你的用户名>/<你的仓库名>/main/releases"
```

这样软件端才能正确下载到 `releases/` 目录下的插件包。
