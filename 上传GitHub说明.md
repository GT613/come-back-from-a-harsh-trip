# 上传 GitHub Pages

## 最简单的上传方法

1. 在 GitHub 新建一个公开仓库。
2. 进入仓库后选择 **Add file → Upload files**。
3. 将本目录中的全部文件和 `assets` 文件夹上传到仓库根目录。不要只上传外层文件夹。
4. 打开仓库 **Settings → Pages**。
5. 在 **Build and deployment** 中选择 **Deploy from a branch**。
6. Branch 选择 `main`，目录选择 `/ (root)`，然后保存。
7. 等待一至数分钟，GitHub 会显示游戏网址。

## 正确的仓库结构

```text
仓库根目录/
├─ index.html
├─ game.js
├─ style.css
├─ .nojekyll
├─ README.md
├─ ROADMAP.md
├─ 上传GitHub说明.md
└─ assets/
   ├─ 人物与背景 WebP 图片
   └─ 两首 MP3 配乐
```

游戏不需要服务器、数据库或安装依赖。所有进度保存在玩家自己的浏览器中。

如果直接双击 `index.html`，大多数功能可以运行；正式分享时应使用 GitHub Pages 地址，以获得稳定的音乐加载和本地存档支持。
