const Git = require('../src/proc/git.js')
const MockProc = require('./mock-proc.js')

let git
beforeEach(() => {
    if (git) {
        git.stop()
    }
    git = new Git()
})

it('should construct a new git process object', () => {
    expect(git._cmd).toBe('git')
})
it('should git pull', async () => {
    git._spawnProcess = () => new MockProc(['some output'])
    git.on('message', msg => expect(msg).toBe('some output'))
    const code = await git.pull()
    expect(code).toBe(0)
})
it('should get the commit revision', async () => {
    git._spawnProcess = () => new MockProc(['97dd2ae'])
    const rev = await git.revision()
    expect(rev).toBe('97dd2ae')
})
it('should fail to get the commit revision', async () => {
    git._spawnProcess = () => new MockProc([], ['some error'])
    try {
        const rev = await git.revision()
    } catch (err) {
        expect(err).toBe('some error')
    }
})
