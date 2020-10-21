const { promises: { mkdir }, rmdirSync } = require('fs')
const Registry = require('../src/registry.js')
const path = require('path')

const REG_DIR = path.join(__dirname, 'registries')
const TMP_REG_DIR = path.join(__dirname, 'tmp-registries')
const REGISTRY_PATH = path.join(REG_DIR, 'test-registry.json')
const BAD_REGISTRY_PATH = path.join(REG_DIR, 'bad-registry.json')
const TMP_REGISTRY_PATH = path.join(TMP_REG_DIR, 'tmp-registry.json')

it('should construct a new make process object', () => {
    const registry = new Registry(REGISTRY_PATH)
    expect(registry._filepath).toBe(REGISTRY_PATH)
    expect(registry._registry).toStrictEqual({})
})
describe('Update', () => {
    it('should register a new program', () => {
        const registry = new Registry()
        const status = 'building'
        const path = 'a/path'
        registry.update('prog', status, path)
        expect(registry._registry).toStrictEqual({ prog: { status, path } })
    })
    it('should update an existing program status', () => {
        const registry = new Registry()
        const path = 'a/path'
        registry.update('prog', '', path)
        expect(registry._registry).toStrictEqual({ prog: { status: '', path } })
        const status = 'building'
        registry.update('prog', status)
        expect(registry._registry).toStrictEqual({ prog: { status, path } })
    })
    it('should not update existing to non-string falsy paths', () => {
        const registry = new Registry()
        registry.update('prog', '')
        expect(registry._registry).toStrictEqual({
            prog: { status: '', path: '' }
        })
        registry.update('prog', '', false)
        expect(registry._registry).toStrictEqual({
            prog: { status: '', path: '' }
        })
    })
    it('should update an existing program status and path', () => {
        const registry = new Registry()
        registry.update('prog')
        expect(registry._registry).toStrictEqual({
            prog: { status: undefined, path: '' }
        })
        const status = 'building'
        const path = 'a/path'
        registry.update('prog', status, path)
        expect(registry._registry).toStrictEqual({ prog: { status, path } })
    })
})
describe('Setup', () => {
    it('should read existing registry', async () => {
        const registry = new Registry(REGISTRY_PATH)
        await registry.setup()
        expect(registry._registry).toStrictEqual({
            goodby: { status: 'failed', path: 'bad/path' },
            hello: { status: 'completed', path: '../data/hello' }
        })
    })
    it('should not read existing registry', async () => {
        const registry = new Registry(REGISTRY_PATH)
        await registry.setup(false)
        expect(registry._registry).toStrictEqual({})
    })
    it('should fail to read invalid-json registry', async () => {
        const registry = new Registry(BAD_REGISTRY_PATH)
        await registry.setup()
        expect(registry._registry).toStrictEqual({})
    })
    it('should fail to read non-existent registry', async () => {
        const registry = new Registry('foo/bar')
        await registry.setup()
        expect(registry._registry).toStrictEqual({})
    })
})
it('should get list of registered programs', async () => {
    const registry = new Registry(REGISTRY_PATH)
    await registry.setup()
    expect(registry.programs).toStrictEqual([
        { program: 'goodby', status: 'failed' },
        { program: 'hello', status: 'completed' }
    ])
})
describe('Storage', () => {
    beforeEach(() => mkdir(TMP_REG_DIR))
    afterEach(() => rmdirSync(TMP_REG_DIR, { recursive: true }))
    it('should save the registry to a file', async () => {
        const registry = new Registry(TMP_REGISTRY_PATH)
        registry._registry = {
            goodby: { status: 'failed', path: 'bad/path' },
            hello: { status: 'completed', path: '../data/hello' }
        }
        await registry.save()
        await registry.setup()
        expect(registry.programs).toStrictEqual([
            { program: 'goodby', status: 'failed' },
            { program: 'hello', status: 'completed' }
        ])
    })
})
describe('Get Program', () => {
    it('should get a registered program by name', async () => {
        const registry = new Registry()
        registry._registry = {
            goodby: { status: 'failed', path: 'bad/path' },
            hello: { status: 'completed', path: '../data/hello' }
        }
        expect(registry.getProgram('hello')).toStrictEqual(
            { status: 'completed', path: '../data/hello' }
        )
    })
    it('should return default when getting unregistered program', async () => {
        const registry = new Registry()
        expect(registry.getProgram('hello')).toStrictEqual(
            { status: '', path: '' }
        )
    })
})
