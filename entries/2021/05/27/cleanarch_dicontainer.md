---
type: 'blog'
path: '/blog/2021/05/27/cleanarch_dicontainer'
date: '2021-05-27'
title: 'Clean ArchitectureにDIコンテナを導入し、オブジェクト生成を整理する'
keyword: ''
tags: ["programming", "architetcure"]
---

[先日のClean Architetcure実装](/blog/2021/05/16/try_clean_architecture)では、ライブラリを利用せずに素のDIの設計パターンで実装しました。

今回は、 __DIコンテナ__ を利用した実装を確認します。


<a id="markdown-目次" name="目次"></a>
# 目次
<!-- TOC -->

- [目次](#目次)
- [ベースにするClean Architecture実装](#ベースにするclean-architecture実装)
  - [フォルダ構成](#フォルダ構成)
  - [素DI実装のオブジェクトの生成](#素di実装のオブジェクトの生成)
- [DIコンテナについて](#diコンテナについて)
  - [InversifyJSについて](#inversifyjsについて)
  - [DIコンテナを導入する](#diコンテナを導入する)
    - [デコレータを付与する](#デコレータを付与する)
    - [DIコンテナにオブジェクトを登録する](#diコンテナにオブジェクトを登録する)
    - [DIコンテナからオブジェクトを生成する](#diコンテナからオブジェクトを生成する)
  - [Service Locatorアンチパターンについて](#service-locatorアンチパターンについて)
- [まとめ](#まとめ)

<!-- /TOC -->


<a id="markdown-ベースにするclean-architecture実装" name="ベースにするclean-architecture実装"></a>
# ベースにするClean Architecture実装

実装は[こちら](https://github.com/kazukimuta/try_crean_architecture)。

タスク管理システムのサーバーサイドをイメージした、TypeScript + Expressのサーバー実装です。

<a id="markdown-フォルダ構成" name="フォルダ構成"></a>
## フォルダ構成

フォルダ構成は以下の通り。

- Clean Architectureの指針に沿った責務でフォルダ分け
- Interfaceは、一つ前の層に置く
  - 例えば、2層のモジュールが依存するInterfaceは２層に置くが、その実態は３層以降に定義するイメージ

```bash
 tree -I "*test*" ./src  
./src
├── application                   # Application Business Rule層（２層目）
│   ├── repositories
│   │   └── ITaskRepository.ts      # Database操作のInterface
│   └── usecases                    # タスクモデル操作に関連するユースケース
│       ├── CreateTask.ts
│       ├── DeleteTask.ts
│       ├── GetTask.ts
│       ├── ListTask.ts
│       └── UpdateTask.ts
├── domain                        # Enterprise Business Rule層（１層目）
│   └── models
│       └── Tasks.ts                # タスクモデル
├── infrastructure                # FrameWork & Dvivers層 (４層目)
│   ├── MongodbConnection.ts        # MongoDBコネクタの実態
│   ├── MysqlConnection.ts          # MySQLコネクタの実態
│   ├── router.ts                   # ExpressのRouter
│   └── server.ts                   # Express。アプリのエントリーポイントはここ
└── interfaces                    # Intercace Adapter層（３層目）
    ├── controllers                 # Controllerの実態
    │   └── TasksController.ts
    ├── database                    
    │   ├── INoSQLDBConnection.ts    # MongoDBコネクタのInterface
    │   ├── IRDBConnection.ts        # MySQLコネクタのInterface
    │   ├── NoSQLTaskRepository.ts   # Database操作の実態( NoSQL用 )
    │   └── RDSTaskRepository.ts     # Database操作の実態( RDS用 )
    └── serializers
        └── TaskSerializer.ts
```

<a id="markdown-素di実装のオブジェクトの生成" name="素di実装のオブジェクトの生成"></a>
## 素DI実装のオブジェクトの生成

以下のように、オブジェクトの外側で依存オブジェクト作り、引数で依存オブジェクトを渡すのがDIです。

```javascript
// ------------ クラス定義 -----------------
class TaskController {
  private database: IDatabase; // databaseオブジェクトのInterfaceに依存
  constructor(database: IDatabase) {
    this.database = database;
  }

  persist(task) {
    this.database.persist(task)
  }
}

// ------------ 利用シーン -----------------
const db = new Database();
const taskController = new TaskController(db);
const task = new Task('掃除する');
taskController.persist(task);
```

利用部分を見ると、`TaskController`を作るために、`Database`を作るというプロセスが確認できます。

これは短いサンプルですが、Clean Architectureのような多層構造において、内部層で使うオブジェクトを作るために関連する(内部依存する）オブジェクトを複数`new`しなければならない状況が見えてきます。

また、外側のクラスで内部で利用するオブジェクトをnewする流れが連鎖するため、必然的に外側のクラス(main関数)にオブジェクト生成のロジックが集まってきます。

以下、元のClean Architecture実装では、エントリーポイントである`server.ts`にオブジェクト生成のロジックが集中していました。
本来だと`server.ts`の責務とは無関係の`import`やオブジェクト生成が行われており、違和感を感じます。

```javascript
# src/infrastructure/server.ts

import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { ApiRouter } from "./router";
// highlight-start
// 注入オブジェクト生成のためのimport
import { TasksController } from "../interfaces/controllers/TasksController";
import { MysqlConnection } from "./MysqlConnection";
import { TaskRepository } from "../interfaces/database/RDSTaskRepository";
import { NoSQLTaskRepository } from "../interfaces/database/NoSQLTaskRepository";
import { MongodbConnection } from "./MongodbConnection";
import { LocalMockRepository } from "../interfaces/database/LocalTaskRepository";
import { ITaskRepository } from "../application/repositories/ITaskRepository";
// highlight-end

// highlight-start
// 環境変数によって注入オブジェクトを作り変える
function getTaskRepository(): ITaskRepository {
  dotenv.config();
  switch (process.env.DB_TYPE) {
    case "mongo":
      const mongodbConnection = new MongodbConnection();
      mongodbConnection.connect().then(() => {
        console.log("ok");
      });
      return new NoSQLTaskRepository(mongodbConnection);

    case "local":
      return new LocalMockRepository();

    case "mysql":
    default:
      const mysqlConnection = new MysqlConnection();
      return new TaskRepository(mysqlConnection);
  }
}
const tasksController = new TasksController(getTaskRepository());
// highlight-end

const apiRoute = new ApiRouter(tasksController);
const app = express();
// Route設定
app.use("/api", apiRoute.composeRoute());
app.listen(3000, () => {
  console.log("listening on port 3000");
});
export default app;
```


<a id="markdown-diコンテナについて" name="diコンテナについて"></a>
# DIコンテナについて

DIコンテナは、インスタンスの生成をまるっと任せてしまう仕組みがDIコンテナです。
上記で見えたような課題、つまり

- 内側のクラスにわたすためのオブジェクトを作る処理が長くなりがち
- オブジェクト生成する場所が不明確になりがち

というような課題を解決する為に使います。
内部的には、クラス名などをKey、クラスのコンストラクタをValuesにしたような辞書を保持していて、
利用側は、クラス名のKeyを渡して必要なオブジェクト生成していくイメージです。

TypeScriptのDIコンテナとして、今回は[InversifyJS](https://github.com/inversify/InversifyJS)を選択しました。

<a id="markdown-inversifyjsについて" name="inversifyjsについて"></a>
## InversifyJSについて

NodeJSのDIコンテナ実装。[詳細はこちら](https://github.com/inversify/InversifyJS)

基本的な使い方としては
- 依存関係が発生する箇所に`@injectable`、`@inject`というデコレータを付与
- ContainerにDIするクラス群を登録。Container内部に辞書があって、クラスを表すSymbol(文字列やクラスでも可)をKeyに、クラスをValueとして登録するイメージ
- ContainerにSymbolを渡して、必要なオブジェクトを取得する
というような流れです。

```javascript
// ------- クラス定義 -------------------
@injectable()
class Katana implements Weapon {
    public hit() {　return "cut!";　}
}

@injectable()
class Shuriken implements ThrowableWeapon {
    public throw() {　return "hit!";　}
}

@injectable()
class Ninja implements Warrior {
    private _katana: Weapon;
    private _shuriken: ThrowableWeapon;

    public constructor(
	    @inject(TYPES.Weapon) katana: Weapon,  // DIコンテナで注入するオブジェクトを @injectの引数でSymbolで指定
	    @inject(TYPES.ThrowableWeapon) shuriken: ThrowableWeapon
    ) {
        this._katana = katana;
        this._shuriken = shuriken;
    }

    public fight() { return this._katana.hit(); }
    public sneak() { return this._shuriken.throw(); }

}

// ------------ コンテナ登録 -----------------
import { Container } from "inversify";
const myContainer = new Container();
myContainer.bind<Warrior>(TYPES.Warrior).to(Ninja);  // SymbolをKeyにして、クラスを辞書登録
myContainer.bind<Weapon>(TYPES.Weapon).to(Katana);
myContainer.bind<ThrowableWeapon>(TYPES.ThrowableWeapon).to(Shuriken);

// ------------ 利用シーン -----------------
const ninja = myContainer.get<Warrior>(TYPES.Warrior); // Symbol「TYPES.Warrior」で、Warrior型のオブジェクトを得る
```

<a id="markdown-diコンテナを導入する" name="diコンテナを導入する"></a>
## DIコンテナを導入する

上述の`InversifyJS`を、CleanArchitectureのサンプル実装に入れていきます。

すでにDIパターンに沿った実装になっているので、デコレータをつけて、オブジェクト生成をDIコンテナに寄せるだけの作業です。
DIコンテナをした後も、各単体試験コードは何ら変更なく動作します。

<a id="markdown-デコレータを付与する" name="デコレータを付与する"></a>
### デコレータを付与する

まずは、依存が発生するクラスにデコレータをつけていきます。
DIの基本実装は済んでいるので、ただデコレータをつけるだけです。

```javascript
+ import { injectable, inject } from "inversify"; // highlight-line

+ @injectable() // highlight-line
export class NoSQLTaskRepository extends ITaskRepository {
  private connection: INoSQLDBConnection;
// highlight-start
-  constructor(connection: INoSQLDBConnection) {
+  constructor(
+    @inject(Symbols.INoSQLDBConnection) connection: INoSQLDBConnection
+  ) {
// highlight-end
    super();
    this.connection = connection;
  }
```

<a id="markdown-diコンテナにオブジェクトを登録する" name="diコンテナにオブジェクトを登録する"></a>
### DIコンテナにオブジェクトを登録する

DIコンテナへの登録は`inversify.config.ts`というファイルで実装する事が[推奨されている](https://github.com/inversify/InversifyJS#step-3-create-and-configure-a-container)ので、そのとおりに実装します。

ここにDIで渡されるオブジェクト生成のロジックを一同に集めます。

```javascript
inversify.config.ts

import { Container } from "inversify";
import "reflect-metadata";
import Symbols from "./symbols";
import { MysqlConnection } from "./infrastructure/MysqlConnection";
import { RDSTaskRepository } from "./interfaces/database/RDSTaskRepository";
import { NoSQLTaskRepository } from "./interfaces/database/NoSQLTaskRepository";
import { MongodbConnection } from "./infrastructure/MongodbConnection";
import { LocalTaskRepository } from "./interfaces/database/LocalTaskRepository";
import { ITaskRepository } from "./application/repositories/ITaskRepository";
import { IRDBConnection } from "./interfaces/database/IRDBConnection";
import { INoSQLDBConnection } from "./interfaces/database/INoSQLDBConnection";

const container = new Container();

container
  .bind<LocalTaskRepository>(Symbols.LocalTaskRepository)
  .to(LocalTaskRepository);

container
  .bind<NoSQLTaskRepository>(Symbols.NoSQLTaskRepository)
  .to(NoSQLTaskRepository);
container
  .bind<INoSQLDBConnection>(Symbols.INoSQLDBConnection)
  .to(MongodbConnection);

container
  .bind<RDSTaskRepository>(Symbols.RDSTaskRepository)
  .to(RDSTaskRepository);
container.bind<IRDBConnection>(Symbols.IRDBConnection).to(MysqlConnection);

export { container };
```

<a id="markdown-diコンテナからオブジェクトを生成する" name="diコンテナからオブジェクトを生成する"></a>
### DIコンテナからオブジェクトを生成する

もともと`server.ts`で実装していたオブジェクト生成ロジックが、まるごと`inversify.config.ts`に渡されたため、`server.ts`の実装がシンプルになります。

```javascript
# src/infrastructure/server.ts

import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { ApiRouter } from "./router";
// highlight-start
// 注入オブジェクト生成のためのimportは不要
- import { TasksController } from "../interfaces/controllers/TasksController";
- import { MysqlConnection } from "./MysqlConnection";
- import { TaskRepository } from "../interfaces/database/RDSTaskRepository";
- import { NoSQLTaskRepository } from "../interfaces/database/NoSQLTaskRepository";
- import { MongodbConnection } from "./MongodbConnection";
- import { LocalMockRepository } from "../interfaces/database/LocalTaskRepository";
- import { ITaskRepository } from "../application/repositories/ITaskRepository";
// 代わりにDIコンテナをインポート
+ import { container } from "../inversify.config";
// highlight-end


// 環境変数によって注入オブジェクトを作り変える
function getTaskRepository(): ITaskRepository {
  dotenv.config();
  switch (process.env.DB_TYPE) {
// highlight-start
// オブジェクト生成のロジックは不要
-    case "mongo":
-      const mongodbConnection = new MongodbConnection();
-      mongodbConnection.connect().then(() => {
-        console.log("ok");
-      });
-      return new NoSQLTaskRepository(mongodbConnection);
-    case "local":
-      return new LocalMockRepository();
-    case "mysql":
-    default:
-      const mysqlConnection = new MysqlConnection();
-      return new TaskRepository(mysqlConnection);


// オブジェクト生成の代わりに、DIコンテナから必要なオブジェクトを取得するだけ
+    case "mongo":
+      return container.get<ITaskRepository>(Symbols.NoSQLTaskRepository);
+    case "local":
+      return container.get<ITaskRepository>(Symbols.LocalTaskRepository);
+    case "mysql":
+    default:
+      return container.get<ITaskRepository>(Symbols.RDSTaskRepository);
// highlight-end
  }
}
const tasksController = new TasksController(getTaskRepository());

const apiRoute = new ApiRouter(tasksController);
const app = express();
// Route設定
app.use("/api", apiRoute.composeRoute());
app.listen(3000, () => {
  console.log("listening on port 3000");
});
export default app;
```


<a id="markdown-service-locatorアンチパターンについて" name="service-locatorアンチパターンについて"></a>
## Service Locatorアンチパターンについて

DIコンテナからオブジェクト取得するロジックは、`server.ts`のみで実施していて、各クラスへのオブジェクト分配はDIで上から下に渡すような作りになっています。

ここで、各クラス内でDIコンテナを参照してしまうと、__Service Locaterアンチパターン__ と呼ばれる状態になります。
様々なクラスがDIコンテナを参照してしまうとDIコンテナへの依存が強まってしまうため、依存オブジェクトは外部から受領するようにして、DIコンテナへの参照は辞めましょうという事です。

ここの実装はやりがちなように思うので、注意が必要です。


<a id="markdown-まとめ" name="まとめ"></a>
# まとめ

DIパターンを採用時のオブジェクト生成どこでやるか問題は、DIコンテナでスッキリ解消します。<br>
ServiceLocatorパターンに陥らないようにする意味でも、DIパターンに向かうときは、DIコンテナもセットで導入したほうがよいようです。

なお、DIというより、__インターフェースに依存させ実態に依存させない__ という戦略は、実装上の秩序を作る意味でもテストの観点でも非常に有用であることを改めて実感しました。

とはいえすべてインターフェースにするのもやりすぎで、どこに境界を設けるかは考えものです。<br>
初めから想定できるものでもないように思います。

結局は、以下のような考えに落ち着くのかなと思っています。

_まずは動くものを作る。その後、リファクタリングの方針として、DIパターンを目指す。DIに変えるときはDIコンテナもセットで導入する_
