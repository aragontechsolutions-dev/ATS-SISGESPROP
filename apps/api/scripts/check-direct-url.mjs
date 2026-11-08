// Comprueba DIRECT_URL antes de migrar o cargar el seed, con un mensaje claro.
// Sin esto, Prisma solo dice "datasource.url property is required", que no explica qué falta.
// Nunca imprime el valor (lleva la contraseña de la base).
const value = process.env.DIRECT_URL?.trim() ?? '';

function fail(reason) {
  console.error(`✖ DIRECT_URL: ${reason}`);
  console.error('  Debe ser la cadena del *session pooler* de Supabase (puerto 5432), sin comillas.');
  process.exit(1);
}

if (!value) fail('no está definida en este entorno (variable de entorno vacía).');
if (/^["']|["']$/.test(value)) fail('no debe ir entre comillas.');
let url;
try {
  url = new URL(value);
} catch {
  fail('no es una URL válida (¿caracteres especiales de la contraseña sin codificar?).');
}
if (!['postgresql:', 'postgres:'].includes(url.protocol) || !url.hostname) {
  fail('debe empezar con postgresql:// e incluir el host.');
}
if (url.port === '6543') {
  fail('apunta al transaction pooler (6543); las migraciones necesitan el session pooler (5432).');
}
console.log(`✔ DIRECT_URL definida (host ${url.hostname}, puerto ${url.port || '5432'}).`);
