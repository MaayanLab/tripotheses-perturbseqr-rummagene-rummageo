import { HttpLink } from "@apollo/client"
import {
  NextSSRInMemoryCache,
  NextSSRApolloClient,
} from "@apollo/experimental-nextjs-app-support/ssr"
import { registerApolloClient } from "@apollo/experimental-nextjs-app-support/rsc"

export const { getClient } = registerApolloClient(() => {
  return new NextSSRApolloClient({
    cache: new NextSSRInMemoryCache(),
    link: new HttpLink({
      uri: `${typeof window === 'undefined' ? (process.env.INTERNAL_APP_URL || process.env.PUBLIC_URL || 'http://localhost:3000') : ''}/graphql`,
    }),
  });
});
