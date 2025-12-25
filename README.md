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

## 插件开发流程

1. **创建插件**
   在 `plugins/` 目录下创建一个新的文件夹（例如 `my-plugin`），并在其中添加 `config.json` 和你的代码文件。

   `config.json` 示例：
   ```json
   {
     "id": "my-plugin",
     "version": "1.0.0",
     "name": "我的插件",
     "description": "这是一个很棒的插件",
     "type": "tool",
     "exe": "main.py"
   }
   ```

2. **打包与更新索引**
   在根目录下运行构建脚本：
   ```bash
   python build_plugins.py
   ```
   该脚本会：
   - 将 `plugins/` 下的每个插件打包成 `.zip` 文件存放到 `releases/` 目录。
  - 自动扫描所有插件信息，更新 `releases/plugins.json`。

3. **发布**
   将所有更改提交到 GitHub：
   ```bash
   git add .
   git commit -m "Add new plugin: my-plugin"
   git push
   ```

## 配置说明

在使用前，请打开 `build_plugins.py` 文件，修改 `BASE_URL` 变量为你自己的 GitHub 仓库地址前缀：

```python
# build_plugins.py
BASE_URL = "https://raw.githubusercontent.com/<你的用户名>/<你的仓库名>/main/releases"
```

这样软件端才能正确下载到 `releases/` 目录下的插件包。
