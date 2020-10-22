const { rmdirSync } = require('fs')
const Project = require('../src/project.js')
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

it('should construct a project', () => {
    const project = new Project(TEST_PROG_PATH)
    expect(project.name).toBe(path.basename(TEST_PROG_PATH))
    expect(project._progPath).toBe(TEST_PROG_PATH)
    expect(project._git).toBeTruthy()
    expect(project._make).toBeTruthy()
})
it('should execute an update', async () => {
    const project = new Project('')
    project._git = MockGit()
    expect(await project.update()).toBe(0)
})
it('should execute a revision', async () => {
    const project = new Project('')
    project._git = MockGit()
    expect(await project.revision()).toBe(project._git.revision())
})
it('should verify the program path exists', () => {
    expect(new Project(TEST_PROG_PATH).exists).toBeTruthy()
})
it('should build the project', async () => {
    const project = new Project(TEST_PROG_PATH)
    project._git = MockGit()
    project._make = MockMake()
    const msg = await new Promise(async resolve => {
        let msg
        await project.build(
            project._git.revision(),
            ARTIFACTS_PATH,
            out => msg = out
        )
        resolve(msg)
    })
    expect(msg).toBe('make: build complete')
})
