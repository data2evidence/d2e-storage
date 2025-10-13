import dotenv from 'dotenv'
dotenv.config()

import { runMigrationsOnTenant } from '@internal/database'
;(async () => {
  const _env = Deno.env.toObject();
  await runMigrationsOnTenant(_env.DATABASE_URL as string)
})()
