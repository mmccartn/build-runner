const { existsSync, promises: { copyFile, mkdir, readdir } } = require('fs')
const { Git, Make } = require('./proc')
const path = require('path')

module.exports = class {
    constructor(progPath) {
        // get the program name from the basename of the program location (path)
        this.name = path.basename(progPath)
        this._progPath = progPath
        this._git = new Git()
        this._make = new Make()
    }
    get exists() {
        return existsSync(this._progPath)
    }
    revision() {
        // get the current git revision id
        return this._git.revision(this._progPath)
    }
    async update() {
        return this._git.pull(this._progPath)
    }
    /**
     * C program build pipeline with the following sub-tasks:
     * 1. clean existing build artifacts from program source directory
     * 2. build program
     * 3. create a new directory to save program build artifacts
     * 4. copy program build artifacts to the created directory
     * 5. clean build artifacts from program source directory
     *
     * @param {string} revision the current git commit hash id for the project
     * @param {string} artPath the filesystem path to the artifacts directory
     * @param {function} onMessage callback to receive capture of build stdout
     */
    async run(revision, artPath, onMessage) {
        // build the program
        const outPath = path.join(artPath, this.name, revision)
        this._make.on('message', msg => onMessage(`make: ${msg}`))
        // clean any residual artifacts from the previous build attempt
        await this._make.clean(this._progPath)
        // start the build
        await this._make.build(this._progPath)
        // make the artifacts directory
        await mkdir(outPath, { recursive: true })
        // collect the artifact names
        const artnames = (await readdir(this._progPath)).filter(filename => {
            return filename.match(new RegExp(`^${this.name}($|.o|.exe){1}$`))
        })
        // copy artifacts to artifacts directory
        await Promise.all(artnames.map(fn => {
            return copyFile(path.join(this._progPath, fn), path.join(outPath, fn))
        }))
        // remove artifacts from the build directory
        return this._make.clean(this._progPath)
    }
}
