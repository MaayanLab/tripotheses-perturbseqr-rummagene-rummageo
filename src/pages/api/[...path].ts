import postgraphile from '@/lib/postgraphile'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path
  if (path !== 'graphql' && path !== 'graphiql') {
    res.status(404).end()
    return
  }
  await postgraphile(req, res)
}

export const config = { api: { bodyParser: false, externalResolver: true } }
