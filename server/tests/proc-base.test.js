const Base = require('../src/proc/base.js')
const MockProc = require('./mock-proc.js')

let base
beforeEach(() => {
    if (base) {
        base.stop()
    }
    base = new Base(process.execPath)
})

it('should construct a new base process object', () => {
    expect(base._cmd).toBe(process.execPath)
    expect(base._childProc).toBe(null)
})
describe('Run', () => {
    it('should run a successful command', async () => {
        base._spawnProcess = () => new MockProc(['some output'])
        base.on('message', msg => expect(msg).toBe('some output'))
        const code = await base._run(['arg'])
        expect(code).toBe(0)
    })
    it('should run a bad command', async () => {
        base._spawnProcess = () => new MockProc([], ['some error'])
        base.stop = jest.fn()
        try {
            await base._run(['badarg'])
        } catch (err) {
            expect(err).toBe('some error')
        }
        expect(base.stop).toHaveBeenCalledTimes(1)
    })
    it('should fail to run command', async () => {
        base._spawnProcess = () => new MockProc()
        base.stop = jest.fn()
        try {
            await base._run(['arg'])
        } catch (err) {
            expect(err).toBe('failed')
        }
        expect(base.stop).toHaveBeenCalledTimes(1)
    })
    it('should only run one command at a time', async () => {
        base._spawnProcess = () => new MockProc([])
        base._run()
        try {
            await base._run(['argb'])
        } catch (err) {
            expect(err.toString()).toMatch(/Process already exists on pid: \d+/)
        }
    })
})
it('should stop a running process', () => {
    base._spawnProcess = () => new MockProc([])
    base._run(['arg'])
    const code = base.stop()
    expect(code).toBe(1)
})
