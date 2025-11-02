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

### **統合の秘訣：_OPENAPI_METADATA_FACTORYの解明**

本調査における最も重要な発見は、createZodDtoによって生成されたクラスに実装されている_OPENAPI_METADATA_FACTORYという名前の静的メソッドの存在である 。  
このメソッドは、@nestjs/swaggerモジュールによって認識される特別なフックとして機能する。SwaggerモジュールがDTOクラスをスキャンする際、この静的メソッドの存在を検知すると、個々のプロパティに付与された@ApiPropertyデコレータをリフレクションする標準的なプロセスを完全にバイパスする。代わりに、_OPENAPI_METADATA_FACTORYメソッドを直接呼び出し、その返り値を当該DTOのOpenAPIスキーマオブジェクトとして採用する。  
@nestjs/zodの内部では、このファクトリメソッドがzodToOpenAPI(schema)を呼び出し、ZodスキーマをOpenAPI互換のJSON Schemaオブジェクトに変換している 。  
この発見は、統合戦略の方向性を根本的に決定づける。当初の仮説では、動的に生成したクラスの各プロパティに対して@ApiPropertyデコレータをプログラム的に適用する方法を模索していた。しかし、@nestjs/zodの実装は、よりクリーンで効率的な代替案を提示している。この_OPENAPI_METADATA_FACTORYパターンは、スキーマ全体を一つのアトミックな操作で提供するため、プロパティごとの複雑なリフレクション処理を不要にする。  
このメカニズムは、@nestjs/swaggerが特定のライブラリに依存せず、拡張可能な設計になっていることを示唆している。任意のスキーマライブラリは、この規約（_OPENAPI_METADATA_FACTORYという名前の静的メソッドを持つクラスを生成すること）に従う限り、@nestjs/swaggerとシームレスに統合できる。したがって、我々が実装するcreateArkTypeDtoは、この静的メソッドを正確に実装することが必須要件となる。

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

これらのメタデータは、zod-to-json-schemaによって解釈され、_OPENAPI_METADATA_FACTORYが返す最終的なJSON Schemaオブジェクト内の対応するフィールド（description、exampleなど）に変換される。これにより、スキーマ定義に書かれたメタデータが、そのままSwagger UIに表示されるというクリーンなパイプラインが実現されている。  
我々のArkTypeソリューションも、このパイプラインを模倣する必要がある。ArkTypeのネイティブなメタデータ機能は発展途上であり、description以外の任意のメタデータ（例：example）を付与する標準的な方法はまだ確立されていない 。この課題を解決するためには、メタデータを外部からアタッチし、toJsonSchemaの変換ロジック内でそれを読み取ってマージするような、小さなラッパー関数やヘルパーを独自に作成する必要がある。

### **patchNestJsSwagger() / cleanupOpenApiDoc() の役割**

@nestjs/zodのドキュメントや関連Issueでは、patchNestjsSwagger() や cleanupOpenApiDoc() といった、セットアップ時の追加ステップに言及されている。これらの関数は、zod-to-json-schemaが生成するスキーマと、特定のOpenAPIバージョンとの間の微細な非互換性を吸収するために存在する。  
例えば、nullableな値の表現方法は、OpenAPI 3.0と3.1で異なる。OpenAPI 3.0ではnullable: trueというプロパティを使用するが、OpenAPI 3.1ではanyOfと{ "type": "null" }の組み合わせが推奨される 。cleanupOpenApiDoc関数は、SwaggerModule.createDocument()によって生成された*OpenAPIドキュメント全体*を後処理し、このような表現の差異をターゲットバージョンに合わせて正規化する。これは、Swaggerモジュール自体をモンキーパッチする可能性のあるpatchNestjsSwaggerよりも侵襲性の低いアプローチである。  
この後処理戦略は、我々の実装にとっても極めて重要である。ArkTypeのtoJsonSchema()もまた、OpenAPIの特定のバージョンに対して最適でないスキーマを生成する可能性がある 。toJsonSchema()自体を全てのバージョンに完璧に対応させるよう試みるのではなく、@nestjs/zodと同様に、後処理ステップを導入するのが賢明である。  
具体的には、我々のライブラリはcleanupArkTypeOpenApiDoc()のような関数を提供し、ユーザーがSwagger UIをセットアップする直前にこれを呼び出すように案内する。この関数は、生成されたドキュメントツリーを走査し、オプショナルやnullableの表現を正規化することで、幅広い互換性を確保する。これにより、DTOファクトリの実装を、最終的なプレゼンテーション層の詳細から切り離すことができる。
