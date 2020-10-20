const Base = require('./base.js')

module.exports = class extends Base {
    constructor() {
        super('make')
    }
    clean(cwd) {
        return this._run(['clean'], cwd)
    }
    build(cwd) {
        return this._run([], cwd)
    }
}
