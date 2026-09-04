import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const sourceDirectory = path.resolve('asset')
const outputDirectory = path.join(sourceDirectory, 'optimized')
const force = process.argv.includes('--force')

await mkdir(outputDirectory, { recursive: true })

const sourceFiles = (await readdir(sourceDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))

const getOutputStem = (sourceFile) => {
  const frameMatch = sourceFile.match(/^Frame\s+(\d+)\.png$/i)
  if (frameMatch) return `frame-${frameMatch[1]}`

  const imageMatch = sourceFile.match(/^image\s+(\d+)\.png$/i)
  if (imageMatch) return `image-${imageMatch[1]}`

  const chatGptMatch = sourceFile.match(/^ChatGPT Image .+\s(\d+)\.png$/i)
  if (chatGptMatch) return `chatgpt-${chatGptMatch[1]}`

  throw new Error(`지원하지 않는 에셋 파일명입니다: ${sourceFile}`)
}

for (const sourceFile of sourceFiles) {
  const inputPath = path.join(sourceDirectory, sourceFile)
  const outputPath = path.join(outputDirectory, `${getOutputStem(sourceFile)}.webp`)
  let shouldOptimize = force

  if (!force) {
    try {
      const [inputStats, outputStats] = await Promise.all([stat(inputPath), stat(outputPath)])
      shouldOptimize = inputStats.mtimeMs > outputStats.mtimeMs
    } catch {
      shouldOptimize = true
    }
  }

  if (!shouldOptimize) {
    process.stdout.write(`${sourceFile} -> ${path.relative(process.cwd(), outputPath)} 건너뜀\n`)
    continue
  }

  await rm(outputPath, { force: true })

  await sharp(inputPath)
    .trim({ threshold: 10 })
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .webp({ lossless: true, effort: 6 })
    .toFile(outputPath)

  process.stdout.write(`${sourceFile} -> ${path.relative(process.cwd(), outputPath)}\n`)
}

process.stdout.write(`${sourceFiles.length}개 에셋 최적화 완료\n`)
