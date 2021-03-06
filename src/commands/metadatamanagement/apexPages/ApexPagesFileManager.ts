import ApexPageFile from './structures/ApexPageFile'
import * as path from 'path'
import * as vscode from 'vscode'
import * as fs from 'fs'
import { PathLike } from "fs"

export default {

    getObjectsFromMetaData: function (): ApexPageFile[] {
        const p = path.join(vscode.workspace.rootPath as string, 'src', 'pages')
        const files = fs.readdirSync(p)
        if (files.length === 0) { throw Error('No Visualforce Page definition file was found in folder ' + p) }
        return this.generateSObjectDefinitions(files, p)
    },

    generateSObjectDefinitions: function (fileNames: string[], path: PathLike): ApexPageFile[] {
        return fileNames.filter(el => el.endsWith('.page')).map(filename => new ApexPageFile(filename, path))
    }
}