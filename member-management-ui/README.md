# Member Management UI（Remix + shadcn 风格）— 基础原型

这是一套“会员端 + 后台管理台”同项目（single-app）的 UI 骨架，覆盖你提出的核心功能：
- Google 登录（目前为 **UI 模拟登录**，方便先把界面与流程跑通）
- 会员资料（头像/名字/电话/email/性别/生日/会员编号/到期日）
- 会员付费（RM3888，支付方式 UI 占位：FPX / Credit Card / DuitNow / TNG eWallet）
- 无限预约拍摄（带规则提示：7 天间隔、最多 2 小时、名额满提示）
- 照片档案（上传/下载/水印/选精修的 UI 框架）
- 通知中心 + 通知设置
- Admin 后台：Bookings / Rules & Capacity / Members / Photos / Payments

> 说明：由于这里无法从 npm registry 拉取依赖，本项目在你本机运行时需要联网安装依赖。

---

## 1) 本机启动（推荐 pnpm / npm）

```bash
cd member-management-ui
npm install
npm run dev
```

> 如果你遇到 `Cannot find package '~'` 的报错：请确认项目根目录存在 `vite.config.ts`，并且里面把 `~` alias 指向 `./app`（本仓库已补齐该配置）。
> 另外请确认 `app/root.tsx` 里引入 tailwind 样式用的是 **相对路径**：`import stylesUrl from \"./styles/tailwind.css?url\";`（避免 `~` alias 在产物里残留）。

启动后：
- 会员端：`/app`
- 后台：`/admin`
- 健康检查：`/healthz`

---

## 2) AWS t2.micro（Docker）部署（PoC）
> 适用：你要把 PoC 跑在一台 EC2 上，并用 GitHub Actions 自动化部署（ECR + EC2 拉取）。

### 2.1 先准备 AWS（ap-southeast-1）
1. 创建一台 EC2（Ubuntu 22.04 / t2.micro），安全组放行：
   - 入站：`22`（你的 IP）、`80`（对外访问）
2. EC2 上安装：Docker / docker compose
3. 创建 ECR 仓库：`member-management-ui`

> t2.micro 内存很小，建议在 EC2 上加 1–2GB swap，避免 build/启动时 OOM。

### 2.2 EC2 上初始化目录（只做一次）
在 EC2 执行：
```bash
sudo mkdir -p /opt/member-management-ui/data/demo-uploads
sudo touch /opt/member-management-ui/data/.demo-store.json
sudo chmod 666 /opt/member-management-ui/data/.demo-store.json
```

### 2.3 GitHub Actions Secrets
仓库 Settings → Secrets and variables → Actions，添加：
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ACCOUNT_ID`
- `SESSION_SECRET`（随机长字符串）
- `EC2_HOST`（EC2 公网 IP）
- `EC2_USER`（一般是 `ubuntu`）
- `EC2_SSH_PRIVATE_KEY`（用于部署的私钥）

### 2.4 自动部署
本仓库已提供：
- `docker-compose.prod.yml`（EC2 运行用，镜像来自 ECR）
- `.github/workflows/deploy-ec2.yml`（push main 自动部署）

### Demo 数据说明（PoC 友好）
- 本项目现在带一个 **JSON 持久化的 demo 数据层**（用于本地演示流程）
- 数据文件：项目根目录下的 `.demo-store.json`（已加入 `.gitignore`）
- 你可以通过“会员端 /app/membership → Pay now（Demo）”激活会员，再到 “/app/booking” 进行预约；后台 `/admin/*` 会同步展示预约/支付/规则

### 建议的“完整 PoC 演示流程”（5-10 分钟）
1. `/login`：选择 Member Demo 登录（或 Admin Demo 登录）
2. 会员端 `/app/membership`：点击 **Pay now（Demo）** → 会员变为 active（并生成一条支付通知）
3. 会员端 `/app/booking`：选择日期/影棚/摄影师/时段 → 提交预约  
   - 会触发规则校验（会员需 active、7 天间隔、2 小时上限、名额满）  
   - 成功后生成一条预约通知；后台 `/admin/bookings` 也会看到新预约
4. 后台 `/admin/photos`：在对应 booking 点击 **Deliver（Demo）** → 生成相册 + 12 张占位图（并通知会员“照片已上传”）
5. 会员端 `/app/photos`：进入相册 → 勾选 **最多 5 张** → Submit retouch request（生成“精修已提交”通知）
6. 后台 `/admin/photos`：对该相册点击 **Mark retouch done（Demo）**（生成“精修完成”通知）
7. 会员端 `/app/notifications`：查看通知流（支付/预约/照片/精修），可 Mark read

---

## 2) shadcn/ui（可选增强）

本项目内置了一组“shadcn 风格的最小组件”（Button/Card/Input/Badge/Avatar 等），不依赖 shadcn CLI 也能跑起来。

如果你想完全用 shadcn CLI 管理组件，可在本机执行：

```bash
npx shadcn@latest init
npx shadcn@latest add button card input label badge avatar separator table
```

然后把页面里对组件的 import 指向 shadcn 生成的路径即可（默认会在 `app/components/ui/*`）。

---

## 3) 语言与地区（MY/SG/TH）

- 当前内置中英双语（Cookie `lang=zh|en`）
- 后续可在 `app/lib/i18n.ts` 增加 `th` 字典并扩展 UI 切换
- 预约默认按“摄影棚所在地时区”显示（目前 UI 层占位）

---

## 4) 下一步建议

当你准备接真实后端时，建议优先接入：
1) Google OAuth（Remix Auth 或自建 OAuth 回调）
2) 支付 provider（MY：iPay88/Billplz/ToyyibPay/Stripe；SG/TH：Stripe + 本地扩展）
3) 预约规则引擎（后端校验 + 规则拒绝原因返回前端）
4) 照片存储（S3/GCS）+ 异步水印/缩略图
