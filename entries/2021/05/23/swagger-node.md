---
type: 'blog'
path: '/blog/2021/05/23/swagger-node'
date: '2021-05-23'
title: 'NodeJSのサーバー環境でOASドキュメントを書くメモ'
keyword: ''
tags: ["programming","tips"]
---

<!-- TOC -->

- [1. 背景・目的](#1-背景・目的)
- [2. リソース](#2-リソース)
  - [2.1. 準備](#21-準備)
- [3. 実装](#3-実装)
  - [3.1. oas.js](#31-oasjs)
  - [3.2. server.js](#32-serverjs)
- [4. 実行](#4-実行)
  - [4.1. Expressサーバー実行時](#41-expressサーバー実行時)
  - [4.2. OASドキュメント出力](#42-oasドキュメント出力)
- [5. まとめ](#5-まとめ)

<!-- /TOC -->

<a id="markdown-1-背景・目的" name="1-背景・目的"></a>
# 1. 背景・目的

NodeJS + Expressのサーバー（JavaScript）でOpenAPI Specificationのドキュメントを用意したい。

すでに実装済サーバーのAPIに対してドキュメントを書く必要があるが、プレーンなOASをyamlで書くのは避けたい。しかし非TypeScriptにてドキュメント自動生成も難しい。
従って、JSDocのように実装内のコメントからOASドキュメントが生成できる仕組みを選択した。

<a id="markdown-2-リソース" name="2-リソース"></a>
# 2. リソース

- NodeJS
- Express
- [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)
  - コントローラ部分にアノテーション付きでJSDoc書くとOPenAPISpecificationを生成してくれるツール
- [ReDoc](https://github.com/Redocly/redoc)
  - OpenAPISpecificationのViewer。SwaggerUIよりも見やすいかも

<a id="markdown-21-準備" name="21-準備"></a>
## 2.1. 準備

Expressの部分は割愛。swagger-jsdocは以下でインストール

```
npm install swagger-jsdoc
```


<a id="markdown-3-実装" name="3-実装"></a>
# 3. 実装

<a id="markdown-31-oasjs" name="31-oasjs"></a>
## 3.1. oas.js

- やっていること
  - `/redoc` アクセス時にReDocページが描画できるようにする
  - コマンド実行時に`oas.json`にOASドキュメントを出力する

```javascript 
async function lazySetup() {
  // swagger-jsdoc内部のpackage.jsonで "type": "module" 指定があり、requireできないため
  // await import で動的読み込みしている
  const swaggerJsdoc = await import('swagger-jsdoc');
  // infoやserverなど、OASの全体にかかる定義はここに定義する
  const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'hello API',
      version: '1.0.0',
      description: `
# ハローAPI
挨拶を返します
## subtitle
APIの説明をmarkdown形式で記述
`,
    },
    serve: [],
  };
  const options = {
    swaggerDefinition,
    apis: [
      // ここにpath定義を書いているファイルを列挙
      'server.js',
      // 'src/controllers/**/*.js', // ワイルドカードもOK
    ],
  };
  return await swaggerJsdoc.default(options);
}

// ReDoc描画のためのベースHTML
function generateRedocPage(spec) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <title>ReDoc</title>
      <!-- needed for adaptive design -->
      <meta charset="utf-8"/>
      <link rel="icon" href="data:;base64,=">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 0;
        }
      </style>
    </head>
    <body>
      <div id="redoc-container"></div>
      <script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"> </script>
      <script>
      const doc = '${JSON.stringify(spec)}'
      // JSON.parseのparseを通すため改行コードを変換
      const replaced = JSON.parse(doc.replace(/\\n/g, "<br>"))
      // ReDocは<br>があると上手くmarkdownパースしてくれないようなので、オブジェクト上で改行コードに変換。。
      replaced.info.description = replaced.info.description.replace(/<br>/g, "\\n")
      Redoc.init(replaced, {}, document.getElementById('redoc-container'))
      </script>
    </body>
  </html>
  `;
}

// /redoc にOASドキュメント描画のパスを追加
async function withOpenApiUi(app) {
  const spec = await lazySetup();
  const html = generateRedocPage(spec);
  app.get('/redoc', (req, res) => {
    return res.send(html);
  });
  return app;
}

module.exports = {
  withOpenApiUi
};


// コマンド実行時に、OASファイル生成するため
if (require.main === module) {
  const fs = require('fs');
  const fileName = 'oas.json';
  lazySetup().then(spec => {
    fs.writeFileSync(
      fileName,
      JSON.stringify(spec, null, '\t')
    );
    console.log(
      `\n🎉 bundled successfully in: ${fileName}`
      );
  });
}

```

<a id="markdown-32-serverjs" name="32-serverjs"></a>
## 3.2. server.js

- contoroller部分にJSDocを記述
  - JSDocに`@openapi`というアノテーションつけてOASのpath定義を記述
  - path定義のほか、tagやcomponentの定義も同様に定義できる


```javascript
const express = require('express');
const { withOpenApiUi } = require('./oas');
const app = express();

/**
 * @openapi
 * tags:
 *  - name: Hello
 *    description: 挨拶
 */


/**
 * @openapi
 * /hello:
 *  get:
 *    summary: hiと返す
 *    tags: [Hello]
 *    responses:
 *      '200':
 *        content:
 *          text/plain:
 *            schema:
 *              type: string
 *            example:
 *              hi
 */
app.get('/hello', (req, res) => {
  res.send('hi')
})

/**
 * @openapi
 * /hello/{name}:
 *  get:
 *    summary: 丁寧めにhiと返す
 *    tags: [Hello]
 *    parameters:
 *      - name: name
 *        in: path
 *        description: 名前
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      '200':
 *        content:
 *          application/json:
 *            schema:
 *              type: "object"
 *              properties:
 *                message:
 *                  type: string
 *                to:
 *                  type: string
 *            example:
 *              message: こんにちは
 *              to: yamada
 */
app.get('/hello/:name', (req, res) => {
  res.send(`hi, Dear ${req.params.name}`)
})

withOpenApiUi(app).then((app) => {
  app.listen(8080, () => {
    console.log(`🚀 start`)
  })
})
```


<a id="markdown-4-実行" name="4-実行"></a>
# 4. 実行

<a id="markdown-41-expressサーバー実行時" name="41-expressサーバー実行時"></a>
## 4.1. Expressサーバー実行時

```
node server.js
```

`localhost:8080/redoc` にアクセスすると、ReDocが閲覧できる

<a id="markdown-42-oasドキュメント出力" name="42-oasドキュメント出力"></a>
## 4.2. OASドキュメント出力

```
node oas.js
```

`oas.json`というファイルにOASの定義ファイルが出力される


<a id="markdown-5-まとめ" name="5-まとめ"></a>
# 5. まとめ

Open API Specificationの記述は人間がやるべき仕事ではないと思う。。