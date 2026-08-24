# Askroom 匿名提問教學平台

Askroom 是一個給課堂使用的匿名提問平台。學生使用帳號登入後加入課程、匿名送出問題；管理員可以管理課程、查看提問、查看傳送 IP 並回覆問題。

## 功能簡介

- 管理員與使用者分開入口
- 管理員帳號密碼登入
- 使用者帳號密碼登入，同一裝置可自動登入
- 使用者忘記密碼與更改密碼
- 建立、刪除課程與隱私課程密碼
- 使用課程代碼加入課程
- 管理員刪除單一提問
- 管理員查看提問傳送 IP 並回覆
- 課程可設定是否開放老師回覆
- 課程可設定是否開放照片與檔案上傳
- 跨瀏覽器分頁同步課程、提問與回覆通知
- Vite + React 前端搭配 Node API 與 PostgreSQL，共享課程、帳號與提問資料

## 本機啟動

需要 Node.js 18 或更新版本。

```bash
npm install
npm run dev
```

開啟：

- 使用者入口：`http://localhost:5173/?view=user`
- 管理員入口：`http://localhost:5173/?view=admin`

## 管理員環境變數

管理員帳密使用 Vite build-time 環境變數：

```env
VITE_ADMIN_ACCOUNT=admin
VITE_ADMIN_PASSWORD=change-this-password
```

可複製 `.env.example` 為 `.env` 後使用。`.env` 不應提交到 Git。

注意：Vite 的 `VITE_` 變數會被打包到瀏覽器，因此這是展示版登入設定，不是安全的後端認證。正式環境應將登入驗證移到後端 API，密碼也應使用雜湊保存。

## Render 部署

本專案包含 `render.yaml`，使用 Render Web Service 與 PostgreSQL：

- Build Command：`npm install && npm run build`
- Start Command：`npm start`
- Node 服務會發布 `dist`，並處理 SPA fallback
- PostgreSQL 透過 `DATABASE_URL` 連接

部署步驟：

1. 將 GitHub repository 連接到 Render。
2. Render 讀取 repository 根目錄的 `render.yaml`，建立 Web Service 與 PostgreSQL。
3. 在 Render Environment 設定 `VITE_ADMIN_ACCOUNT` 與 `VITE_ADMIN_PASSWORD`。
4. 部署完成後，使用 Render 提供的網址開啟平台。

課程、使用者和提問會儲存在 PostgreSQL，因此不同手機與瀏覽器會讀到同一份資料。每次修改管理員環境變數後都需要重新部署，因為它們會在 build 時寫入前端 bundle。

## GitHub

Repository：<https://github.com/pika7766/askroom>

```bash
git add .
git commit -m "Prepare Askroom for Render deployment"
git push -u origin main
```
