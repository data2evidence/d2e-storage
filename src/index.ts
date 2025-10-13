import '@internal/monitoring/otel'
import { FastifyInstance } from 'fastify'
import { IncomingMessage, Server, ServerResponse } from 'node:http'
import build from './app.ts'
import buildAdmin from './admin-app.ts'
import { getConfig } from './config.ts'
import {
  runMultitenantMigrations,
  runMigrationsOnTenant,
} from '@internal/database'

// Start API server
main()
  .then(() => {
    console.log('[Server] Started Successfully')
  })
  .catch((e) => {
    console.error('Server not started with error', e)
    throw e
  })

async function main() {
  const { databaseURL, isMultitenant } = getConfig()

  // Migrations
  if (isMultitenant) {
    await runMultitenantMigrations()
  } else {
    await runMigrationsOnTenant(databaseURL)
    console.log('Migrations on tenant db completed')
  }

  // HTTP Server
  console.log('Starting HTTP Server')
  const app = httpServer()
  console.log('HTTP Server started')

  // HTTP Admin Server (if needed)
  if (isMultitenant) {
    httpAdminServer(app)
  }
}

function httpServer() {
  const { exposeDocs, requestTraceHeader, port, host } = getConfig()
  const app: FastifyInstance<Server, IncomingMessage, ServerResponse> = build({
    logger: true,
    disableRequestLogging: false,
    exposeDocs,
    requestIdHeader: requestTraceHeader,
  })

  app.addHook('onError', async (request, reply, error) => {
    console.error('=================================================')
    console.error('ROUTE ERROR:', request.method, request.url)
    console.error('ERROR MESSAGE:', error.message)
    console.error('ERROR STACK:', error.stack)
    console.error('=================================================')
  })

  app.addHook('onReady', () => {
    console.log('Fastify app is ready, routes registered successfully')
  })

  app.listen({ port, host })
  return app
}

function httpAdminServer(app: FastifyInstance<Server, IncomingMessage, ServerResponse>) {
  const { adminRequestIdHeader, adminPort, host } = getConfig()

  const adminApp = buildAdmin(
    {
      disableRequestLogging: true,
      requestIdHeader: adminRequestIdHeader,
    },
    app
  )

  adminApp.listen({ port: adminPort, host })
  console.log('[Admin Server] Started')
  
  return adminApp
}