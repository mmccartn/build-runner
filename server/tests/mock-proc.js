const { Readable } = require('stream')
const EventEmitter = require('events')

module.exports = class extends EventEmitter {
    constructor(out, err) {
        super()
        this.stdout = new Readable({
            read(size) {
                if (!out) {
                    this.destroy('failed')
                } else {
                    for (const msg of out) {
                        this.push(msg)
                    }
                }
                this.push(null)
            }
        })
        this.stdout.on('end', () => this.emit('close', 0))
        this.stdout.on('error', error => this.emit('error', error))
        this.stderr = new Readable({
            read() {
                if (err && err.length) {
                    for (const msg of err) {
                        this.push(msg)
                    }
                }
                return this.push(null)
            }
        })
        this.stderr.on('end', () => this.emit('close', 1))
    }
    kill() {
        if (this.stdout) {
            this.stdout.destroy()
        }
        if (this.stderr) {
            this.stderr.destroy()
        }
        return 1
    }
    get pid() {
        return 42
    }
}
