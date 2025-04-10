# 株式投資可視化ツール マニュアル

## 1. 概要

株式投資可視化ツールは、投資家が保有株式のパフォーマンスを追跡し、売買タイミングの判断を支援するためのウェブアプリケーションです。株価の推移、投資収益、ボラティリティ分析、ニュース情報などを一元的に管理・表示します。

## 2. 機能一覧

### 2.1 銘柄管理機能

- **銘柄一覧表示**: 登録した企業の一覧をサイドバーに表示
- **銘柄追加**: 新しい銘柄（シンボル、企業名、セクター）を追加
- **銘柄選択**: 一覧から銘柄を選択して詳細情報を表示

### 2.2 株価表示機能

- **株価チャート表示**: 選択した銘柄の株価推移をグラフで表示
- **期間選択**: 表示する株価データの期間を選択可能（デフォルトは全期間）
- **購入ポイント表示**: チャート上に株式購入ポイントをマーク

### 2.3 投資管理機能

- **保有株登録**: 銘柄ごとに購入日、購入価格、数量を登録
- **投資収益計算**: 保有株の現在価値、利益額、利益率を計算・表示
- **配当金表示**: 銘柄ごとの配当金情報を表示（将来拡張予定）

### 2.4 売買判断支援機能

- **目標株価設定**: 銘柄ごとに目標売却価格を設定
- **損切り価格設定**: 銘柄ごとに損切り価格を設定
- **価格ライン表示**: チャート上に目標価格と損切り価格のラインを表示
- **アラート表示**: 現在価格が目標価格または損切り価格に達した場合に通知

### 2.5 ボラティリティ分析機能

- **ボラティリティ計算**: 過去20営業日と60営業日のヒストリカル・ボラティリティ（HV）を計算
- **損切り幅ガイド**: ボラティリティに基づいた推奨損切り幅を表示

### 2.6 ニュース連携機能

- **関連ニュース表示**: 選択した銘柄に関連するニュースを表示
- **市場ニュース表示**: 金融市場全体に影響のあった重要ニュースを表示
- **ニュースとチャート連携**: 重要イベント発生日をチャート上に表示

### 2.7 データ更新機能

- **手動更新**: 「データ更新」ボタンによる株価・ニュースデータの手動更新

## 3. システム設計

### 3.1 アーキテクチャ

本アプリケーションは、フロントエンドとバックエンドに分かれたクライアント・サーバー型アーキテクチャを採用しています。

```
+----------------+        +----------------+        +----------------+
|                |        |                |        |                |
|  フロントエンド  <------->  バックエンド   <------->  データベース    |
|  (React)       |  API   |  (Node.js)     |  SQL   |  (SQLite)      |
|                |        |                |        |                |
+----------------+        +----------------+        +----------------+
                                 ^
                                 |
                                 v
                          +----------------+
                          |                |
                          |  外部API       |
                          |  (株価・ニュース)|
                          |                |
                          +----------------+
```

### 3.2 技術スタック

#### フロントエンド
- **フレームワーク**: React (Vite)
- **状態管理**: React Hooks (useState, useEffect)
- **UI/UX**: カスタムCSS
- **グラフ描画**: Chart.js, react-chartjs-2
- **HTTP通信**: Axios

#### バックエンド
- **サーバー**: Node.js, Express
- **データベース**: SQLite
- **外部API連携**: Axios

### 3.3 データベース設計

#### テーブル構成

1. **stocks**: 銘柄基本情報
   - id: INTEGER (主キー)
   - symbol: TEXT (銘柄シンボル、例: AAPL)
   - name: TEXT (企業名)
   - sector: TEXT (セクター)
   - created_at: TIMESTAMP (登録日時)

2. **stock_prices**: 株価データ
   - id: INTEGER (主キー)
   - stock_id: INTEGER (外部キー → stocks.id)
   - date: TEXT (日付)
   - open: REAL (始値)
   - high: REAL (高値)
   - low: REAL (安値)
   - close: REAL (終値)
   - volume: INTEGER (出来高)

3. **user_holdings**: 保有株情報
   - id: INTEGER (主キー)
   - stock_id: INTEGER (外部キー → stocks.id)
   - purchase_date: TEXT (購入日)
   - purchase_price: REAL (購入価格)
   - quantity: INTEGER (数量)
   - target_price: REAL (目標価格)
   - stop_loss_price: REAL (損切り価格)

4. **news**: ニュース情報
   - id: INTEGER (主キー)
   - stock_id: INTEGER (外部キー → stocks.id、NULLの場合は市場全体のニュース)
   - title: TEXT (ニュースタイトル)
   - url: TEXT (ニュースURL)
   - published_date: TEXT (公開日)
   - source: TEXT (ニュースソース)
   - is_market_news: BOOLEAN (市場全体のニュースかどうか)

5. **dividends**: 配当金情報
   - id: INTEGER (主キー)
   - stock_id: INTEGER (外部キー → stocks.id)
   - ex_date: TEXT (権利落ち日)
   - payment_date: TEXT (支払日)
   - amount: REAL (配当金額)

### 3.4 API設計

#### エンドポイント一覧

1. **銘柄関連**
   - GET `/api/stocks`: 全銘柄の一覧を取得
   - POST `/api/stocks`: 新しい銘柄を追加
   - GET `/api/stocks/:id`: 特定銘柄の詳細情報を取得

2. **株価関連**
   - POST `/api/stocks/:id/prices`: 特定銘柄の株価データを追加/更新

3. **保有株関連**
   - POST `/api/holdings`: 新しい保有株情報を追加
   - PUT `/api/holdings/:id`: 保有株情報を更新

4. **ニュース関連**
   - POST `/api/news`: 新しいニュースを追加

5. **分析関連**
   - GET `/api/stocks/:id/volatility`: 特定銘柄のボラティリティを計算

## 4. 実装詳細

### 4.1 ボラティリティ計算

ヒストリカル・ボラティリティ（HV）の計算方法:

1. 日次リターンの計算: ln(当日終値 / 前日終値)
2. 日次リターンの標準偏差を計算
3. 年率換算: 日次標準偏差 × √252（年間営業日数）

```javascript
// 日次ボラティリティ計算例
const returns = [];
for (let i = 1; i < prices.length; i++) {
  const previousClose = prices[i].close;
  const currentClose = prices[i-1].close;
  const dailyReturn = Math.log(currentClose / previousClose);
  returns.push(dailyReturn);
}

const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
const squaredDifferences = returns.map(value => Math.pow(value - mean, 2));
const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / returns.length;
const stdDev = Math.sqrt(variance);

// 年率換算
const annualizedVolatility = stdDev * Math.sqrt(252);
```

### 4.2 損益計算

現在の実装では、シンプルな総平均法による損益計算を行っています。

```javascript
// 総投資額計算
const totalInvestment = holdings.reduce((total, holding) => {
  return total + (holding.purchase_price * holding.quantity);
}, 0);

// 現在価値計算
const currentPrice = latestPriceData.close;
const currentValue = holdings.reduce((total, holding) => {
  return total + (currentPrice * holding.quantity);
}, 0);

// 損益計算
const profit = currentValue - totalInvestment;
const profitPercentage = (profit / totalInvestment) * 100;
```

## 5. 使用方法

### 5.1 アプリケーションの起動

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動（フロントエンド + バックエンド）
npm run start

# フロントエンドのみ起動
npm run dev

# バックエンドのみ起動
npm run server

# サンプルデータの追加
cd server && node sampleData.js
```

### 5.2 基本操作

1. **銘柄の追加**
   - サイドバーの「+ Add Stock」ボタンをクリック
   - シンボル、企業名、セクター（任意）を入力して「Add」ボタンをクリック

2. **銘柄の選択**
   - サイドバーの銘柄リストから銘柄をクリック

3. **保有株の追加**
   - 銘柄詳細画面の「Holdings」セクションで「+ Add Holding」ボタンをクリック
   - 購入価格、数量、購入日を入力
   - 目標価格と損切り価格を設定（任意）
   - 「Add Holding」ボタンをクリック

4. **データの更新**
   - 画面上部の「Update Data」ボタンをクリック

## 6. 将来の拡張計画

1. **ポートフォリオ分析**
   - セクター別分散状況の可視化
   - リスク・リターン分析

2. **テクニカル指標**
   - 移動平均線（SMA、EMA）
   - RSI、MACD、ボリンジャーバンドなどの指標表示

3. **配当金管理**
   - 配当金履歴の記録
   - 将来の配当金予測

4. **税金計算**
   - 実現損益に対する税金計算
   - 確定申告用レポート生成

5. **モバイル対応**
   - レスポンシブデザインの強化
   - PWA対応またはネイティブアプリ開発

## 7. トラブルシューティング

### 7.1 データが表示されない場合

1. バックエンドサーバーが起動しているか確認
2. データベースが正しく初期化されているか確認
3. サンプルデータスクリプトを実行して初期データを追加

### 7.2 チャートが表示されない場合

1. 選択した銘柄に株価データが存在するか確認
2. ブラウザのコンソールでエラーメッセージを確認

### 7.3 API接続エラー

1. バックエンドサーバーのポート（59187）が他のアプリケーションと競合していないか確認
2. CORS設定が正しいか確認

## 8. 開発者向け情報

### 8.1 プロジェクト構造

```
stock-visualizer/
├── src/                  # フロントエンドのReactコード
│   ├── components/       # Reactコンポーネント
│   │   ├── AddStockForm.jsx  # 銘柄追加フォーム
│   │   ├── StockDetail.jsx   # 銘柄詳細表示
│   │   └── StockList.jsx     # 銘柄一覧表示
│   ├── App.jsx           # メインアプリケーションコンポーネント
│   └── App.css           # アプリケーションスタイル
├── server/               # バックエンドのNode.jsコード
│   ├── server.js         # Expressサーバー
│   ├── fetchData.js      # データ取得ユーティリティ
│   ├── sampleData.js     # サンプルデータ生成スクリプト
│   └── database/         # SQLiteデータベース
└── package.json          # プロジェクト設定
```

### 8.2 外部APIの利用

現在のデモ実装では、Alpha Vantage APIを使用して株価データを取得する想定になっています。実際の運用では、以下のAPIを検討してください：

- **株価データ**: Alpha Vantage, Yahoo Finance API, IEX Cloud
- **ニュースデータ**: News API, Alpha Vantage News, Yahoo Finance News

### 8.3 カスタマイズ方法

1. **新しい分析指標の追加**
   - `StockDetail.jsx`コンポーネントに新しい計算ロジックを追加
   - 必要に応じてバックエンドAPIを拡張

2. **UIのカスタマイズ**
   - `App.css`でスタイルを変更
   - 必要に応じて新しいコンポーネントを追加

3. **データソースの変更**
   - `server/fetchData.js`の外部API呼び出し部分を修正