const { existsSync, promises: { readFile, writeFile } } = require('fs')

class Registry {
    constructor(filepath) {
        this._filepath = filepath
        this._registry = {}
    }
    static genId(name, revision) {
        return `${name}-${revision}`
    }
    get programs() {
        return Object.values(this._registry)
    }
    get clone() {
        return { ...this._registry }
    }
    async setup(readExisting=true) {
        if (readExisting && existsSync(this._filepath)) {
            try {
                this._registry = JSON.parse(await readFile(this._filepath))
            } catch (err) {
                this._registry = {}
            }
        }
    }
    update(name, revision, status, location) {
        const id = Registry.genId(name, revision)
        if (this._registry[id]) {
            this._registry[id].status = status
            this._registry[id].location = location || this._registry[id].location
        } else {
            this._registry[id] = { id, name, revision, status, location }
        }
        return this._registry[id]
    }
    save() {
        return writeFile(
            this._filepath,
            JSON.stringify(this._registry, null, 4)
        )
    }
    getProgram(name, revision) {
        return this._registry[Registry.genId(name, revision)]
    }
    remove(name, revision) {
        delete this._registry[Registry.genId(name, revision)]
    }
}
module.exports = Registry
