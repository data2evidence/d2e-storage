#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const REPO_ROOT = process.cwd()
const SRC_DIR = path.join(REPO_ROOT, 'src')
const DENO_JSON = path.join(REPO_ROOT, 'deno.json')
const TREX_PREFIX = '/var/tmp/sb-compile-trex/storage/src/'

function walk(dir) {
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

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('src/ not found; skipping deno import map generation')
    process.exit(0)
  }
  const deno = fs.existsSync(DENO_JSON)
    ? JSON.parse(fs.readFileSync(DENO_JSON, 'utf-8'))
    : { imports: {} }
  deno.imports = deno.imports || {}

  const files = walk(SRC_DIR)
    .filter((f) => /\.(ts|tsx|mts|cts)$/.test(f))
    .filter((f) => !/\.(d|test|spec)\.(ts|tsx|mts|cts)$/.test(f))

  for (const abs of files) {
    const rel = path.relative(SRC_DIR, abs).replace(/\\/g, '/')
    const withoutExt = rel.replace(/\.(ts|tsx|mts|cts)$/, '')
    const spec = TREX_PREFIX + withoutExt
    const target = './src/' + rel
    if (!deno.imports[spec]) {
      deno.imports[spec] = target
    }
  }

  fs.writeFileSync(DENO_JSON, JSON.stringify(deno, null, 2) + '\n')
  console.log(`Updated ${DENO_JSON} with ${files.length} file mappings`)
}

main()


