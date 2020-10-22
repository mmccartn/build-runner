const { rmdirSync } = require('fs')
const Pipeline = require('../src/pipeline.js')
const path = require('path')

const ARTIFACTS_PATH = path.join(__dirname, 'artifacts')
const TEST_PROG_PATH = path.join(__dirname, 'test-prog')

const MockGit = function(willFail=false) {
    return {
        pull() {
            if (willFail) {
                throw new Error('Fatal')
            } else {
                return 0
            }
        },
        revision: () => '97dd2ae'
    }
}
const MockMake = function(willFail=false) {
    return {
        clean: () => 1,
        build: () => 1,
        on(action, cb) {
            if (!willFail) {
                return cb('build complete')
            }
        }
    }
}

afterEach(() => rmdirSync(ARTIFACTS_PATH, { recursive: true }))

it('should construct a pipeline', () => {
    const pipeline = new Pipeline(TEST_PROG_PATH)
    expect(pipeline.name).toBe(path.basename(TEST_PROG_PATH))
    expect(pipeline._progPath).toBe(TEST_PROG_PATH)
    expect(pipeline._git).toBeTruthy()
    expect(pipeline._make).toBeTruthy()
})
it('should execute an update', async () => {
    const pipeline = new Pipeline('')
    pipeline._git = MockGit()
    expect(await pipeline.update()).toBe(0)
})
it('should execute a revision', async () => {
    const pipeline = new Pipeline('')
    pipeline._git = MockGit()
    expect(await pipeline.revision()).toBe(pipeline._git.revision())
})
it('should verify the program path exists', () => {
    expect(new Pipeline(TEST_PROG_PATH).exists).toBeTruthy()
})
it('should run the pipeline', async () => {
    const pipeline = new Pipeline(TEST_PROG_PATH)
    pipeline._git = MockGit()
    pipeline._make = MockMake()
    const msg = await new Promise(async resolve => {
        let msg
        await pipeline.run(
            pipeline._git.revision(),
            ARTIFACTS_PATH,
            out => msg = out
        )
        resolve(msg)
    })
    expect(msg).toBe('make: build complete')
})
