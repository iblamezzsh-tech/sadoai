// Keep the last successful copy of each asset in memory. Canceled downloads
// cannot affect a later camera session.
const assets = new Map<string, ArrayBuffer>()

export async function loadVisionAsset(url: string, signal: AbortSignal) {
  signal.throwIfAborted()
  const cached = assets.get(url)
  if (cached) return cached
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Model response ' + response.status)
  const asset = await response.arrayBuffer()
  signal.throwIfAborted()
  assets.set(url, asset)
  return asset
}
