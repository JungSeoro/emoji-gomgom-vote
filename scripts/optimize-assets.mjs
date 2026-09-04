import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const sourceDirectory = path.resolve('asset')
const outputDirectory = path.join(sourceDirectory, 'optimized')

await mkdir(outputDirectory, { recursive: true })

const sourceFiles = (await readdir(sourceDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))

for (const sourceFile of sourceFiles) {
  const frameNumber = sourceFile.match(/\d+/)?.[0]
  if (!frameNumber) throw new Error(`프레임 번호를 찾을 수 없습니다: ${sourceFile}`)

  const inputPath = path.join(sourceDirectory, sourceFile)
  const outputPath = path.join(outputDirectory, `frame-${frameNumber}.webp`)

  await sharp(inputPath)
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .webp({ lossless: true, effort: 6 })
    .toFile(outputPath)

  process.stdout.write(`${sourceFile} -> ${path.relative(process.cwd(), outputPath)}\n`)
}

process.stdout.write(`${sourceFiles.length}개 에셋 최적화 완료\n`)
