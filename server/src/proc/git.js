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
            const onMsg = new Promise(res => this.once('message', res))
            try {
                await this._run(['rev-parse', '--short', 'HEAD'], cwd)
                resolve(await onMsg)
            } catch (err) {
                reject(err)
            }
        })
    }
}
