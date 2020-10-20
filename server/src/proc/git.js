const Base = require('./base.js')

module.exports = class extends Base {
    constructor() {
        super('git')
    }
    pull(cwd) {
        return this._run(['pull'], cwd)
    }
    revision(cwd) {
        return new Promise(async (resolve, reject) => {
            this.once('message', resolve)
            try {
                await this._run(['rev-parse', '--short', 'HEAD'], cwd)
            } catch (err) {
                reject(err)
            }
        })
    }
}
