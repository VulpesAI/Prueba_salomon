import { NextRequest } from "next/server"

import { getPage } from "@/lib/adapters/movements"
import { MovementsPage, MovementsQuery } from "@/types/movements"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const limitParam = searchParams.get("limit")
  let parsedLimit: number | undefined
  if (limitParam) {
    const value = Number.parseInt(limitParam, 10)
    if (!Number.isNaN(value)) {
      parsedLimit = value
    }
  }

  const query: MovementsQuery = {
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    category: searchParams.get("category") || undefined,
    q: searchParams.get("q") || undefined,
    cursor: searchParams.get("cursor") || undefined,
    limit: parsedLimit,
  }

  const page: MovementsPage = await getPage(query)

  return Response.json(page, {
    status: 200,
    headers: {
      "cache-control": "no-store",
    },
  })
}
