# **ArkTypeとNestJS/Swaggerの統合：カスタムファクトリcreateArkTypeDtoの技術的妥当性に関する詳細設計・実装調査報告書**

## **I. エグゼクティブサマリー：統合への実現可能な道筋**

本調査報告書は、ArkTypeの高速なバリデーション性能とNestJSのOpenAPI（@nestjs/swagger）ドキュメント自動生成機能を両立させるための「カスタムファクトリ（createArkTypeDto）」アプローチの技術的実現可能性を検証し、その実装設計を詳述するものである。  
**中核的結論：** 提案されているcreateArkTypeDtoファクトリは、技術的に実現可能であるだけでなく、ArkTypeを@nestjs/swaggerと統合するための最も堅牢かつ洗練されたソリューションであると結論付ける。本調査により、このアプローチがNestJSエコシステム内に存在する、十分に文書化されていない統合パターンと一致することが確認された。  
**決定的な発見：** 成功裏な実装の鍵は、当初仮説として立てられた@ApiProperty()デコレータのプログラム的な適用ではない。その代わりに、@nestjs/zodの分析過程で発見された\_OPENAPI\_METADATA\_FACTORY静的メソッドパターンを模倣することにある。このファクトリは、@nestjs/swaggerがArkType定義から生成された完全なJSON Schemaを直接的かつ効率的に消費するためのメカニズムを提供する。  
**ArkType toJsonSchema()の評価：** ArkTypeのtoJsonSchema()メソッドは、主としてOpenAPIをターゲットに設計されたものではないが、そのfallback設定は、あらゆる非互換性を処理するための強力かつ十分なメカニズムを提供する 。descriptionやexampleといったメタデータの注入にはカスタムラッパー関数が必要となるが、このパターンは実装が容易であり、スキーマライブラリのエコシステムで出現しつつある標準的な手法と一致する。  
**最終勧告：** createArkTypeDtoファクトリの開発を推進することを推奨する。@nestjs/zodという強力な先行事例が存在するため、実装リスクは低い。この実装によって得られる開発者体験は、バリデーションとドキュメンテーションのための単一の信頼できる情報源（Single Source of Truth）を確立するというプロジェクトの目標を達成するであろう。

## **II. 設計図：@nestjs/zodの統合戦略の解体**

本セクションでは、中核的な技術的課題に対する決定的な「答え」として機能する@nestjs/zodライブラリを、コードレベルで綿密に解体・分析する。

### **中核メカニズム：動的なクラス生成**

@nestjs/zodが提供するcreateZodDto関数は、DTO（Data Transfer Object）クラスを生成するためのファクトリである 。この関数の核心は、実行時に動的に匿名クラスを返し、ユーザーがそれを継承して具象的なDTOクラスを定義する点にある。  
`// @nestjs/zod の典型的な利用パターン`  
`import { createZodDto } from 'nestjs-zod';`  
`import { z } from 'zod';`

`const UserSchema = z.object({`  
  `name: z.string(),`  
  `email: z.string().email(),`  
`});`

`export class UserDto extends createZodDto(UserSchema) {}`

このアプローチは、単なる型定義のコンテナ以上の役割を果たす。createZodDtoが返す匿名クラスは、渡されたZodスキーマを静的プロパティ（例：schema）として保持する 。この設計により、NestJSアプリケーションの他の部分、特にZodValidationPipeのようなカスタムパイプが、実行時にDTOクラスから直接スキーマ定義にアクセスできるようになる。  
この動的クラス生成は、我々のcreateArkTypeDtoアプローチの基礎となる。createArkTypeDtoもまた、ArkTypeのtypeオブジェクトを静的プロパティとして保持するclassを返す必要がある。これにより、後述するカスタムArkTypeValidationPipeが、リクエストのバリデーション時にスキーマを取得するための明確なインターフェースを得ることができる。

### **統合の秘訣：\_OPENAPI\_METADATA\_FACTORYの解明**

本調査における最も重要な発見は、createZodDtoによって生成されたクラスに実装されている\_OPENAPI\_METADATA\_FACTORYという名前の静的メソッドの存在である 。  
このメソッドは、@nestjs/swaggerモジュールによって認識される特別なフックとして機能する。SwaggerモジュールがDTOクラスをスキャンする際、この静的メソッドの存在を検知すると、個々のプロパティに付与された@ApiPropertyデコレータをリフレクションする標準的なプロセスを完全にバイパスする。代わりに、\_OPENAPI\_METADATA\_FACTORYメソッドを直接呼び出し、その返り値を当該DTOのOpenAPIスキーマオブジェクトとして採用する。  
@nestjs/zodの内部では、このファクトリメソッドがzodToOpenAPI(schema)を呼び出し、ZodスキーマをOpenAPI互換のJSON Schemaオブジェクトに変換している 。  
この発見は、統合戦略の方向性を根本的に決定づける。当初の仮説では、動的に生成したクラスの各プロパティに対して@ApiPropertyデコレータをプログラム的に適用する方法を模索していた。しかし、@nestjs/zodの実装は、よりクリーンで効率的な代替案を提示している。この\_OPENAPI\_METADATA\_FACTORYパターンは、スキーマ全体を一つのアトミックな操作で提供するため、プロパティごとの複雑なリフレクション処理を不要にする。  
このメカニズムは、@nestjs/swaggerが特定のライブラリに依存せず、拡張可能な設計になっていることを示唆している。任意のスキーマライブラリは、この規約（\_OPENAPI\_METADATA\_FACTORYという名前の静的メソッドを持つクラスを生成すること）に従う限り、@nestjs/swaggerとシームレスに統合できる。したがって、我々が実装するcreateArkTypeDtoは、この静的メソッドを正確に実装することが必須要件となる。

### **メタデータパイプライン：z.describe()からOpenAPIスキーマへ**

@nestjs/zodエコシステムは、zod-to-json-schemaというライブラリを活用し、Zodスキーマに付与されたメタ情報をOpenAPIドキュメントに反映させる 。開発者はz.describe()や.openapi()といったメソッドを用いて、スキーマの各フィールドにdescriptionやexampleといった情報を付与できる 。  
`// メタデータ付与の例 (@wahyubucil/nestjs-zod-openapi)`  
`export const User = z`  
 `.object({`  
    `email: z.string(),`  
    `displayName: z`  
     `.string()`  
     `.openapi({ description: 'Display name of the user' }), // メタデータを付与`  
  `})`  
 `.openapi('User');`

これらのメタデータは、zod-to-json-schemaによって解釈され、\_OPENAPI\_METADATA\_FACTORYが返す最終的なJSON Schemaオブジェクト内の対応するフィールド（description、exampleなど）に変換される。これにより、スキーマ定義に書かれたメタデータが、そのままSwagger UIに表示されるというクリーンなパイプラインが実現されている。  
我々のArkTypeソリューションも、このパイプラインを模倣する必要がある。ArkTypeのネイティブなメタデータ機能は発展途上であり、description以外の任意のメタデータ（例：example）を付与する標準的な方法はまだ確立されていない 。この課題を解決するためには、メタデータを外部からアタッチし、toJsonSchemaの変換ロジック内でそれを読み取ってマージするような、小さなラッパー関数やヘルパーを独自に作成する必要がある。

### **patchNestJsSwagger() / cleanupOpenApiDoc() の役割**

@nestjs/zodのドキュメントや関連Issueでは、patchNestjsSwagger() や cleanupOpenApiDoc() といった、セットアップ時の追加ステップに言及されている。これらの関数は、zod-to-json-schemaが生成するスキーマと、特定のOpenAPIバージョンとの間の微細な非互換性を吸収するために存在する。  
例えば、nullableな値の表現方法は、OpenAPI 3.0と3.1で異なる。OpenAPI 3.0ではnullable: trueというプロパティを使用するが、OpenAPI 3.1ではanyOfと{ "type": "null" }の組み合わせが推奨される 。cleanupOpenApiDoc関数は、SwaggerModule.createDocument()によって生成された*OpenAPIドキュメント全体*を後処理し、このような表現の差異をターゲットバージョンに合わせて正規化する。これは、Swaggerモジュール自体をモンキーパッチする可能性のあるpatchNestjsSwaggerよりも侵襲性の低いアプローチである。  
この後処理戦略は、我々の実装にとっても極めて重要である。ArkTypeのtoJsonSchema()もまた、OpenAPIの特定のバージョンに対して最適でないスキーマを生成する可能性がある 。toJsonSchema()自体を全てのバージョンに完璧に対応させるよう試みるのではなく、@nestjs/zodと同様に、後処理ステップを導入するのが賢明である。  
具体的には、我々のライブラリはcleanupArkTypeOpenApiDoc()のような関数を提供し、ユーザーがSwagger UIをセットアップする直前にこれを呼び出すように案内する。この関数は、生成されたドキュメントツリーを走査し、オプショナルやnullableの表現を正規化することで、幅広い互換性を確保する。これにより、DTOファクトリの実装を、最終的なプレゼンテーション層の詳細から切り離すことができる。

## **III. ArkTypeのtoJsonSchema()：基盤の評価**

本セクションでは、スキーマ変換の中核をなすtoJsonSchema()メソッドの能力と限界を評価し、その欠点を緩和するための戦略を策定する。

### **OpenAPI 3.0/3.1 互換性分析**

ArkTypeのtoJsonSchema()メソッドは、有効なJSON Schemaを生成することを目的として開発されたが、OpenAPI仕様への準拠は当初の主要な目標ではなかった 。その結果、特にユニオン型やenumの表現において、一部互換性の問題が報告されている。ArkTypeのメンテナーはこの問題を認識しており、改善に対して前向きな姿勢を示している 。  
一方で、orpc や vovk といった他のフレームワークでは、toJsonSchema()がOpenAPI生成のために成功裏に利用されており、このメソッドが基本的には実用可能であることを示している。  
最も注意すべき課題は、オプショナルなプロパティとnullableなプロパティの表現である。前述の通り、OpenAPI 3.0と3.1ではnullableの表現方法が異なる。ArkTypeの"string | null"のようなユニオン型は、{"anyOf": \[{"type": "string"}, {"type": "null"}\]}というOpenAPI 3.1形式のスキーマに変換される可能性が高い。我々のcleanupArkTypeOpenApiDoc()後処理関数は、ターゲットがOpenAPI 3.0の場合にこれを{"type": "string", "nullable": true}に変換する責務を負うことになる。

### **メタデータ注入戦略 (description, example, format)**

ArkTypeは.describe()メソッドを提供しており、Typeインスタンスにdescriptionプロパティを追加できる 。しかし、exampleやOpenAPI固有のformatといった任意のメタデータをスキーマに付与するための、標準化された組み込みAPIは現時点では存在しない。  
この機能の必要性はコミュニティでも活発に議論されており、より堅牢なメタデータ機能を求める提案がなされている 。特に、日付文字列に対してformatキーワードを付与したいという要求は、このニーズを象徴する好例である 。  
この課題に対する我々の解決策として、arkWithMeta(type, metadata)というヘルパー関数の導入を提案する。この関数は、ArkTypeのtypeオブジェクトとメタデータオブジェクトを受け取り、それらをカプセル化したプロキシまたはラッパーオブジェクトを返す。そして、\_OPENAPI\_METADATA\_FACTORY内でtoJsonSchema()を呼び出した後、このラッパーの存在をチェックし、もし存在すればメタデータを抽出して最終的なJSON Schemaオブジェクトにマージする。このアプローチにより、ArkType本体の変更を待つことなく、必要な機能を即座に提供できる。

### **fallback設定による非シリアライズ可能型の管理**

ArkTypeのtoJsonSchema()は、Dateオブジェクト、カスタムのpredicate関数、あるいはmorph（変換）といった、直接的なJSON Schema表現を持たない型に遭遇すると、デフォルトでエラーをスローする 。  
この挙動は、fallbackオプションによって詳細に制御可能である。fallbackオプションには、特定の非互換性コード（例：date、predicate）に対応するハンドラ関数を渡すことができる 。これは、ArkType固有の機能を優雅に処理するための極めて重要な「エスケープハッチ」である。例えば、dateコードに対するfallbackハンドラを定義し、{ "type": "string", "format": "date-time" }というOpenAPI互換のスキーマを返すように設定できる 。  
以下の表は、ArkTypeの主要な非シリアライズ可能型と、推奨されるOpenAPIスキーマ表現をまとめたものである。これは、開発者が互換性の問題を解決するためのクイックリファレンスガイドとして機能する。

| ArkTypeの機能 / 非シリアライズ可能型 | toJsonSchema エラーコード | 推奨されるfallback出力 (JSON Schema) | 注釈 |
| :---- | :---- | :---- | :---- |
| type("Date") または string.date.parse | date / predicate | { "type": "string", "format": "date-time" } | JavaScriptのDateオブジェクトを処理する。formatはdateも選択可能 。 |
| カスタム述語 (.narrow(...)) | predicate | ctx.base (制約を無視) またはカスタムのformat/patternを追加 | カスタム検証関数はスキーマで表現できない。制約を無視するか、該当する場合はformat等にマッピングする 。 |
| 変換 (.pipe(...)) | morph | ctx.base (制約を無視) | OpenAPIは変換前の入力形状を記述する。変換ロジックは無視し、ベーススキーマを使用すべきである 。 |
| bigint / symbol | domain | *デフォルトでエラー* | これらの型はJSONで表現できないため、DTOでの使用は避けるべきである 。 |
| オプショナルプロパティ ("key?": "string") | N/A (ネイティブ) | プロパティがrequired配列に含まれない | デフォルトで正しく処理される。 |
| Nullableユニオン (\`"string | null"\`) | N/A (ネイティブ) | {"anyOf": \[{"type": "string"}, {"type": "null"}\]} |

## **IV. createArkTypeDto実装の設計図**

本セクションでは、これまでの調査結果を統合し、ファクトリ関数を構築するための具体的かつ実行可能な計画を提示する。

### **createArkTypeDtoファクトリのアーキテクチャ設計**

createArkTypeDto\<T extends type\>(arktype: T)関数は、ArkTypeのtypeオブジェクトを唯一の引数として受け入れる。この関数は、ユーザー定義のDTOクラスが継承可能な匿名classを返す。  
`// 想定される利用方法`  
`export class MyDto extends createArkTypeDto(MyArkTypeSchema) {}`

返される匿名クラスは、以下の2つの必須の静的プロパティを持つ：

1. **schema**: バリデーションパイプが使用するために、元のArkType typeオブジェクトを保持する。  
2. **\_OPENAPI\_METADATA\_FACTORY**: OpenAPIスキーマを生成する責務を負うファクトリメソッド。

この設計は、@nestjs/zodのパターンを忠実に踏襲し、NestJSのDIコンテナおよびSwaggerモジュールとの互換性を保証する。

### **\_OPENAPI\_METADATA\_FACTORYの実装**

この静的メソッドは引数を取らない。その内部では、this.schema（クラス自身が保持するArkTypeスキーマ）を引数として、カスタムラッパー関数（例：arkTypeToApiSchema(this.schema)）を呼び出す。このラッパー関数が、実際のスキーマ変換ロジックをカプセル化する。最終的に、処理済みのJSON Schemaオブジェクトがこのファクトリから返却される。

### **メタデータマージのためのカスタムラッパー**

arkTypeToApiSchemaという内部ヘルパー関数は、メタデータ処理とfallback設定のロジックを集約する場所となる。この関数は以下の処理を実行する：

1. ArkTypeスキーマと、オプションのメタデータオブジェクトを受け取る。  
2. Dateのような一般的な非シリアライズ可能型を優雅に処理するための、デフォルトのfallback設定を定義する。  
3. arktype.toJsonSchema({ fallback:... })を呼び出し、基本的なJSON Schemaを生成する。  
4. arktype.descriptionからdescriptionを、そして我々が定義したarkWithMetaヘルパーからの任意のメタデータを、生成されたスキーマオブジェクトにマージする。  
5. 最終的に加工されたスキーマオブジェクトを返す。

この設計により、ArkType固有の変換ロジックがすべて一箇所に集約され、\_OPENAPI\_METADATA\_FACTORYの実装はシンプルに保たれる。

### **動的デコレータという誤解：なぜプログラム的な@ApiProperty適用が不適切なのか**

当初の調査計画（フェーズ3）では、@ApiPropertyデコレータをプログラム的に適用する方法を検証することが含まれていた。しかし、本調査の結果、このアプローチはこの問題に対する適切な解決策ではないことが明らかになった。  
TypeScriptではReflect.decorateや、NestJSが提供するapplyDecoratorsヘルパー を用いて、プログラム的にデコレータを適用すること自体は可能である。しかし、\_OPENAPI\_METADATA\_FACTORYという、より優れた、アトミックで、フレームワークに整合した統合パターンが存在する以上、動的デコレータのアプローチは不必要に複雑である。  
ArkTypeスキーマのプロパティを反復処理し、それぞれに対して動的にクラスプロパティを生成し、@ApiPropertyを適用していく方法は、@nestjs/zodの分析によって明らかになった意図された統合パターンに逆行する。このアプローチは脆弱で非効率であり、採用すべきではない。このセクションは、棄却された経路を文書化し、選択されたアプローチの正当性を強化するために存在する。

## **V. エコシステムの洞察：ElysiaJSのアプローチとの比較**

本セクションでは、パフォーマンスを重視する別のモダンなフレームワークであるElysiaJSが、同様の問題をどのように解決しているかを分析する。これにより、我々の提案がNestJSのエコシステムにおいていかに慣用的であるかを外部の文脈から補強する。

### **ElysiaJSのmapJsonSchema：プラグイン可能な抽象化**

ElysiaJSのOpenAPIプラグイン（elysia-openapi）は、mapJsonSchemaという設定オプションを提供する 。このオプションにより、開発者はスキーマライブラリ名と、それぞれのtoJsonSchema変換関数とのマッピングを提供できる。  
`// ElysiaJS での ArkType 統合の例`  
`import { openapi } from '@elysiajs/openapi'`

`new Elysia()`  
 `.use(openapi({`  
    `mapJsonSchema: {`  
      `arktype: (schema) => schema.toJsonSchema()`  
    `}`  
  `}))`

このアーキテクチャは、高度に疎結合なプラグインベースの設計である。ElysiaのコアはArkTypeやZodといった特定のライブラリについて何も知る必要がない。それは「スキーマオブジェクトが与えられたら、提供された関数を使ってJSON Schemaを取得する」という標準的な契約に依存している。これは、\_OPENAPI\_METADATA\_FACTORYという特定のクラスベースの規約を要求するNestJSのアプローチとは対照的である。

### **フレームワーク設計の教訓：スキーマ変換の分離**

ElysiaJSのアプローチは、プラグイン自体にコード変更を加えることなく、*新しい*スキーマライブラリをサポートする上で、より柔軟かつ拡張性が高い。  
一方、NestJSのアプローチは、より規約に基づき、特定の「合言葉」（\_OPENAPI\_METADATA\_FACTORY）を必要とするが、そのクラスおよびデコレータベースのDI・メタデータシステムとより緊密に統合されている。  
この比較は、どちらが優れているかを論じるものではなく、異なる設計思想を浮き彫りにするためのものである。この比較を通じて、我々がNestJSに対して提案するソリューションが、*NestJSにとって*慣用的であることが強調される。それはフレームワークの既存のパターンに適合しており、一方でElysiaJSのアプローチは、それ自身の関数的で高度に設定可能な設計思想に適合している。この理解は、我々の勧告に深みを与え、それが真空状態でなされたものではないことを示す。

## **VI. 最終勧告とリファレンス実装**

本最終セクションでは、調査結果の集大成として、実用可能な完全なコードの設計図と、その利用に関する明確なガイダンスを提供する。

### **createArkTypeDtoの完全なソースコード**

以下に、ファクトリ関数、動的クラス生成、および\_OPENAPI\_METADATA\_FACTORYを含む、コメント付きの完全な実装案を示す。  
`import { type, Type } from 'arktype';`  
`import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';`

`// ArkTypeの型に任意のメタデータを付与するためのラッパー`  
`// 現時点ではArkTypeにネイティブな方法がないため、このヘルパーで補う`  
`type ArkTypeWithMeta<T extends Type> = T & { __meta?: Record<string, any> };`

`export function arkWithMeta<T extends Type>(`  
  `arktype: T,`  
  `meta: Record<string, any>,`  
`): ArkTypeWithMeta<T> {`  
  `(arktype as ArkTypeWithMeta<T>).__meta = meta;`  
  `return arktype;`  
`}`

`// ArkTypeスキーマをOpenAPI互換のJSON Schemaに変換する内部ヘルパー`  
`function arkTypeToApiSchema(arktype: Type): SchemaObject {`  
  `const baseSchema = arktype.toJsonSchema({`  
    `// Dateなどの非互換型に対するフォールバックを定義`  
    `fallback: {`  
      `date: (ctx) => ({`  
       `...ctx.base,`  
        `type: 'string',`  
        `format: 'date-time',`  
      `}),`  
      `// デフォルトでは、他の未知の型はスキーマから制約を無視する`  
      `default: (ctx) => ctx.base,`  
    `},`  
  `});`

  `// ArkTypeの.description()からの説明をマージ`  
  `if (arktype.description) {`  
    `baseSchema.description = arktype.description;`  
  `}`

  `// arkWithMetaヘルパーからのカスタムメタデータをマージ`  
  `const customMeta = (arktype as ArkTypeWithMeta<Type>).__meta;`  
  `if (customMeta) {`  
    `Object.assign(baseSchema, customMeta);`  
  `}`

  `return baseSchema as SchemaObject;`  
`}`

`// DTOファクトリ本体`  
`export function createArkTypeDto<T extends Type>(arktype: T) {`  
  `class ArkTypeDto {`  
    `/**`  
     `* バリデーションパイプが使用する元のArkTypeスキーマ`  
     `*/`  
    `public static readonly schema = arktype;`

    `/**`  
     `* @nestjs/swaggerがOpenAPIスキーマを生成するために呼び出すファクトリ`  
     `*/`  
    `public static _OPENAPI_METADATA_FACTORY(): Record<string, SchemaObject> {`  
      `return arkTypeToApiSchema(this.schema);`  
    `}`  
  `}`

  `return ArkTypeDto;`  
`}`

### **カスタムArkTypeValidationPipeの実装**

createArkTypeDtoはドキュメンテーション生成を担うが、実行時のリクエストバリデーションには対応するValidationPipeが不可欠である。  
`import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';`  
`import { Type } from 'arktype';`

`@Injectable()`  
`export class ArkTypeValidationPipe implements PipeTransform {`  
  `transform(value: any, metadata: ArgumentMetadata) {`  
    `const metatype = metadata.metatype as any;`

    `// DTOがArkTypeスキーマを持っているかチェック`  
    `if (!metatype ||!metatype.schema ||!(metatype.schema instanceof Type)) {`  
      `return value;`  
    `}`

    `const arktype: Type = metatype.schema;`  
    `const result = arktype(value);`

    `if (result.errors) {`  
      `// エラーメッセージを整形してBadRequestExceptionをスロー`  
      `throw new BadRequestException(result.errors.summary);`  
    `}`

    `// バリデーションが成功した場合、(morphによる変換後の)データを返す`  
    `return result.data;`  
  `}`  
`}`

### **NestJSプロジェクトでのベストプラクティスと利用パターン**

以下に、これらのコンポーネントをNestJSプロジェクトで利用するための明確な例を示す。  
**1\. ArkTypeスキーマとDTOクラスの定義**  
`// src/users/dto/create-user.dto.ts`  
`import { type } from 'arktype';`  
`import { createArkTypeDto, arkWithMeta } from '../common/arktype.helpers';`

`// ArkTypeスキーマを定義`  
`const CreateUserSchemaDefinition = type({`  
  `name: 'string>0',`  
  `email: 'string.email',`  
  `'age?': 'number>0',`  
`});`

`// arkWithMetaを使用してexampleなどの追加情報を付与`  
`const CreateUserSchema = arkWithMeta(CreateUserSchemaDefinition, {`  
  `example: {`  
    `name: 'John Doe',`  
    `email: 'john.doe@example.com',`  
    `age: 30,`  
  `}`  
`});`

`// createArkTypeDtoを使用してDTOクラスを作成`  
`export class CreateUserDto extends createArkTypeDto(CreateUserSchema) {}`

**2\. コントローラでの利用**  
`// src/users/users.controller.ts`  
`import { Controller, Post, Body } from '@nestjs/common';`  
`import { ApiResponse, ApiTags } from '@nestjs/swagger';`  
`import { CreateUserDto } from './dto/create-user.dto';`

`@ApiTags('users')`  
`@Controller('users')`  
`export class UsersController {`  
  `@Post()`  
  `@ApiResponse({ status: 201, description: 'The user has been successfully created.', type: CreateUserDto })`  
  `@ApiResponse({ status: 400, description: 'Bad Request.' })`  
  `createUser(@Body() body: CreateUserDto) {`  
    `// この時点でbodyはArkTypeによってバリデーション済み`  
    `// bodyの型は { name: string; email: string; age?: number } として推論される`  
    `console.log(body);`  
    `//... サービスのロジックを呼び出す...`  
  `}`  
`}`

**3\. グローバルパイプと後処理関数の登録** main.tsファイルで、ArkTypeValidationPipeをグローバルパイプとして登録し、必要に応じてOpenAPIドキュメントの後処理を行う。  
`// src/main.ts`  
`import { NestFactory } from '@nestjs/core';`  
`import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';`  
`import { AppModule } from './app.module';`  
`import { ArkTypeValidationPipe } from './common/arktype-validation.pipe';`

`// OpenAPIドキュメントを後処理する関数 (例: nullableの正規化)`  
`function cleanupArkTypeOpenApiDoc(document: any) {`  
  `// ここでドキュメント全体を走査し、必要な修正を加える`  
  `// 例: anyOfとtype: 'null'をnullable: trueに変換`  
  `return document;`  
`}`

`async function bootstrap() {`  
  `const app = await NestFactory.create(AppModule);`

  `// ArkTypeValidationPipeをグローバルに適用`  
  `app.useGlobalPipes(new ArkTypeValidationPipe());`

  `const config = new DocumentBuilder()`  
   `.setTitle('My API')`  
   `.setVersion('1.0')`  
   `.build();`

  `let document = SwaggerModule.createDocument(app, config);`  
  `document = cleanupArkTypeOpenApiDoc(document); // 後処理を適用`

  `SwaggerModule.setup('api', app, document);`

  `await app.listen(3000);`  
`}`  
`bootstrap();`

### **エッジケースと今後の考慮事項**

* **複雑な型**: ArkTypeの交差型（&）や判別共用体（discriminated unions）は、OpenAPIのallOfやoneOfにマッピングする必要がある。toJsonSchema()の現在の実装がこれらをどのように扱うか、さらなる検証が必要となる。  
* **ArkTypeの進化**: ArkTypeのメタデータAPIが将来的に拡充されれば、arkWithMetaのようなカスタムヘルパーは不要になり、実装がさらに簡素化される可能性がある。ライブラリの進化を継続的に監視し、追従することが望ましい。  
* **パフォーマンス**: 非常に大規模で複雑なスキーマの場合、toJsonSchema()の変換プロセスがパフォーマンスに与える影響を考慮する必要があるかもしれない。ただし、通常のリクエスト/レスポンスサイクルでは、この変換はアプリケーション起動時に一度行われるだけであるため、大きな問題になる可能性は低い。

以上の調査と設計に基づき、createArkTypeDtoアプローチは、ArkTypeの性能とNestJSの堅牢なエコシステムを融合させるための、技術的に健全かつ優れた戦略であると結論付ける。

#### **引用文献**

1\. Type API \- ArkType, https://arktype.io/docs/type-api 2\. Schema definition with zod · mikro-orm mikro-orm · Discussion \#5102 \- GitHub, https://github.com/mikro-orm/mikro-orm/discussions/5102 3\. How I Built a Type-Safe API with Auto-Generated Documentation Using Zod \+ NestJS \+ OpenAPI (Complete Tutorial) | by Gildas Niyigena | Medium, https://medium.com/@gildniy/how-i-built-a-type-safe-api-with-auto-generated-documentation-using-zod-nestjs-openapi-f91c2abd8f08 4\. All NestJS \+ Zod utilities you need \- GitHub, https://github.com/BenLorantfy/nestjs-zod 5\. Deep Dive: NestJS \+ Zod Integration Architecture \- HackMD, https://hackmd.io/UVRGb-LoQPK7a2Obls\_iAw 6\. \`createZodDto\` doesnt generate openapi spec for param · Issue \#23 · BenLorantfy/nestjs-zod \- GitHub, https://github.com/risen228/nestjs-zod/issues/23 7\. A few ideas · Issue \#65 · BenLorantfy/nestjs-zod \- GitHub, https://github.com/risen228/nestjs-zod/issues/65 8\. NestJS helper to easily use Zod with OpenAPI \- GitHub, https://github.com/wahyubucil/nestjs-zod-openapi 9\. \[Feature Request\] support \`toJSONSchema\` · Issue \#21 · standard-schema/standard-schema \- GitHub, https://github.com/standard-schema/standard-schema/issues/21 10\. Allow string format as metadata associated with JSON schema ..., https://github.com/arktypeio/arktype/issues/1110 11\. ZOD to swagger API Dto class for nestjs swagger \- Stack Overflow, https://stackoverflow.com/questions/77568689/zod-to-swagger-api-dto-class-for-nestjs-swagger 12\. unpkg.com, https://unpkg.com/nestjs-zod@1.2.1/README.md 13\. @rhyek/nestjs-zod CDN by jsDelivr \- A CDN for npm and GitHub, https://www.jsdelivr.com/package/npm/@rhyek/nestjs-zod 14\. nestjs-zod \- NPM, https://npmjs.com/package/nestjs-zod 15\. ArkType \`toJsonSchema\` returning not open-api compatible schema ..., https://www.answeroverflow.com/m/1344692821671678112 16\. OpenAPI Specification \- oRPC \- unnoq, https://orpc.unnoq.com/docs/openapi/openapi-specification 17\. API Reference | Vovk.ts, https://vovk.dev/api-ref 18\. Adopting Standard Schema · Issue \#164 · modelcontextprotocol/typescript-sdk \- GitHub, https://github.com/modelcontextprotocol/typescript-sdk/issues/164 19\. \[Forms\] Extracting Defaults from a schema \#11 \- GitHub, https://github.com/standard-schema/standard-schema/issues/11 20\. Custom decorators | NestJS \- A progressive Node.js framework, https://docs.nestjs.com/custom-decorators 21\. OpenAPI Plugin \- ElysiaJS, https://elysiajs.com/plugins/openapi