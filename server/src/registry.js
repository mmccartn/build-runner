const { existsSync, promises: { readFile, writeFile } } = require('fs')

module.exports = class {
    constructor(filepath) {
        this._filepath = filepath
        this._registry = {}
    }
    get names() {
        return Object.keys(this._registry)
    }
    get programs() {
        // transform registry to list of programs
        return this.names.map(program => {
            return { program, status: this._registry[program].status }
        })
    }
    async setup(readExisting=true) {
        if (readExisting && existsSync(this._filepath)) {
            try {
                this._registry = JSON.parse(await readFile(this._filepath))
            } catch (err) {
                this._registry = {}
            }
        }
        return this.names.length
    }
    update(name, status, path='') {
        if (this._registry[name]) {
            this._registry[name].status = status
            this._registry[name].path = path || this._registry[name].path || ''
        } else {
            this._registry[name] = { status, path }
        }
        return this.getProgram(name)
    }
    save() {
        return writeFile(
            this._filepath,
            JSON.stringify(this._registry, null, 4)
        )
    }
    getProgram(name) {
        return this._registry[name] || { status: '', path: '' }
    }
}
