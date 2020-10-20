const { spawn } = require('child_process')
const EventEmitter = require('events')

module.exports = class extends EventEmitter {
    constructor(cmd) {
        super()
        this._cmd = cmd
        this._childProc = null
    }
    /* istanbul ignore next */
    _spawnProcess(args, cwd) {
        return spawn(this._cmd, args, { cwd })
    }
    _run(args, cwd=__dirname) {
        if (this._childProc) {
            throw new Error(`Already running: ${this._childProc.pid}`)
        }
        this._childProc = this._spawnProcess(args || [], cwd)
        this._childProc.stdout.on('data', this._onStdout.bind(this))
        this._childProc.once('close', this._onClose.bind(this))
        return new Promise((resolve, reject) => {
            this._childProc.stderr.once('data', data => {
                this.stop()
                return reject(data.toString().trimEnd())
            })
            this._childProc.once('error', err => {
                this.stop()
                return reject(err)
            })
            this.once('close', resolve)
        })
    }
    _onClose(code) {
        this._childProc = null
        return this.emit('close', code)
    }
    _onStdout(data) {
        return this.emit('message', data.toString().trimEnd())
    }
    stop() {
        if (!this._childProc) {
            return 0
        } else {
            const code = this._childProc.kill()
            this._childProc = null
            return code
        }
    }
}
