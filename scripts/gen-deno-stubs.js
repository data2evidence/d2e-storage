#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const REPO_ROOT = process.cwd()
const DENO_JSON = path.join(REPO_ROOT, 'deno.json')
const SRC_DIR = path.join(REPO_ROOT, 'src')
const INTERNAL_DIR = path.join(SRC_DIR, 'internal')
const STORAGE_DIR = path.join(SRC_DIR, 'storage')
const STUB_ROOT = path.join(REPO_ROOT, 'deno-stubs')

const TREX_PREFIX = '/var/tmp/sb-compile-trex/storage/src/'

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

function ensureFile(file, content) {
  const dir = path.dirname(file)
  fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(file)) fs.writeFileSync(file, content)
}

function addStubMappings(prefixAlias, trexPrefix, rel, imports, stubPath) {
  const withoutExt = rel.replace(/\\/g, '/').replace(/\.(ts|tsx|mts|cts)$/, '')
  const aliasSpec = `${prefixAlias}${withoutExt}`
  const trexSpec = `${trexPrefix}${withoutExt}`
  imports[aliasSpec] = stubPath
  imports[trexSpec] = stubPath
}

function main() {
  if (!fs.existsSync(DENO_JSON)) {
    console.error('deno.json not found')
    process.exit(1)
  }
  const deno = JSON.parse(fs.readFileSync(DENO_JSON, 'utf-8'))
  deno.imports = deno.imports || {}

  const emptyStub = 'export {}\n'

  const internalFiles = walk(INTERNAL_DIR).filter((f) => /\.(ts|tsx|mts|cts)$/.test(f))
  const storageFiles = walk(STORAGE_DIR).filter((f) => /\.(ts|tsx|mts|cts)$/.test(f))

  let count = 0

  for (const abs of internalFiles) {
    const rel = path.relative(SRC_DIR, abs) // internal/.../file.ts
    const stubRel = path.join('internal', rel.substring('internal/'.length))
    const stubAbs = path.join(STUB_ROOT, stubRel)
    ensureFile(stubAbs, emptyStub)
    const stubSpec = './' + path.posix.join('deno-stubs', stubRel.replace(/\\/g, '/'))
    addStubMappings('@internal/', TREX_PREFIX + 'internal/', rel.substring('internal/'.length), deno.imports, stubSpec)
    count++
  }

  for (const abs of storageFiles) {
    const rel = path.relative(SRC_DIR, abs) // storage/.../file.ts
    const stubRel = path.join('storage', rel.substring('storage/'.length))
    const stubAbs = path.join(STUB_ROOT, stubRel)
    ensureFile(stubAbs, emptyStub)
    const stubSpec = './' + path.posix.join('deno-stubs', stubRel.replace(/\\/g, '/'))
    addStubMappings('@storage/', TREX_PREFIX + 'storage/', rel.substring('storage/'.length), deno.imports, stubSpec)
    count++
  }

  fs.writeFileSync(DENO_JSON, JSON.stringify(deno, null, 2) + '\n')
  console.log(`Generated ${count} stub mappings and files`)
}

main()


