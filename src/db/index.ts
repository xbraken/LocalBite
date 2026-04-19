import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import { relations as schemaRelations } from './schema'

function createDb() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? 'file:./local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })
  return drizzle(client, { schema })
}

declare global {
  // eslint-disable-next-line no-var
  var _db: ReturnType<typeof createDb> | undefined
}

export const db = global._db ?? (global._db = createDb())
