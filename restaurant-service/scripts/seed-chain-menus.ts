import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'

const CHAINS = [
  "McDonald's", 'Starbucks', 'Subway', 'Burger King', 'Taco Bell',
  "Wendy's", 'KFC', 'Pizza Hut', "Domino's", 'Chipotle',
  "Dunkin'", 'Chick-fil-A', 'Panera Bread', "Papa John's", 'Sonic',
  "Arby's", 'Dairy Queen', 'Panda Express', 'Five Guys', 'Popeyes',
]

const MENU_ITEMS_PER_CHAIN = 10

function randomPrice() {
  return Number((Math.random() * (14.99 - 2.99) + 2.99).toFixed(2))
}

async function harvestChain(name: string) {
  const params = new URLSearchParams({
    query: name,
    number: String(MENU_ITEMS_PER_CHAIN),
    apiKey: process.env.SPOONACULAR_API_KEY ?? '',
  })

  const res = await fetch(`https://api.spoonacular.com/food/menuItems/search?${params}`)
  if (!res.ok) {
    console.warn(`Skipping ${name}: request failed (${res.status})`)
    return []
  }

  const data = await res.json()
  const matchKey = name.toLowerCase().split(/[\s']/)[0]
  return (data.menuItems ?? [])
    .filter((item: any) => item.restaurantChain?.toLowerCase().includes(matchKey))
    .map((item: any) => ({
      id: item.id,
      title: item.title,
      image: item.image,
      price: randomPrice(),
    }))
}

async function main() {
  const result: Record<string, unknown[]> = {}

  for (const chain of CHAINS) {
    console.log(`Fetching ${chain}...`)
    const items = await harvestChain(chain)
    if (items.length === 0) {
      console.warn(`No items found for ${chain}, skipping`)
      continue
    }
    result[chain] = items
  }

  const outDir = path.join(import.meta.dirname, '../src/data')
  mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'chain-menus.json')
  writeFileSync(outPath, JSON.stringify(result, null, 2))
  console.log(`Wrote ${Object.keys(result).length} chains to ${outPath}`)
}

main()
