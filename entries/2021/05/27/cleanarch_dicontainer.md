---
type: 'blog'
path: '/blog/2021/05/27/cleanarch_dicontainer'
date: '2021-05-27'
title: 'DIの悩みをDIコンテナで解決する ~TypeScriptのCleanArchitectureにDIコンテナを適用してみる~'
keyword: ''
tags: ["programming", "architetcure"]
---

[以前の記事](/blog/2021/05/16/try_clean_architecture)で、Clean Architetcureにしたがってサンプルのサーバーを作ってみました。
このサンプル実装はDIコンテナを使わずに実装しましたが、DIコンテナを使うことで、具体的にどのようにDIの実装が変化するかを確認します。

本記事では、[タスク管理システムのサーバーサイドをイメージしたTypeScript + Expressのサーバー実装](https://github.com/kazukimuta/try_crean_architecture)をサンプルとしています。

なお、本記事ではDIとDIコンテナにフォーカスし、Clean Architectureについての説明はしません。

<!-- TOC -->

- [DIとDIコンテナ](#diとdiコンテナ)
  - [DIの基本形](#diの基本形)
  - [DIの悩み](#diの悩み)
    - [内側のクラスにわたすためのオブジェクトを作る処理が長くなりがち](#内側のクラスにわたすためのオブジェクトを作る処理が長くなりがち)
    - [オブジェクト生成する場所が不明確になりがち](#オブジェクト生成する場所が不明確になりがち)
  - [DIコンテナとはなにか](#diコンテナとはなにか)
    - [InversifyJS](#inversifyjs)
- [Clean Architecture実装にDIコンテナを導入する](#clean-architecture実装にdiコンテナを導入する)
  - [DIコンテナを導入する](#diコンテナを導入する)
    - [デコレータを付与する](#デコレータを付与する)
    - [DIコンテナにオブジェクトを登録する](#diコンテナにオブジェクトを登録する)
    - [DIコンテナからオブジェクトを生成する](#diコンテナからオブジェクトを生成する)
- [まとめ](#まとめ)

<!-- /TOC -->




<a id="markdown-diとdiコンテナ" name="diとdiコンテナ"></a>
# DIとDIコンテナ
<a id="markdown-diの基本形" name="diの基本形"></a>
## DIの基本形
- 依存する対象を実態ではなくインターフェースにする
- インターフェースを実装した依存オブジェクトをつくり、外側からわたす

のが基本的なDIの考え方です。

以下の例では

- `TaskController`は`IDatabase`インターフェースに依存している(実態に依存していない)
- `IDatabase`を継承した`Database`を外側で作り、`TaskController`にわたす

という構造をとっています。

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

<a id="markdown-diの悩み" name="diの悩み"></a>
## DIの悩み

<a id="markdown-内側のクラスにわたすためのオブジェクトを作る処理が長くなりがち" name="内側のクラスにわたすためのオブジェクトを作る処理が長くなりがち"></a>
### 内側のクラスにわたすためのオブジェクトを作る処理が長くなりがち

上記サンプルの「利用シーン」を見ると、`TaskController`を`new`するために、前作業として`Database`を`new`しています。

DIを用いると、このような「〇〇オブジェクトを作るためには、〇〇に注入する△△オブジェクトを事前につくる」という作業が頻発します。<br>
場合によっては、更に△△オブジェクトを作るためには✗✗オブジェクトも必要で。。というように、多段になることもあるでしょう。

これは短いサンプルですが、Clean Architectureのような多層構造においては、内部層にわたすオブジェクトを作るために複数のオブジェクトを順序立てて`new`しなければならない状況が見えてきます。


<a id="markdown-オブジェクト生成する場所が不明確になりがち" name="オブジェクト生成する場所が不明確になりがち"></a>
### オブジェクト生成する場所が不明確になりがち

また、上述のオブジェクト生成を __どこで実装するか？__ という課題もあります。

依存するオブジェクトを外側から渡すという考えを厳守するなら、必然的に外側のクラス(main関数)にオブジェクト生成のロジックが集まってきます。<br>
サンプルのClean Architecture実装では、エントリーポイントである`server.ts`にオブジェクト生成のロジックが集中させてしていました。
本来だと`server.ts`ではサーバー起動するためのロジックが書かれているべきですが、内部層で利用するためのオブジェクト生成と、そのための`import`がたくさんかかれており、なかなかの違和感を感じます

_`src/infrastructure/server.ts`_

```javascript
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

ちなみに、上位層でオブジェクトまるごと生成するのではなく、オブジェクトを利用したい場所で生成すると、
[Service Locatorアンチパターン](http://blog.a-way-out.net/blog/2015/08/31/your-dependency-injection-is-wrong-as-I-expected/)になります。

端的にいうと、様々なクラスがオブジェクト生成するためのクラス(Service Locator)へ依存するようになり、保守性が下がるというものです。<br>
やはり、上位層でまるっとオブジェクト生成して下位層に渡すという考え方が必要になります。

<a id="markdown-diコンテナとはなにか" name="diコンテナとはなにか"></a>
## DIコンテナとはなにか

DIコンテナは、上述したような課題を解決するために、
内部に渡していくオブジェクトの生成や管理をまるごと一括管理するための仕組みです。

内部的には、クラス名などをKey、クラスのコンストラクタをValuesにしたような辞書を保持していて、
利用側は、クラス名のKeyを渡して必要なオブジェクト生成していくイメージです。

TypeScriptのDIコンテナとして、今回は[InversifyJS](https://github.com/inversify/InversifyJS)を選択しました

<a id="markdown-inversifyjs" name="inversifyjs"></a>
### InversifyJS

基本的な使い方としては

- 依存関係が発生する箇所に`@injectable`、`@inject`というデコレータを付与
- ContainerにDIするクラス群を登録。Container内部に辞書があって、クラスを表すSymbol(文字列やクラスでも可)をKeyに、クラスをValueとして登録するイメージ
- ContainerにSymbolを渡して、必要なオブジェクトを取得する
というような流れです。

なお、`InversifyJS` では、下記サンプルの「コンテナ登録」部分を、`inversify.config.ts`に[まとめることを推奨しています。](https://github.com/inversify/InversifyJS#step-3-create-and-configure-a-container)

DIコンテナをつかうことで、

- オブジェクトを`new`する処理が簡単にかける（内部で依存性解決してくれる）
- オブジェクト生成する場所が一箇所にまとまる（`inversify.config.ts`に集約）

という状況がうまれ、上述のDIの悩みの解消ができそうです。


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



<a id="markdown-clean-architecture実装にdiコンテナを導入する" name="clean-architecture実装にdiコンテナを導入する"></a>
# Clean Architecture実装にDIコンテナを導入する


では、ここからサンプルのClean ArchitectureにDIコンテナを導入していきます。

なお、今回の記事の実装内容は[こちらのPR](https://github.com/kazukimuta/try_crean_architecture/pull/1)で纏めて確認できます。

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

DIコンテナへの登録を`inversify.config.ts`に記述します。必然的に、様々なモジュールImportが集まります


_inversify.config.ts_

```javascript
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

_src/infrastructure/server.ts_

```javascript
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


<a id="markdown-まとめ" name="まとめ"></a>
# まとめ

DIパターンを採用時のオブジェクト生成どこでやるか問題は、DIコンテナでスッキリ解消します。<br>
ServiceLocatorパターンに陥らないようにする意味でも、DIパターンに向かうときは、DIコンテナもセットで導入したほうがよいようです。

なお、DIというより、__インターフェースに依存させ実態に依存させない__ という戦略は、実装上の秩序を作る意味でもテストの観点でも非常に有用であることを改めて実感しました。

とはいえすべてインターフェースにするのもやりすぎで、どこに境界を設けるかは考えものです。<br>
初めから想定できるものでもないように思います。

結局は、以下のような考えに落ち着くのかなと思っています。

_まずは動くものを作る。その後、リファクタリングの方針として、DIパターンを目指す。DIに変えるときはDIコンテナもセットで導入する_
