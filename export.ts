// Collect all matters
// Collect all attachments
// Download all attachments

const fetchOptions = {
  headers: {
    cookie: `token=${Deno.env.get("MEMORESA_TOKEN")}`,
  },
}

const outDir = "./out"
const cacheDir = "./cache"

// make dirs if they don't exist
await Deno.mkdir(outDir, { recursive: true })
await Deno.mkdir(cacheDir, { recursive: true })

async function getMatters() {
  const mattersResponse = await fetch(
    "https://api.memoresa.de/api/user/model/assets/grouping/bynone?search=",
    fetchOptions
  )

  const matters = await mattersResponse.json()

  const assets = matters[0].assets

  return assets
}

async function getAttachments(matters) {
  const responses = await Promise.all(
    matters.map((matter) => {
      return fetch(
        `https://api.memoresa.de/api/user/model/assets/${matter.id}/details`,
        fetchOptions
      )
    })
  )

  const awaited = await Promise.all(
    responses.map(async (response, index) => {
      try {
        const json = await response.json()
        const docField = json.data.fields.find(
          (f) => f.attachments && f.attachments.length > 0
        )
        return {
          name: json.title,
          attachments: docField?.attachments ?? [],
        }
      } catch (e) {
        // console.warn(e)
        return {
          subject: matters[index],
        }
      }
    })
  )

  const failed = []
  const withoutAttachments = []
  const withAttachments = []

  awaited.forEach((a) => {
    if (a.subject) {
      failed.push(a)
    } else if (a.attachments.length === 0) {
      withoutAttachments.push(a)
    } else {
      withAttachments.push(a)
    }
  })

  return {
    failed,
    withoutAttachments,
    withAttachments,
  }
}

function downloadAttachments(matters: any[]) {
  matters.forEach(async (matter) => {
    console.info(`Downloading attachments for matter ${matter.name}`)
    await download(matter)
  })

  async function download(matter) {
    const responses = await Promise.all(
      matter.attachments.map((a) => fetch(a.url, fetchOptions))
    )

    const blobs = await Promise.all(responses.map((r) => r.blob()))

    // write blobs to disk
    blobs.forEach(async (b, i) => {
      const arrayBuffer = await b.arrayBuffer()
      const unit8Array = new Uint8Array(arrayBuffer)
      const [folderName, fileName] = [
        matter.name,
        matter.attachments[i].fileName,
      ].map((name) => name.substring(0, 100))
      await Deno.mkdir(`${outDir}/${folderName}`, { recursive: true })
      Deno.writeFile(`${outDir}/${folderName}/${fileName}`, unit8Array)
    })
  }
}

async function cacheHelper(cacheName: string, fn) {
  if (!(await Deno.stat(`${cacheDir}/${cacheName}.json`).catch(() => false))) {
    const data = await fn()
    Deno.writeFile(
      `${cacheDir}/${cacheName}.json`,
      new TextEncoder().encode(JSON.stringify(data))
    )
    return data
  } else {
    return JSON.parse(
      new TextDecoder().decode(
        await Deno.readFile(`${cacheDir}/${cacheName}.json`)
      )
    )
  }
}

const matters = await cacheHelper("matters", getMatters)

console.info(`Found ${matters.length} matters`)

const extendedMatters = await cacheHelper("attachments", () =>
  getAttachments(matters)
)

console.info(
  `${extendedMatters.withAttachments.length} matters have attachments
  ${extendedMatters.withoutAttachments.length} matters have no attachments
  ${extendedMatters.failed.length} matters failed to fetch`
)

downloadAttachments(extendedMatters.withAttachments)
