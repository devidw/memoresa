import { fetchOptions } from "./shared.ts"
import matters from "./cache/matters.json" assert { type: "json" }

// we want to take the ids of all matters and make a http delete request for
// each of them, try-catch so we can continue if one fails, api endpoint is
// https://api.memoresa.de/api/user/model/assets/{id}

const deleteMatters = async () => {
  for (const matter of matters) {
    try {
      const response = await fetch(
        `https://api.memoresa.de/api/user/model/assets/${matter.id}`,
        {
          ...fetchOptions,
          method: "DELETE",
        }
      )
      console.log(response.ok)
      // break
    } catch (e) {
      console.warn(e)
    }
  }
}

await deleteMatters()
