# 社内端末管理システム

社内のスマートフォン・タブレット等の貸出・予約を一元管理する Web アプリケーション。  
実務で利用する社内ツールとして、UX と保守性を意識して設計・開発しました。

---

## 主な機能

- **端末予約** — クイック予約（15分〜2時間）と日時指定予約に対応。スケジュール競合を自動チェック
- **リアルタイム更新** — 10秒ごとに使用状況を自動取得し、空き・使用中・予約済みをリスト表示
- **ロールベースアクセス制御** — 一般ユーザー / 管理者 / システム管理者の3段階で機能を制限
- **管理画面** — 端末・ユーザー・使用ログの管理（管理者以上のみ）
- **パスワードリセット** — メール送信によるリセットフロー

---

## 技術スタック

### フロントエンド

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 15 (App Router) / TypeScript |
| アーキテクチャ | Feature-Sliced Design (FSD) |
| スタイリング | Tailwind CSS v4 |
| サーバー状態管理 | TanStack Query v5 |
| HTTP クライアント | Axios |

### バックエンド / インフラ

| カテゴリ | 技術 |
|---|---|
| API サーバー | Laravel 12 (REST API) / Laravel Sanctum |
| データベース | MySQL 8.0 |
| 開発環境 | Docker / Docker Compose |

---

## フロントエンドアーキテクチャ（FSD）

スケールしやすいコードベースを目指し、**Feature-Sliced Design** を採用しました。

```
src/
├── app/        # Next.js App Router（ルーティング定義のみ。ロジックは持たない）
├── views/      # ページ単位の組立層（widgets / features を組み合わせる）
├── widgets/    # 複数の features をまとめた自己完結型 UI ブロック
├── features/   # ユーザー操作に紐づくビジネスロジック（auth, reservation）
├── entities/   # ビジネスエンティティの UI（DeviceCard など）
└── shared/     # 全層から参照できる共通インフラ（api client, 型定義）
```

### 採用の背景と意図

通常の Next.js プロジェクトでは `components/` や `hooks/` というディレクトリで管理されることが多く、規模が大きくなるにつれてどのコンポーネントがどの機能に属するか曖昧になりがちです。

FSD では **「どの層がどの層に依存できるか」を明確なルール**で定義するため、

- 依存の方向が一方向になり、循環参照が起きにくい
- 機能の追加・削除時の影響範囲がわかりやすい
- `app/` はルーティングのみに徹することで、Next.js の仕様変更への耐性を高める

という利点を意識して設計しました。

### 認証フロー

```
Cookie(auth_token) → SessionStorage キャッシュ → /api/auth/me でバックグラウンド検証
```

ページロード時にキャッシュがあれば即座に UI を表示し、バックグラウンドでトークンを検証することで、**UX を損なわずにセキュリティを担保**しています。401 エラー時は Axios インターセプターが自動でサインアウト処理を行います。

---

## セットアップ

### 前提条件

- Docker Desktop が起動済みであること

### 起動手順

```bash
git clone <repository-url>
cd device_management_system

# コンテナ起動
docker compose up -d

# DB セットアップ（初回のみ）
docker compose exec backend php artisan migrate
docker compose exec backend php artisan db:seed
```

| サービス | URL |
|---|---|
| フロントエンド | http://localhost:3005 |
| バックエンド API | http://localhost:8005/api |
| phpMyAdmin | http://localhost:8080 |

### テストアカウント

| メールアドレス | パスワード | 権限 |
|---|---|---|
| system@example.com | password | システム管理者 |
| admin@example.com | password | 管理者 |
| user@example.com | password | 一般ユーザー |

---

## 権限マトリクス

| 機能 | 一般ユーザー | 管理者 | システム管理者 |
|---|---|---|---|
| 端末一覧の閲覧 | ✅ | ✅ | ✅ |
| 端末の予約・キャンセル | ✅（自分のみ） | ✅（全員分） | ✅（全員分） |
| ユーザー管理 | ❌ | ✅ | ✅ |
| 端末管理 | ❌ | ✅ | ✅ |
| 使用ログ閲覧 | ❌ | ❌ | ✅ |
| 端末の完全削除 | ❌ | ❌ | ✅ |
