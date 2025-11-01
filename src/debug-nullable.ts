import { type } from 'arktype';

// Nullable型のスキーマを直接確認
const NullableSchema = type({
  name: 'string',
  'description?': 'string | null',
  metadata: 'string | null',
});

const schema = NullableSchema.toJsonSchema({
  fallback: {
    date: (ctx) => ({ ...ctx.base, type: 'string', format: 'date-time' }),
    predicate: (ctx) => ctx.base,
    morph: (ctx) => ctx.base,
    default: (ctx) => ctx.base,
  },
}) as any;

console.log('Full schema:');
console.log(JSON.stringify(schema, null, 2));

console.log('\n\nmetadata property:');
console.log(JSON.stringify(schema.properties.metadata, null, 2));

console.log('\n\ndescription property:');
console.log(JSON.stringify(schema.properties.description, null, 2));
