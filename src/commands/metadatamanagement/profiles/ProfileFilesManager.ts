import ProfileFile from './structures/ProfileFile'
import * as path from 'path'
import * as vscode from 'vscode'
import * as fs from 'fs'
import * as xml2js from 'xml2js'
import { parseBooleans } from 'xml2js/lib/processors'
import { PathLike } from "fs"
import SObjectFieldDefinition from '../sObjects/structures/SObjectFieldDefinition'
import AccessType from './structures/AccessType'
import SObjectFile from '../sObjects/structures/SObjectFile'

export default {

  getObjectsFromMetaData: function (): ProfileFile[] {
    const p = path.join(vscode.workspace.rootPath as string, 'src', 'profiles')
    const files = fs.readdirSync(p)
    if (files.length === 0) { throw Error('No Profile definition file was found in folder ' + p) }
    return this.generateProfilesDefinitions(files, p)
  },

  generateProfilesDefinitions: function (fileNames: string[], path: fs.PathLike): ProfileFile[] {
    return fileNames.map(filename => new ProfileFile(filename, path))
  },

  readProfileDefinitionFile: async function (objDef: ProfileFile): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const filePath = path.join(objDef.folder.toString(), objDef.fileName)
      const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' })
      const xmlParser = new xml2js.Parser({ explicitArray: false, valueProcessors: [parseBooleans] })
      try {
        const parsedFile: any = await new Promise((resolve, reject) => {
          xmlParser.parseString(fileContent, (err: any, result: any) => {
            if (err) { reject(err) }
            else { resolve(result) }
          })
        })
        resolve(parsedFile)
      } catch (err) {
        reject(err)
      }
    })
  },

  writeProfileDefinitionFile: function (fileNamePath: PathLike, stuffToWrite: any) {
    const builder = new xml2js.Builder({ xmldec: { standalone: undefined, encoding: 'UTF-8', version: '1.0' } })
    //Probably there's a bug in the builder class
    const xml = builder.buildObject(stuffToWrite)
    //130 is the number of characters of the first two lines containing header + root object definition
    let escaped = xml.substr(0, 130) + xml.substr(130, xml.length - 130).replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    fs.writeFileSync(fileNamePath.toString(), escaped, 'utf8')
  },

  updateProfilesVisibilityForField: async function (profiles: ProfileFile[], fieldsInfos: { sObject: SObjectFile, fields: [SObjectFieldDefinition] }[], accessType: AccessType) {
    try {
      profiles.forEach(async profileFile => {
        const prof = await this.readProfileDefinitionFile(profileFile)
        fieldsInfos.forEach(fieldInfo => {
          fieldInfo.fields.forEach(fieldMeta => {
            prof.Profile.fieldPermissions.push({
              readable: accessType !== AccessType.none,
              field: `${fieldInfo.sObject.label}.${fieldMeta.fullName}`,
              editable: accessType === AccessType.edit
            })
          })
        })
        this.writeProfileDefinitionFile(path.join(profileFile.folder.toString(), profileFile.fileName), prof)
      })
    } catch (err) {
      throw Error(`Error updating field-level security for profiles: ${profiles.map(prf => prf.label)}`)
    }
  }
}