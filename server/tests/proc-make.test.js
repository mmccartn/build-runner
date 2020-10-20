const Make = require('../src/proc/make.js')
const MockProc = require('./mock-proc.js')

let make
beforeEach(() => {
    if (make) {
        make.stop()
    }
    make = new Make()
})

it('should construct a new make process object', () => {
    expect(make._cmd).toBe('make')
})
it('should clean', async () => {
    make._spawnProcess = () => new MockProc(['some output'])
    make.on('message', msg => expect(msg).toBe('some output'))
    const code = await make.clean()
    expect(code).toBe(0)
})
it('should build', async () => {
    make._spawnProcess = () => new MockProc(['some output'])
    make.on('message', msg => expect(msg).toBe('some output'))
    const code = await make.build()
    expect(code).toBe(0)
})
