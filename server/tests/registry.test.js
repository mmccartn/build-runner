const { promises: { mkdir }, rmdirSync } = require('fs')
const path = require('path')
const Registry = require('../src/registry.js')
const testRegistry = require('./registries/test-registry.json')

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
        const entry = registry.update('prog', 'e68799a', 'building', 'path/to/prog')
        expect(registry._registry[entry.id]).toStrictEqual(entry)
    })
    it('should update an existing program status', () => {
        const registry = new Registry()
        let entry = registry.update('prog', 'e68799a', 'building', 'path/to/prog')
        expect(registry._registry[entry.id].status).toBe('building')
        entry = registry.update('prog', 'e68799a', 'failed', 'path/to/prog')
        expect(registry._registry[entry.id].status).toBe('failed')
    })
    it('should not update location if falsy', () => {
        const registry = new Registry()
        let entry = registry.update('prog', 'e68799a', 'building', 'path/to/prog')
        expect(registry._registry[entry.id].location).toBe('path/to/prog')
        entry = registry.update('prog', 'e68799a', 'building', '')
        expect(registry._registry[entry.id].location).toBe('path/to/prog')
    })
})
describe('Setup', () => {
    it('should read existing registry', async () => {
        const registry = new Registry(REGISTRY_PATH)
        await registry.setup()
        expect(registry._registry).toStrictEqual(testRegistry)
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
    expect(registry.programs).toStrictEqual(Object.values(testRegistry))
})
describe('Storage', () => {
    beforeEach(() => mkdir(TMP_REG_DIR))
    afterEach(() => rmdirSync(TMP_REG_DIR, { recursive: true }))
    it('should save the registry to a file', async () => {
        const registry = new Registry(TMP_REGISTRY_PATH)
        registry._registry = { ...testRegistry }
        await registry.save()
        await registry.setup()
        expect(registry.programs).toStrictEqual(Object.values(testRegistry))
    })
})
describe('Get Program', () => {
    it('should get a registered program by name', () => {
        const registry = new Registry()
        registry._registry = { ...testRegistry }
        const first = Object.values(testRegistry)[0]
        expect(registry.getProgram(first.name, first.revision)).toStrictEqual(first)
    })
})
it('should shallow clone the internal state object', () => {
    const registry = new Registry()
    const toClone = { ...testRegistry }
    registry._registry = toClone
    expect(registry.clone).toStrictEqual(toClone)
    expect(registry.clone).not.toBe(toClone)
})
it('should remove an entry', async () => {
    const registry = new Registry()
    registry._registry = { ...testRegistry }
    const first = Object.values(testRegistry)[0]
    registry.remove(first.name, first.revision)
    expect(registry._registry[first.id]).toBeFalsy()
})
