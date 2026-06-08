import { useEffect, useState } from 'react'

export function useManifest() {
  const [files, setFiles] = useState<string[]>([])

  useEffect(() => {
    fetch('/manifest.json')
      .then(r => r.json())
      .then(json => setFiles(json.files ?? []))
      .catch(() => setFiles([]))
  }, [])

  return files
}
