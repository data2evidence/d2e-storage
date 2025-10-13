import '@internal/monitoring/otel'
import { FastifyInstance } from 'fastify'
import { IncomingMessage, Server, ServerResponse } from 'node:http'
import { exit } from 'node:process';
import process from 'node:process';
import build from './app.ts'
import buildAdmin from './admin-app.ts'
import { getConfig } from './config.ts'
import {
  runMultitenantMigrations,
  runMigrationsOnTenant,
  startAsyncMigrations,
  listenForTenantUpdate,
  PubSub,
} from '@internal/database'
import { logger, logSchema } from '@internal/monitoring'
import { Queue } from '@internal/queue'
import { registerWorkers } from '@storage/events'
import { AsyncAbortController } from '@internal/concurrency'

import { bindShutdownSignals, createServerClosedPromise, shutdown } from './start/shutdown.ts'

const shutdownSignal = new AsyncAbortController()

bindShutdownSignals(shutdownSignal)

// Start API server
main()
  .then(() => {
    // logSchema.info(logger, '[Server] Started Successfully', {
    //   type: 'server',
    // })
    console.log('[Server] Started Successfully')
  })
  .catch(async (e) => {
    // logSchema.error(logger, 'Server not started with error', {
    //   type: 'startupError',
    //   error: e,
    // })
    console.error('Server not started with error', e)

    // await shutdown(shutdownSignal)
    // process.exit(1)
    throw e
    // exit(1)
    // process.exitCode = 1
  })
  .catch((e) => {
    throw e
    // Deno.exit(1)
    // exit(1)
    // process.exitCode = 1
  })

/**
 * Start Storage API server
 */
async function main() {
  const { databaseURL, isMultitenant, pgQueueEnable } = getConfig()

  // Migrations
  if (isMultitenant) {
    await runMultitenantMigrations()
    await listenForTenantUpdate(PubSub)
  } else {
    await runMigrationsOnTenant(databaseURL)
    console.log('Migrations on tenant db completed')
  }

  // Queue
  // if (pgQueueEnable) {
  //   await Queue.start({
  //     signal: shutdownSignal.nextGroup.signal,
  //     registerWorkers: registerWorkers,
  //   })
  // }

  // Pubsub
  // await PubSub.start({
  //   signal: shutdownSignal.nextGroup.signal,
  // })

  // Start async migrations background process
  // if (isMultitenant && pgQueueEnable) {
  //   startAsyncMigrations(shutdownSignal.nextGroup.signal)
  // }

  // HTTP Server
  console.log('Starting HTTP Server')
  const app = httpServer(shutdownSignal.signal)
  console.log('HTTP Server started')

  // HTTP Admin Server
  if (isMultitenant) {
    httpAdminServer(app, shutdownSignal.signal)
  }
}

/**
 * Starts HTTP API Server
 * @param signal
 */
function httpServer(signal: AbortSignal) {
  const { exposeDocs, requestTraceHeader, port, host } = getConfig()
  const app: FastifyInstance<Server, IncomingMessage, ServerResponse> = build({
    logger: true,
    disableRequestLogging: false,
    exposeDocs,
    requestIdHeader: requestTraceHeader,
  })

  // Add error handler to see what's actually failing
  app.addHook('onError', async (request, reply, error) => {
    console.error('=================================================')
    console.error('ROUTE ERROR:', request.method, request.url)
    console.error('ERROR MESSAGE:', error.message)
    console.error('ERROR STACK:', error.stack)
    console.error('=================================================')
  })

  // Catch unhandled errors in app creation
  app.addHook('onReady', () => {
    console.log('Fastify app is ready, routes registered successfully')
  })

  const closePromise = createServerClosedPromise(app.server, () => {
    // logSchema.info(logger, '[Server] Exited', {
    //   type: 'server',
    // })
    console.log('[Server] Exited')
  })

  try {
    signal.addEventListener(
      'abort',
      async () => {
        // logSchema.info(logger, '[Server] Stopping', {
        //   type: 'server',
        // })
        console.log('[Server] Stopping')
        await app.close()
        console.log('[Server] Exited')
      },
      { once: true }
    )
    app.listen({ port, host, signal })

    return app
  } catch (err) {
    // logSchema.error(logger, `Server failed to start`, {
    //   type: 'serverStartError',
    //   error: err,
    // })
    console.error(`Server failed to start`, err)
    throw err
  }
}

/**
 * Starts HTTP Admin endpoints
 * @param app
 * @param signal
 */
async function httpAdminServer(
  app: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  signal: AbortSignal
) {
  const { adminRequestIdHeader, adminPort, host } = getConfig()

  const adminApp = buildAdmin(
    {
      // logger,
      disableRequestLogging: true,
      requestIdHeader: adminRequestIdHeader,
    },
    app
  )

  const closePromise = createServerClosedPromise(adminApp.server, () => {
    // logSchema.info(logger, '[Admin Server] Exited', {
    //   type: 'server',
    // })
    console.log('[Admin Server] Exited')
  })

  signal.addEventListener(
    'abort',
    async () => {
      // logSchema.info(logger, '[Admin Server] Stopping', {
      //   type: 'server',
      // })
      console.log('[Admin Server] Stopping')

      await adminApp.close()
      console.log('[Admin Server] Exited')
    },
    { once: true }
  )

  try {
    adminApp.listen({ port: adminPort, host, signal })
    console.log('[Admin Server] Started')
  } catch (err) {
    // logSchema.error(adminApp.log, 'Failed to start admin app', {
    //   type: 'adminAppStartError',
    //   error: err,
    // })
    console.error('Failed to start admin app', err)
    throw err
  }
  return adminApp
}

