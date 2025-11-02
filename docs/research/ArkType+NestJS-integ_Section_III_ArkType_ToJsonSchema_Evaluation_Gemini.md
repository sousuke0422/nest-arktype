## **III. ArkTypeのtoJsonSchema()：基盤の評価**

本セクションでは、スキーマ変換の中核をなすtoJsonSchema()メソッドの能力と限界を評価し、その欠点を緩和するための戦略を策定する。

### **OpenAPI 3.0/3.1 互換性分析**

ArkTypeのtoJsonSchema()メソッドは、有効なJSON Schemaを生成することを目的として開発されたが、OpenAPI仕様への準拠は当初の主要な目標ではなかった 。その結果、特にユニオン型やenumの表現において、一部互換性の問題が報告されている。ArkTypeのメンテナーはこの問題を認識しており、改善に対して前向きな姿勢を示している 。  
一方で、orpc や vovk といった他のフレームワークでは、toJsonSchema()がOpenAPI生成のために成功裏に利用されており、このメソッドが基本的には実用可能であることを示している。  
最も注意すべき課題は、オプショナルなプロパティとnullableなプロパティの表現である。前述の通り、OpenAPI 3.0と3.1ではnullableの表現方法が異なる。ArkTypeの"string | null"のようなユニオン型は、{"anyOf": [{"type": "string"}, {"type": "null"}]}というOpenAPI 3.1形式のスキーマに変換される可能性が高い。我々のcleanupArkTypeOpenApiDoc()後処理関数は、ターゲットがOpenAPI 3.0の場合にこれを{"type": "string", "nullable": true}に変換する責務を負うことになる。

### **メタデータ注入戦略 (description, example, format)**

ArkTypeは.describe()メソッドを提供しており、Typeインスタンスにdescriptionプロパティを追加できる 。しかし、exampleやOpenAPI固有のformatといった任意のメタデータをスキーマに付与するための、標準化された組み込みAPIは現時点では存在しない。  
この機能の必要性はコミュニティでも活発に議論されており、より堅牢なメタデータ機能を求める提案がなされている 。特に、日付文字列に対してformatキーワードを付与したいという要求は、このニーズを象徴する好例である 。  
この課題に対する我々の解決策として、arkWithMeta(type, metadata)というヘルパー関数の導入を提案する。この関数は、ArkTypeのtypeオブジェクトとメタデータオブジェクトを受け取り、それらをカプセル化したプロキシまたはラッパーオブジェクトを返す。そして、_OPENAPI_METADATA_FACTORY内でtoJsonSchema()を呼び出した後、このラッパーの存在をチェックし、もし存在すればメタデータを抽出して最終的なJSON Schemaオブジェクトにマージする。このアプローチにより、ArkType本体の変更を待つことなく、必要な機能を即座に提供できる。

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
| Nullableユニオン (`"string | null"`) | N/A (ネイティブ) | {"anyOf": [{"type": "string"}, {"type": "null"}]} |