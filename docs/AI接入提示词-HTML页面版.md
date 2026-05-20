# 以下内容可直接复制发送给 AI 工具

---

请帮我将一个纯 HTML 页面接入统一登录鉴权 SDK。该页面是独立的 `.html` 文件，没有 React/Vue 等框架。

## SDK 信息

- CDN 地址：`https://cdn.jsdelivr.net/gh/yycheng9264-glitch/Auth-SDK/dist/auth-sdk.umd.js`
- 全局变量：`AuthSDK`
- 入口 API：`AuthSDK.create(config)` → `auth.guard()` → `auth.logout()`
- 鉴权模式：Web 模式（用户在登录弹窗输入 appId + appSecret，换取 token）

## 接入要求

1. 创建 `config.js` 配置文件，存放鉴权中心地址
2. 在 `</body>` 之前依次引入 `config.js` 和 UMD 文件
3. 页面加载时调用 `auth.guard()`，鉴权通过后显示业务内容（业务内容初始 `display: none`）
4. 在页面右上角添加退出登录按钮

## 参考代码

### 创建 config.js（存放环境相关配置）

```js
// config.js — 鉴权配置，按环境修改这里的地址即可
window.AUTH_CONFIG = {
  authCenterUrl: "https://test-api.songtsam.com",
};
```

### 改造 index.html

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>业务系统</title>
  <style>
    /* 业务内容初始隐藏，鉴权通过后显示 */
    #app {
      display: none;
      max-width: 800px;
      margin: 60px auto;
      padding: 0 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    #loading {
      text-align: center;
      margin-top: 80px;
      color: #999;
      font-family: sans-serif;
    }

    .logout-btn {
      position: fixed;
      top: 16px;
      right: 16px;
      padding: 6px 20px;
      background: #ff4d4f;
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      z-index: 1000;
    }
    .logout-btn:hover {
      background: #ff7875;
    }
  </style>
</head>
<body>
  <div id="loading">加载中，请稍候...</div>

  <div id="app">
    <button class="logout-btn" id="logoutBtn">退出登录</button>
    <h1>业务系统</h1>
    <p>鉴权已通过，以下是业务内容</p>
  </div>

  <!-- 注意顺序：先加载 config.js，再加载 SDK -->
  <script src="./config.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/yycheng9264-glitch/Auth-SDK/dist/auth-sdk.umd.js"></script>
  <script>
    const auth = AuthSDK.create({
      mode: "web",
      authCenterUrl: window.AUTH_CONFIG.authCenterUrl,
      loginUI: "fullscreen",
    });

    auth.guard()
      .then(() => {
        document.getElementById("loading").style.display = "none";
        document.getElementById("app").style.display = "block";
      })
      .catch(() => {
        document.getElementById("loading").textContent = "已取消登录";
      });

    document.getElementById("logoutBtn").addEventListener("click", () => {
      auth.logout();
      window.location.reload();
    });
  </script>
</body>
</html>
```

## 改动清单

| 文件 | 改动 |
|------|------|
| `config.js` | 新建，存放 `authCenterUrl` 配置 |
| `index.html` | 引入 config.js + SDK UMD，调用 guard()，加退出登录按钮 |

## 环境切换

需要切换环境时，只改 `config.js` 里的地址即可，业务 HTML 文件不用动：

```js
// 测试环境
window.AUTH_CONFIG = { authCenterUrl: "https://test-api.songtsam.com" };

// 生产环境
window.AUTH_CONFIG = { authCenterUrl: "https://正式环境地址.com" };
```
