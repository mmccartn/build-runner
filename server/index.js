#!/usr/bin/env node
const { ArgumentParser, ArgumentDefaultsHelpFormatter } = require('argparse')
const { description, version } = require('./package.json')
const { promises: { mkdir } } = require('fs')
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
    // helper function to notify ws-clients of all individual registry updates
    const updateRegistry = function(program, status, path) {
        registry.update(program, status, path)
        return server.broadcast('registry/update', { program, status })
    }

    // send list of current registered programs to any new clients
    server.on('connect', client => {
        return client.send('programs/registered', registry.programs)
    })

    // listen for registration requests
    server.on('program/register', async ({ location }, client) => {
        // get the program name from the basename of the program location (path)
        const name = path.basename(location)
        await updateRegistry(name, STATUS.building, location)
        const onMessage = msg => client.send('build/output', { program: name, msg })
        try {
            await new Pipeline().run(name, location, artifacts_path, onMessage)
            await updateRegistry(name, STATUS.completed)
        } catch (err) {
            await onMessage(err.toString())
            await updateRegistry(name, STATUS.failed)
        }
        return registry.save()
    })

    // schedule automatic asynchronous builds on an interval
    const autoBuildInterval = setInterval(async () => {
        await Promise.all(registry.names.map(async name => {
            await updateRegistry(name, STATUS.building)
            try {
                const { path } = registry.getProgram(name)
                await new Pipeline().run(name, path, artifacts_path, () => {})
                await updateRegistry(name, STATUS.completed)
            } catch (err) {
                await updateRegistry(name, STATUS.failed)
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
