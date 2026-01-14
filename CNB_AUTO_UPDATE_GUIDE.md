# CNB.cool 对接与自动更新完整指南

> 基于 MaruAudio 项目的实际实现，适用于任何需要对接 CNB.cool 实现自动更新的项目

---

## 一、平台介绍

CNB.cool 是国内的代码托管平台，类似 GitHub/GitLab，优势：
- **国内访问快**，无需代理
- 支持 Git 仓库托管
- 支持 Release 发布和文件托管
- 提供完整 API 接口

---

## 二、对接准备工作

### 2.1 注册账号
1. 访问 https://cnb.cool
2. 注册账号并登录

### 2.2 创建发布仓库
1. 创建一个新仓库，命名建议：`YourProject-Release`
2. 仓库设置为**公开**（用于版本检测和下载）

### 2.3 获取 API Token
1. 点击右上角头像 → **设置**
2. 左侧菜单 → **访问令牌**
3. 点击 **生成新令牌**
4. 权限勾选：`repo`、`write:packages`
5. 保存生成的 Token（只显示一次）

### 2.4 创建 Release 并获取 Release ID
1. 进入仓库 → **发行版** → **创建发行版**
2. 填写版本号（如 `v1.0.0`）和描述
3. 创建后，通过 API 获取 Release ID：

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Accept: application/vnd.cnb.api+json" \
     "https://api.cnb.cool/YourOrg/YourProject-Release/-/releases"
```

---

## 三、配置信息汇总

```python
# config.py - CNB.cool 配置
CNB_TOKEN = "your_api_token"                    # API Token
CNB_REPO = "YourOrg/YourProject-Release"        # 发布仓库
CNB_RELEASE_ID = "your_release_id"              # Release ID

# URL 模板
CNB_VERSION_URL = f"https://cnb.cool/{CNB_REPO}/-/git/raw/main/version.json"
CNB_RELEASES_URL = f"https://cnb.cool/{CNB_REPO}/-/releases"
CNB_API_BASE = f"https://api.cnb.cool/{CNB_REPO}"
```

---

## 四、version.json 规范

在仓库根目录创建 `version.json`：

```json
{
  "version": "1.0.0",
  "release_date": "2024-12-24",
  "download_url": "https://cnb.cool/YourOrg/YourProject-Release/-/releases/download/v1.0.0/YourApp_v1.0.0_Setup.exe",
  "changelog": "首次发布\n- 功能1\n- 功能2",
  "file_size": 0,
  "min_version": "1.0.0",
  "force_update": false
}
```

| 字段 | 类型 | 说明 |
|-----|------|------|
| version | string | 版本号，如 "1.0.0" |
| release_date | string | 发布日期，如 "2024-12-24" |
| download_url | string | 安装包下载地址 |
| changelog | string | 更新日志 |
| file_size | int | 文件大小（字节），可选 |
| min_version | string | 最低支持升级的版本 |
| force_update | bool | 是否强制更新 |

---

## 五、上传安装包脚本

### 5.1 完整脚本

```python
# upload_installer.py
# -*- coding: utf-8 -*-
"""上传安装包到 CNB.cool（带进度显示）"""
import urllib.request
import json
import time
import os
import sys
import http.client
import ssl
from pathlib import Path
from urllib.parse import urlparse

sys.stdout.reconfigure(line_buffering=True)

# ============== 配置（需要替换） ==============
TOKEN = "your_api_token"
REPO = "YourOrg/YourProject-Release"
RELEASE_ID = "your_release_id"
# =============================================

def upload_with_progress(file_path: str, asset_name: str = None) -> bool:
    """上传文件到 CNB.cool Release"""
    if asset_name is None:
        asset_name = os.path.basename(file_path)
    
    file_size = os.path.getsize(file_path)
    print(f"文件: {asset_name}")
    print(f"大小: {file_size / 1024 / 1024:.2f} MB")
    
    # ========== 步骤1: 获取上传URL ==========
    print("步骤1: 获取上传URL...")
    url = f"https://api.cnb.cool/{REPO}/-/releases/{RELEASE_ID}/asset-upload-url"
    data = json.dumps({"asset_name": asset_name, "size": file_size}).encode("utf-8")
    
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/vnd.cnb.api+json",
        "Accept": "application/vnd.cnb.api+json"
    }
    
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    resp = urllib.request.urlopen(req, timeout=30)
    result = json.loads(resp.read())
    upload_url = result.get("upload_url")
    verify_url = result.get("verify_url")
    
    # ========== 步骤2: 分块上传 ==========
    print("步骤2: 开始上传...\n")
    start_time = time.time()
    parsed = urlparse(upload_url)
    
    # 创建HTTPS连接（禁用SSL验证）
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    
    conn = http.client.HTTPSConnection(parsed.netloc, timeout=3600, context=context)
    
    chunk_size = 1024 * 1024  # 1MB
    uploaded = 0
    last_percent = -1
    
    with open(file_path, "rb") as f:
        conn.putrequest("PUT", parsed.path)
        conn.putheader("Content-Type", "application/octet-stream")
        conn.putheader("Content-Length", str(file_size))
        conn.endheaders()
        
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            conn.send(chunk)
            uploaded += len(chunk)
            
            percent = int(uploaded * 100 / file_size)
            if percent > last_percent:
                last_percent = percent
                elapsed = time.time() - start_time
                speed = uploaded / elapsed / 1024 / 1024 if elapsed > 0 else 0
                print(f"进度: {percent}% | {uploaded/1024/1024:.0f}/{file_size/1024/1024:.0f} MB | {speed:.1f} MB/s", flush=True)
    
    response = conn.getresponse()
    if response.status != 200:
        print(f"上传失败: {response.status}")
        return False
    
    conn.close()
    elapsed = time.time() - start_time
    print(f"\n上传完成! 耗时: {elapsed:.1f}秒")
    
    # ========== 步骤3: 确认上传 ==========
    print("步骤3: 确认上传...")
    req = urllib.request.Request(verify_url, data=b"", headers=headers, method="POST")
    urllib.request.urlopen(req, timeout=30)
    print("上传确认成功!")
    return True


if __name__ == "__main__":
    # 查找安装包（根据项目调整路径和文件名模式）
    dist_dir = Path("packaging/output/dist")
    installer = None
    for f in dist_dir.glob("*Setup*.exe"):
        installer = f
        break
    
    if installer:
        print(f"找到安装包: {installer.name}")
        upload_with_progress(str(installer), installer.name)
    else:
        print("未找到安装包!")
```

### 5.2 上传流程说明

| 步骤 | API | 说明 |
|-----|-----|------|
| 1. 获取上传URL | `POST /releases/{release_id}/asset-upload-url` | 返回 `upload_url` 和 `verify_url` |
| 2. 上传文件 | `PUT {upload_url}` | 分块上传文件内容 |
| 3. 确认上传 | `POST {verify_url}` | 确认上传完成 |

---

## 六、自动更新检测模块

### 6.1 完整模块

```python
# backend/utils/updater.py
# -*- coding: utf-8 -*-
"""自动更新模块 - 检查更新、下载更新包、应用更新"""
import os
import sys
import json
import tempfile
import subprocess
import time
from typing import Optional, Callable, Tuple
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ============== 配置（需要替换） ==============
CNB_REPO = "YourOrg/YourProject-Release"
CNB_VERSION_URL = f"https://cnb.cool/{CNB_REPO}/-/git/raw/main/version.json"
CNB_RELEASES_URL = f"https://cnb.cool/{CNB_REPO}/-/releases"
# =============================================


class UpdateInfo:
    """更新信息"""
    def __init__(self, data: dict):
        self.version = data.get("version", "")
        self.release_date = data.get("release_date", "")
        self.download_url = data.get("download_url", "")
        self.changelog = data.get("changelog", "")
        self.file_size = data.get("file_size", 0)
        self.min_version = data.get("min_version", "")
        self.force_update = data.get("force_update", False)


def get_version() -> str:
    """获取当前版本号（根据项目调整）"""
    return "1.0.0"


def parse_version(v: str) -> tuple:
    """解析版本号为元组"""
    try:
        parts = [int(x) for x in v.split(".")]
        while len(parts) < 3:
            parts.append(0)
        return tuple(parts)
    except:
        return (0, 0, 0)


def is_newer_version(remote: str, local: str) -> bool:
    """判断远程版本是否更新"""
    return parse_version(remote) > parse_version(local)


class AutoUpdater:
    """自动更新器"""
    
    def __init__(self):
        self.current_version = get_version()
        self._update_info: Optional[UpdateInfo] = None
    
    def check_update(self, timeout: int = 5) -> Tuple[bool, Optional[UpdateInfo], str]:
        """
        检查是否有新版本
        
        Returns:
            (has_update, update_info, error_message)
        """
        print(f"检查更新: 当前版本 {self.current_version}")
        
        try:
            response = requests.get(CNB_VERSION_URL, timeout=timeout, verify=False)
            
            if response.status_code == 200:
                data = response.json()
                self._update_info = UpdateInfo(data)
                
                print(f"检查更新: 远程版本 {self._update_info.version}")
                
                if is_newer_version(self._update_info.version, self.current_version):
                    print(f"检查更新: 发现新版本 {self._update_info.version}")
                    return True, self._update_info, ""
                else:
                    print("检查更新: 已是最新版本")
                    return False, None, ""
            else:
                return False, None, f"HTTP {response.status_code}"
                
        except requests.exceptions.Timeout:
            return False, None, "请求超时"
        except Exception as e:
            return False, None, f"检查失败: {e}"
    
    def download_update(
        self,
        update_info: UpdateInfo,
        progress_callback: Optional[Callable[[int, str], None]] = None
    ) -> Tuple[bool, str]:
        """
        下载更新包
        
        Args:
            update_info: 更新信息
            progress_callback: 进度回调 (percent, status)
        
        Returns:
            (success, file_path_or_error)
        """
        download_url = update_info.download_url
        if not download_url:
            return False, "下载地址为空"
        
        # 创建临时目录
        temp_dir = tempfile.mkdtemp(prefix="update_")
        filename = f"Setup_v{update_info.version}.exe"
        download_path = os.path.join(temp_dir, filename)
        
        try:
            if progress_callback:
                progress_callback(0, "正在连接服务器...")
            
            response = requests.get(download_url, stream=True, timeout=60, verify=False)
            response.raise_for_status()
            
            total_size = int(response.headers.get("content-length", 0))
            downloaded = 0
            start_time = time.time()
            
            with open(download_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=65536):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        if total_size > 0 and progress_callback:
                            percent = int(downloaded * 100 / total_size)
                            elapsed = time.time() - start_time
                            speed = downloaded / elapsed / 1024 / 1024 if elapsed > 0 else 0
                            progress_callback(
                                percent,
                                f"已下载 {downloaded/1024/1024:.1f} MB / {total_size/1024/1024:.1f} MB ({speed:.1f} MB/s)"
                            )
            
            if progress_callback:
                progress_callback(100, "下载完成")
            
            return True, download_path
            
        except Exception as e:
            return False, f"下载失败: {e}"
    
    def apply_update(self, installer_path: str) -> Tuple[bool, str]:
        """
        应用更新（运行安装程序）
        
        Returns:
            (success, message)
        """
        try:
            if not os.path.exists(installer_path):
                return False, "安装程序不存在"
            
            # 启动安装程序
            subprocess.Popen(
                [installer_path],
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            )
            
            return True, "安装程序已启动，请按照提示完成更新"
            
        except Exception as e:
            return False, f"启动安装程序失败: {e}"
    
    def get_changelog_url(self) -> str:
        """获取更新日志URL"""
        return CNB_RELEASES_URL


# 全局实例
_updater = None

def get_updater() -> AutoUpdater:
    """获取全局更新器实例"""
    global _updater
    if _updater is None:
        _updater = AutoUpdater()
    return _updater
```

---

## 七、UI 集成示例（PySide6/PyQt）

```python
# frontend/components/update_checker.py
from PySide6.QtCore import QThread, Signal
from backend.utils.updater import get_updater, UpdateInfo


class UpdateCheckWorker(QThread):
    """后台检查更新线程"""
    finished = Signal(bool, object, str)  # has_update, update_info, error
    
    def run(self):
        updater = get_updater()
        has_update, info, error = updater.check_update()
        self.finished.emit(has_update, info, error)


class UpdateDownloadWorker(QThread):
    """后台下载更新线程"""
    progress = Signal(int, str)  # percent, status
    finished = Signal(bool, str)  # success, path_or_error
    
    def __init__(self, update_info: UpdateInfo):
        super().__init__()
        self.update_info = update_info
    
    def run(self):
        updater = get_updater()
        success, result = updater.download_update(
            self.update_info,
            progress_callback=lambda p, s: self.progress.emit(p, s)
        )
        self.finished.emit(success, result)


# 在主窗口中使用
class MainWindow:
    def __init__(self):
        # 启动时检查更新
        self._check_update()
    
    def _check_update(self):
        self._update_worker = UpdateCheckWorker()
        self._update_worker.finished.connect(self._on_update_checked)
        self._update_worker.start()
    
    def _on_update_checked(self, has_update, info, error):
        if has_update:
            # 显示更新对话框
            self._show_update_dialog(info)
        self._update_worker = None
    
    def _show_update_dialog(self, info: UpdateInfo):
        # 显示更新提示，用户确认后下载
        pass
```

---

## 八、完整发布流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      完整发布流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  开发阶段                                                        │
│  ├── 1. 修改代码                                                 │
│  ├── 2. 更新 version.py 中的版本号                               │
│  └── 3. 提交代码到 GitHub                                        │
│                                                                 │
│  打包阶段                                                        │
│  ├── 4. 运行打包脚本生成安装包                                    │
│  └── 5. 安装包位于 packaging/output/dist/                        │
│                                                                 │
│  发布阶段                                                        │
│  ├── 6. 运行 upload_installer.py 上传安装包到 CNB.cool           │
│  ├── 7. 修改 version.json（版本号、下载链接、更新日志）            │
│  └── 8. 推送 version.json 到 CNB.cool 仓库                       │
│                                                                 │
│  用户端                                                          │
│  ├── 9. 应用启动时调用 check_update() 检测新版本                  │
│  ├── 10. 发现新版本后提示用户                                     │
│  ├── 11. 用户确认后调用 download_update() 下载                    │
│  └── 12. 下载完成后调用 apply_update() 运行安装程序               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 九、API 速查表

| 操作 | 方法 | URL |
|-----|------|-----|
| 获取上传URL | POST | `https://api.cnb.cool/{repo}/-/releases/{release_id}/asset-upload-url` |
| 上传文件 | PUT | `{upload_url}` (从上一步返回) |
| 确认上传 | POST | `{verify_url}` (从第一步返回) |
| 获取版本信息 | GET | `https://cnb.cool/{repo}/-/git/raw/main/version.json` |
| 获取Releases | GET | `https://api.cnb.cool/{repo}/-/releases` |

**请求头模板**：
```python
headers = {
    "User-Agent": "Mozilla/5.0",
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/vnd.cnb.api+json",
    "Accept": "application/vnd.cnb.api+json"
}
```

---

## 十、注意事项

1. **SSL 验证**：CNB.cool 可能需要禁用 SSL 验证（`verify=False`）
2. **超时设置**：大文件上传建议设置较长超时（3600秒）
3. **分块上传**：建议使用 1MB 分块，显示进度
4. **国内访问**：CNB.cool 国内访问快，无需代理
5. **Token 安全**：不要将 Token 提交到公开仓库

---

## 十一、快速开始清单

- [ ] 注册 CNB.cool 账号
- [ ] 创建发布仓库（公开）
- [ ] 获取 API Token
- [ ] 创建 Release 并获取 ID
- [ ] 创建 version.json
- [ ] 配置上传脚本
- [ ] 集成更新检测模块
- [ ] 测试完整流程

---

*文档生成时间：2024-12-24*
*基于 MaruAudio 项目实现*
