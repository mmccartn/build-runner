#!/usr/bin/env node
const { ArgumentParser, ArgumentDefaultsHelpFormatter } = require('argparse')
const { description, version } = require('./package.json')
const { promises: { mkdir }, rmdirSync } = require('fs')
const { Server } = require('ws-plus')
const path = require('path')
const PipelineClass = require('./src/pipeline.js')
const Registry = require('./src/registry.js')

const REGISTRY_PATH = path.join(__dirname, 'registry.json')
const STATUS = { building: 'building', completed: 'completed', failed: 'failed' }

const main = async function (
    server,
    { artifacts_path, build_interval },
    registryPath,
    Pipeline
) {
    // create the storage directories in case either doesn't already exist
    await mkdir(artifacts_path, { recursive: true })
    await mkdir(path.dirname(registryPath), { recursive: true })

    const registry = new Registry(registryPath)
    await registry.setup()
    // helper functions to notify ws-clients of all individual registry updates
    const updateRegistry = function(name, revision, status, location) {
        const entry = registry.update(name, revision, status, location)
        return server.broadcast('registry/update', entry)
    }
    const removeRegistry = function(name, revision, artPath) {
        const artifacts = path.join(artPath, revision, name)
        rmdirSync(artifacts, { recursive: true })
        registry.remove(name, revision)
        const id = Registry.genId(name, revision)
        return server.broadcast('registry/remove', { id })
    }

    // send list of current registered programs to any new clients
    server.on('connect', client => {
        return client.send('programs/registered', registry.clone)
    })

    // listen for registration requests
    server.on('program/register', async ({ location }, client) => {
        const pipeline = new Pipeline(location)
        const name = pipeline.name
        const onMessage = msg => {
            return client.send('build/output', { program: name, msg })
        }
        if (!pipeline.exists) {
            return onMessage(`No program found at: ${location}`)
        }
        let revision
        try {
            revision = await pipeline.revision()
        } catch (err) {
            return onMessage(`Failed to get git revision for: ${name}`)
        }
        if (registry.getProgram(name, revision)) {
            return onMessage(`Already registered program: ${name}`)
        }
        await updateRegistry(name, revision, STATUS.building, location)
        try {
            await pipeline.run(revision, artifacts_path, onMessage)
            await updateRegistry(name, revision, STATUS.completed)
        } catch (err) {
            await onMessage(err.toString())
            await updateRegistry(name, revision, STATUS.failed)
        }
        return registry.save()
    })

    // schedule automatic asynchronous builds on an interval
    const autoBuildInterval = setInterval(async () => {
        await Promise.all(registry.programs.map(async program => {
            const { name, revision, location } = program
            const pipeline = new Pipeline(location)
            if (pipeline.name !== name || !pipeline.exists) {
                // the program has been (re)moved or renamed
                return removeRegistry(name, revision, artifacts_path)
            }
            try {
                await pipeline.update()
            } catch (err) {
                // ignore pull errors in favor of revision comparison
            }
            let newRev
            try {
                newRev = await pipeline.revision()
            } catch (err) { // no longer a git repository
                return removeRegistry(name, revision, artifacts_path)
            }
            if (newRev && !registry.getProgram(name, newRev)) {
                await updateRegistry(name, newRev, STATUS.building, location)
                try {
                    await pipeline.run(newRev, artifacts_path, () => {})
                    await updateRegistry(name, newRev, STATUS.completed)
                } catch (err) {
                    await updateRegistry(name, newRev, STATUS.failed)
                }
            }
        }))
        return registry.save()
    }, build_interval * 1000)

    return { autoBuildInterval, registry } // for testing
}

/* istanbul ignore if */
if (require.main === module) {
    // parse application command line arguments
    const parser = new ArgumentParser({
        add_help: true,
        description,
        formatter_class: ArgumentDefaultsHelpFormatter
    })
    parser.add_argument(
        '-v', '--version',
        { action: 'version', help: 'show program\'s version number and exit', version }
    )
    parser.add_argument(
        '-a', '--artifacts-path',
        { help: 'Path to directory for storing program build artifacts', default: path.join(__dirname, 'artifacts') }
    )
    parser.add_argument(
        '-b', '--build-interval',
        { help: 'Seconds delay between automatic rebuild of registered programs', default: 10 }
    )
    parser.add_argument(
        '-p', '--port',
        { help: 'Network port for the WebSocket server', default: 8090 }
    )
    const args = parser.parse_args()

    // start the WebSocket server
    const server = new Server({ port: args.port, host: '0.0.0.0' })

    // stop gracefully when interupted
    process.on('SIGINT', async () => {
        console.info('# Shutting down...')
        await server.close()
        process.exit()
    })

    // start the application
    console.info(`# Starting ${description}`)
    main(server, args, REGISTRY_PATH, PipelineClass)
} else {
    module.exports = main // for testing
}
