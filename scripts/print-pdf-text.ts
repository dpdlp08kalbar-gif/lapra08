// Print full PDF text to find pengurus list
import { PDFParse } from 'pdf-parse'
import * as fs from 'fs'

async function test() {
  const buffer = fs.readFileSync('/home/z/my-project/upload/016 SK LP08 DPD KALIMANTAN BARAT (Rev)(1) 2.pdf')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const result = await parser.getText()
  await parser.destroy()
  console.log(result.text)
}
test()
