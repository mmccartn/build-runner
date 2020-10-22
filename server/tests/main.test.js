const { rmdirSync } = require('fs')
const EventEmitter = require('events')
const main = require('../')
const path = require('path')

const TEST_REV_A = '97dd2ae'
const TEST_REV_B = '14ea7fa'
const TEST_PATH = 'path/to/prog'
const ARTIFACTS_PATH = path.join(__dirname, 'artifacts')
const REGISTRY_PATH = path.join(__dirname, 'registries', 'main-registry.json')
const TEST_ENTRY = {
    name: 'prog',
    revision: TEST_REV_A,
    location: TEST_PATH
}

class MockServer extends EventEmitter {
    constructor() {
        super()
    }
    broadcast() {
        return true
    }
}
const mockPipeline = function(willExist=true, rev=TEST_REV_A, willFail=false) {
    return class {
        constructor(progPath) {
            this.name = path.basename(progPath)
        }
        run(revision, artPath, onMessage) {
            if (willFail) {
                throw new Error('failed')
            } else {
                onMessage('built')
            }
        }
        get exists() {
            return willExist
        }
        update() {
            if (!willFail) {
                return true
            } else {
                throw new Error()
            }
        }
        revision() {
            if (rev) {
                return rev
            } else {
                throw new Error()
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
        await new Promise((resolve, reject) => {
            const send = (action, programs) => {
                expect(action).toBe('programs/registered')
                expect(programs).toStrictEqual({})
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
            server.emit('program/register', { location: TEST_PATH }, { send })
        })
        await new Promise(resolve => registry.save = resolve)
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(1, 'prog', TEST_REV_A, 'building', TEST_PATH)
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(2, 'prog', TEST_REV_A, 'completed', undefined)
    })
    it('should respond to a program registration request and not find program', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 1 },
            REGISTRY_PATH,
            mockPipeline(false)
        )
        clearInterval(autoBuildInterval)
        await new Promise((resolve, reject) => {
            const send = (action, { program, msg }) => {
                expect(msg).toBe(`No program found at: ${TEST_PATH}`)
                resolve()
            }
            server.emit('program/register', { location: TEST_PATH }, { send })
        })
    })
    it('should respond to a program registration request and fail revision', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 1 },
            REGISTRY_PATH,
            mockPipeline(true, false)
        )
        clearInterval(autoBuildInterval)
        await new Promise((resolve, reject) => {
            const send = (action, { program, msg }) => {
                expect(msg).toBe('Failed to get git revision for: prog')
                resolve()
            }
            server.emit('program/register', { location: TEST_PATH }, { send })
        })
    })
    it('should respond to a program registration request and find existing', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 1 },
            REGISTRY_PATH,
            mockPipeline()
        )
        clearInterval(autoBuildInterval)
        registry.getProgram = () => true
        await new Promise((resolve, reject) => {
            const send = (action, { program, msg }) => {
                expect(msg).toBe('Already registered program: prog')
                resolve()
            }
            server.emit('program/register', { location: TEST_PATH }, { send })
        })
    })
    it('should respond to a program registration request and fail', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 1 },
            REGISTRY_PATH,
            mockPipeline(true, TEST_REV_A, true)
        )
        clearInterval(autoBuildInterval)
        registry.update = jest.fn()
        registry.save = jest.fn()
        await new Promise((resolve, reject) => {
            const send = (action, { program, msg }) => {
                expect(msg).toBe('Error: failed')
                resolve()
            }
            server.emit('program/register', { location: TEST_PATH }, { send })
        })
        await new Promise(resolve => registry.save = resolve)
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(2, 'prog', TEST_REV_A, 'failed', undefined)
    })
})
describe('Perdiodic Builds', () => {
    it('should perform periodic builds and not find program', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 0.100 },
            REGISTRY_PATH,
            mockPipeline(false)
        )
        registry._registry = {}
        registry._registry[`prog-${TEST_REV_A}`] = TEST_ENTRY
        registry.remove = jest.fn()
        registry.save = jest.fn()
        await new Promise(resolve => registry.save = resolve)
        clearInterval(autoBuildInterval)
        expect(
            registry.remove
        ).toHaveBeenCalledWith('prog', TEST_REV_A)
    })
    it('should perform periodic builds and not get revision', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 0.100 },
            REGISTRY_PATH,
            mockPipeline(true, false, true)
        )
        registry._registry = {}
        registry._registry[`prog-${TEST_REV_A}`] = TEST_ENTRY
        registry.remove = jest.fn()
        registry.save = jest.fn()
        await new Promise(resolve => registry.save = resolve)
        clearInterval(autoBuildInterval)
        expect(
            registry.remove
        ).toHaveBeenCalledWith('prog', TEST_REV_A)
    })
    it('should perform periodic builds and succeed', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 0.100 },
            REGISTRY_PATH,
            mockPipeline(true, TEST_REV_B)
        )
        registry._registry = {}
        registry._registry[`prog-${TEST_REV_A}`] = TEST_ENTRY
        registry.update = jest.fn()
        registry.save = jest.fn()
        await new Promise(resolve => registry.save = resolve)
        clearInterval(autoBuildInterval)
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(1, 'prog', TEST_REV_B, 'building', TEST_PATH)
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(2, 'prog', TEST_REV_B, 'completed', undefined)
    })
    it('should perform periodic builds and fail', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 0.100 },
            REGISTRY_PATH,
            mockPipeline(true, TEST_REV_B, true)
        )
        registry._registry = {}
        registry._registry[`prog-${TEST_REV_A}`] = TEST_ENTRY
        registry.update = jest.fn()
        registry.save = jest.fn()
        await new Promise(resolve => registry.save = resolve)
        clearInterval(autoBuildInterval)
        expect(
            registry.update
        ).toHaveBeenNthCalledWith(2, 'prog', TEST_REV_B, 'failed', undefined)
    })
    it('should perform periodic builds and find existing', async () => {
        const server = new MockServer()
        const { autoBuildInterval, registry } = await main(
            server,
            { artifacts_path: ARTIFACTS_PATH, build_interval: 0.100 },
            REGISTRY_PATH,
            mockPipeline(true, TEST_REV_B)
        )
        registry.getProgram = () => true
        registry._registry = {}
        registry._registry[`prog-${TEST_REV_A}`] = TEST_ENTRY
        registry.save = jest.fn()
        registry.update = jest.fn()
        await new Promise(resolve => registry.save = resolve)
        expect(registry.update).not.toHaveBeenCalled()
        clearInterval(autoBuildInterval)
    })
})
