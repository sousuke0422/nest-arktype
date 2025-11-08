# nestjs-arktype-bench

パフォーマンスベンチマークテスト用ワークスペース

## 概要

このワークスペースには、`nestjs-arktype`と他のバリデーションライブラリ（Zod、class-validator）とのパフォーマンス比較テストが含まれています。

## 実行方法

```bash
# すべてのベンチマークテストを実行
pnpm --filter nestjs-arktype-bench test

# ウォッチモード
pnpm --filter nestjs-arktype-bench test:watch

# ベンチマークのみ実行
pnpm --filter nestjs-arktype-bench bench
```

## 測定項目

- 単一オブジェクトのバリデーション速度
- 大量データ（1000件）のバリデーション速度
- スキーマ作成速度
- DTOクラス作成速度
- 複雑なスキーマでのパフォーマンス

## 比較対象

- **nestjs-arktype** (ArkTypeベース)
- **Zod** (直接使用)
- **nestjs-zod** (Zodベース)
- **class-validator** (デコレータベース)

