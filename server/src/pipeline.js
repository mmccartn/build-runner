const { existsSync, promises: { copyFile, mkdir, readdir } } = require('fs')
const { Git, Make } = require('./proc')
const path = require('path')

module.exports = class {
    constructor() {
        this._git = new Git()
        this._make = new Make()
    }
    /**
     * C program build pipeline with the following sub-tasks:
     * 1. fetch and integrate latest git commits
     * 2. capture the current git revision id
     * 3. clean existing build artifacts from program source directory
     * 4. build program
     * 5. create a new directory to save program build artifacts
     * 6. copy program build artifacts to the created directory
     * 7. clean build artifacts from program source directory
     *
     * @param {string} name the name of the program to register
     * @param {string} progPath the filesystem path to the program directory
     * @param {string} artPath the filesystem path to the artifacts directory
     * @param {function} onMessage callback to receive capture of build stdout
     */
    async run(name, progPath, artPath, onMessage) {
        // check if program exists
        if (!existsSync(progPath)) {
            throw new Error(`No program at location: ${progPath}`)
        }
        // attempt to fetch the latest commits
        try {
            await this._git.pull(progPath)
        } catch (response) {
            await onMessage(`git pull: ${response}`)
        }
        // get the current git revision id
        const revision = await this._git.revision(progPath)
        // (re)build the program
        const outPath = path.join(artPath, name, revision)
        this._make.on('message', msg => onMessage(`make: ${msg}`))
        // clean any residual artifacts from the previous build attempt
        await this._make.clean(progPath)
        // start the build
        await this._make.build(progPath)
        // make the artifacts directory
        await mkdir(outPath, { recursive: true })
        // collect the artifact names
        const artnames = (await readdir(progPath)).filter(filename => {
            return filename.match(new RegExp(`^${name}($|.o|.exe){1}$`))
        })
        // copy artifacts to artifacts directory
        await Promise.all(artnames.map(fn => {
            return copyFile(path.join(progPath, fn), path.join(outPath, fn))
        }))
        // remove artifacts from the build directory
        return this._make.clean(progPath)
    }
}
