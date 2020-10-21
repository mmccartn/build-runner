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

it('should run the pipeline', async () => {
    const pipeline = new Pipeline()
    pipeline._git = MockGit()
    pipeline._make = MockMake()
    const msg = await new Promise(async resolve => {
        let msg
        await pipeline.run(
            'test-prog',
            TEST_PROG_PATH,
            ARTIFACTS_PATH,
            out => msg = out
        )
        resolve(msg)
    })
    expect(msg).toBe('make: build complete')
})
it('should run the pipeline even if git pull fails', async () => {
    const pipeline = new Pipeline()
    pipeline._git = MockGit(true)
    pipeline._make = MockMake(true)
    const msg = await new Promise(async resolve => {
        let msg
        await pipeline.run(
            'test-prog',
            TEST_PROG_PATH,
            ARTIFACTS_PATH,
            err => msg = err
        )
        resolve(msg)
    })
    expect(msg).toBe('git pull: Error: Fatal')
})
it('should not run the pipeline if program does not exist', async () => {
    const pipeline = new Pipeline()
    pipeline._git = MockGit()
    pipeline._make = MockMake()
    try {
        await pipeline.run('data', '/foo/bar')
    } catch (err) {
        expect(err.toString()).toBe('Error: No program at location: /foo/bar')
    }
})
