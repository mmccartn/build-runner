const { rmdirSync } = require('fs')
const EventEmitter = require('events')
const main = require('../')
const path = require('path')

const ARTIFACTS_PATH = path.join(__dirname, 'artifacts')
const REGISTRY_PATH = path.join(__dirname, 'registries', 'main-registry.json')

class MockServer extends EventEmitter {
    constructor() {
        super()
    }
    broadcast() {
        return true
    }
}
const mockPipeline = function(willFail=false) {
    return class {
        constructor() {

        }
        run(name, progPath, artPath, onMessage) {
            if (willFail) {
                throw new Error('failed')
            } else {
                onMessage('built')
            }
        }
    }
}

afterEach(() => rmdirSync(ARTIFACTS_PATH, { recursive: true }))

describe('WebSocket Requests', () => {
    it('should send registered programs when a client connects', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 1 },
            REGISTRY_PATH,
            mockPipeline()
        )
        clearInterval(autoBuildInterval)
        registry.save = jest.fn()
        await new Promise((resolve, reject) => {
            const send = (action, programs) => {
                expect(action).toBe('programs/registered')
                expect(programs).toStrictEqual([])
                resolve()
            }
            server.emit('connect', { send })
        })
    })
    it('should respond to a program registration request and succeed', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 1 },
            REGISTRY_PATH,
            mockPipeline()
        )
        clearInterval(autoBuildInterval)
        registry.update = jest.fn()
        registry.save = jest.fn()
        await new Promise((resolve, reject) => {
            const send = (action, { program, msg }) => {
                expect(action).toBe('build/output')
                expect(program).toBe('prog')
                expect(msg).toBe('built')
                resolve()
            }
            server.emit('program/register', { location: 'path/to/prog' }, { send })
        })
        await new Promise(resolve => registry.save = resolve)
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(1, 'prog', 'building', 'path/to/prog')
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(2, 'prog', 'completed', undefined)
    })
    it('should respond to a program registration request and fail', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 1 },
            REGISTRY_PATH,
            mockPipeline(true)
        )
        clearInterval(autoBuildInterval)
        registry.update = jest.fn()
        registry.save = jest.fn()
        const client = { send: () => {} }
        server.emit('program/register', { location: 'path/to/prog' }, client)
        await new Promise(resolve => registry.save = resolve)
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(1, 'prog', 'building', 'path/to/prog')
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(2, 'prog', 'failed', undefined)
    })
})
describe('Perdiodic Builds', () => {
    it('should perform periodic builds and succeed', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 0.100 },
            REGISTRY_PATH,
            mockPipeline()
        )
        registry._registry = { prog: { status: 'completed', path: 'path/to/prog' } }
        registry.update = jest.fn()
        registry.save = jest.fn()
        await new Promise(resolve => registry.save = resolve)
        clearInterval(autoBuildInterval)
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(1, 'prog', 'building', undefined)
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(2, 'prog', 'completed', undefined)
    })
    it('should perform periodic builds and fail', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 0.100 },
            REGISTRY_PATH,
            mockPipeline(true)
        )
        registry._registry = { prog: { status: 'completed', path: 'path/to/prog' } }
        registry.update = jest.fn()
        registry.save = jest.fn()
        await new Promise(resolve => registry.save = resolve)
        clearInterval(autoBuildInterval)
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(1, 'prog', 'building', undefined)
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(2, 'prog', 'failed', undefined)
    })
})
