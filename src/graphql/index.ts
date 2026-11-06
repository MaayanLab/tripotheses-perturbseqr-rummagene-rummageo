import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Cursor: { input: any; output: any; }
  Datetime: { input: any; output: any; }
  JSON: { input: any; output: any; }
  UUID: { input: any; output: any; }
};

/** All input for the `addUserGeneSet` mutation. */
export type AddUserGeneSetInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  genes?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

/** The output of our `addUserGeneSet` mutation. */
export type AddUserGeneSetPayload = {
  __typename?: 'AddUserGeneSetPayload';
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  userGeneSet?: Maybe<UserGeneSet>;
  /** An edge for our `UserGeneSet`. May be used by Relay 1. */
  userGeneSetEdge?: Maybe<UserGeneSetsEdge>;
};


/** The output of our `addUserGeneSet` mutation. */
export type AddUserGeneSetPayloadUserGeneSetEdgeArgs = {
  orderBy?: InputMaybe<Array<UserGeneSetsOrderBy>>;
};

export type Background = Node & {
  __typename?: 'Background';
  created: Scalars['Datetime']['output'];
  enrich?: Maybe<PaginatedEnrichResult>;
  geneIds: Scalars['JSON']['output'];
  id: Scalars['UUID']['output'];
  nGeneIds: Scalars['Int']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
};


export type BackgroundEnrichArgs = {
  adjPvalueLe?: InputMaybe<Scalars['Float']['input']>;
  filterTerm?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  genes?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  overlapGe?: InputMaybe<Scalars['Int']['input']>;
  pvalueLe?: InputMaybe<Scalars['Float']['input']>;
};

/**
 * A condition to be used against `Background` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type BackgroundCondition = {
  /** Checks for equality with the object’s `created` field. */
  created?: InputMaybe<Scalars['Datetime']['input']>;
  /** Checks for equality with the object’s `geneIds` field. */
  geneIds?: InputMaybe<Scalars['JSON']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `Background` values. */
export type BackgroundsConnection = {
  __typename?: 'BackgroundsConnection';
  /** A list of edges which contains the `Background` and cursor to aid in pagination. */
  edges: Array<BackgroundsEdge>;
  /** A list of `Background` objects. */
  nodes: Array<Background>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Background` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};

/** A `Background` edge in the connection. */
export type BackgroundsEdge = {
  __typename?: 'BackgroundsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Background` at the end of the edge. */
  node: Background;
};

/** Methods to use when ordering `Background`. */
export enum BackgroundsOrderBy {
  CreatedAsc = 'CREATED_ASC',
  CreatedDesc = 'CREATED_DESC',
  GeneIdsAsc = 'GENE_IDS_ASC',
  GeneIdsDesc = 'GENE_IDS_DESC',
  IdAsc = 'ID_ASC',
  IdDesc = 'ID_DESC',
  Natural = 'NATURAL',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC'
}

export type EnrichResult = {
  __typename?: 'EnrichResult';
  adjPvalue?: Maybe<Scalars['Float']['output']>;
  geneSetHash?: Maybe<Scalars['UUID']['output']>;
  /** Reads and enables pagination through a set of `GeneSet`. */
  geneSets: GeneSetsConnection;
  nOverlap?: Maybe<Scalars['Int']['output']>;
  oddsRatio?: Maybe<Scalars['Float']['output']>;
  pvalue?: Maybe<Scalars['Float']['output']>;
};


export type EnrichResultGeneSetsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type Gene = Node & {
  __typename?: 'Gene';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  ncbiGeneId?: Maybe<Scalars['Int']['output']>;
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  summary?: Maybe<Scalars['String']['output']>;
  symbol: Scalars['String']['output'];
  synonyms: Scalars['JSON']['output'];
};

/** A condition to be used against `Gene` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type GeneCondition = {
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['UUID']['input']>;
  /** Checks for equality with the object’s `symbol` field. */
  symbol?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `synonyms` field. */
  synonyms?: InputMaybe<Scalars['JSON']['input']>;
};

export type GeneMapping = {
  __typename?: 'GeneMapping';
  gene?: Maybe<Scalars['String']['output']>;
  geneId?: Maybe<Scalars['UUID']['output']>;
  geneInfo?: Maybe<Gene>;
};

/** A connection to a list of `GeneMapping` values. */
export type GeneMappingsConnection = {
  __typename?: 'GeneMappingsConnection';
  /** A list of edges which contains the `GeneMapping` and cursor to aid in pagination. */
  edges: Array<GeneMappingsEdge>;
  /** A list of `GeneMapping` objects. */
  nodes: Array<GeneMapping>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `GeneMapping` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};

/** A `GeneMapping` edge in the connection. */
export type GeneMappingsEdge = {
  __typename?: 'GeneMappingsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `GeneMapping` at the end of the edge. */
  node: GeneMapping;
};

export type GeneSet = Node & {
  __typename?: 'GeneSet';
  created: Scalars['Datetime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  geneIds: Scalars['JSON']['output'];
  /** Reads and enables pagination through a set of `Gene`. */
  genes: GenesConnection;
  hash: Scalars['UUID']['output'];
  id: Scalars['UUID']['output'];
  nGeneIds: Scalars['Int']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  /** Reads and enables pagination through a set of `Gene`. */
  overlap: GenesConnection;
  term: Scalars['String']['output'];
  title?: Maybe<Scalars['String']['output']>;
  tripothesis?: Maybe<TripothesisMetadatum>;
  /** Reads a single `TripothesisMetadatum` that is related to this `GeneSet`. */
  tripothesisMetadatum?: Maybe<TripothesisMetadatum>;
};


export type GeneSetGenesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type GeneSetOverlapArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  genes: Array<InputMaybe<Scalars['String']['input']>>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

/** A condition to be used against `GeneSet` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type GeneSetCondition = {
  /** Checks for equality with the object’s `geneIds` field. */
  geneIds?: InputMaybe<Scalars['JSON']['input']>;
  /** Checks for equality with the object’s `hash` field. */
  hash?: InputMaybe<Scalars['UUID']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['UUID']['input']>;
  /** Checks for equality with the object’s `term` field. */
  term?: InputMaybe<Scalars['String']['input']>;
};

/** A connection to a list of `GeneSet` values. */
export type GeneSetsConnection = {
  __typename?: 'GeneSetsConnection';
  /** A list of edges which contains the `GeneSet` and cursor to aid in pagination. */
  edges: Array<GeneSetsEdge>;
  /** A list of `GeneSet` objects. */
  nodes: Array<GeneSet>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `GeneSet` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};

/** A `GeneSet` edge in the connection. */
export type GeneSetsEdge = {
  __typename?: 'GeneSetsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `GeneSet` at the end of the edge. */
  node: GeneSet;
};

/** Methods to use when ordering `GeneSet`. */
export enum GeneSetsOrderBy {
  GeneIdsAsc = 'GENE_IDS_ASC',
  GeneIdsDesc = 'GENE_IDS_DESC',
  HashAsc = 'HASH_ASC',
  HashDesc = 'HASH_DESC',
  IdAsc = 'ID_ASC',
  IdDesc = 'ID_DESC',
  Natural = 'NATURAL',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC',
  TermAsc = 'TERM_ASC',
  TermDesc = 'TERM_DESC'
}

/** A connection to a list of `Gene` values. */
export type GenesConnection = {
  __typename?: 'GenesConnection';
  /** A list of edges which contains the `Gene` and cursor to aid in pagination. */
  edges: Array<GenesEdge>;
  /** A list of `Gene` objects. */
  nodes: Array<Gene>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `Gene` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};

/** A `Gene` edge in the connection. */
export type GenesEdge = {
  __typename?: 'GenesEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `Gene` at the end of the edge. */
  node: Gene;
};

/** Methods to use when ordering `Gene`. */
export enum GenesOrderBy {
  IdAsc = 'ID_ASC',
  IdDesc = 'ID_DESC',
  Natural = 'NATURAL',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC',
  SymbolAsc = 'SYMBOL_ASC',
  SymbolDesc = 'SYMBOL_DESC',
  SynonymsAsc = 'SYNONYMS_ASC',
  SynonymsDesc = 'SYNONYMS_DESC'
}

/** The root mutation type which contains root level fields which mutate data. */
export type Mutation = {
  __typename?: 'Mutation';
  addUserGeneSet?: Maybe<AddUserGeneSetPayload>;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationAddUserGeneSetArgs = {
  input: AddUserGeneSetInput;
};

/** An object with a globally unique `ID`. */
export type Node = {
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
};

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['Cursor']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['Cursor']['output']>;
};

export type PaginatedEnrichResult = {
  __typename?: 'PaginatedEnrichResult';
  nodes?: Maybe<Array<Maybe<EnrichResult>>>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

/** The root query type which gives access points into the data universe. */
export type Query = Node & {
  __typename?: 'Query';
  background?: Maybe<Background>;
  /** Reads a single `Background` using its globally unique `ID`. */
  backgroundByNodeId?: Maybe<Background>;
  /** Reads and enables pagination through a set of `Background`. */
  backgrounds?: Maybe<BackgroundsConnection>;
  currentBackground?: Maybe<Background>;
  gene?: Maybe<Gene>;
  /** Reads a single `Gene` using its globally unique `ID`. */
  geneByNodeId?: Maybe<Gene>;
  geneBySymbol?: Maybe<Gene>;
  /** Reads and enables pagination through a set of `GeneMapping`. */
  geneMap?: Maybe<GeneMappingsConnection>;
  geneSet?: Maybe<GeneSet>;
  /** Reads a single `GeneSet` using its globally unique `ID`. */
  geneSetByNodeId?: Maybe<GeneSet>;
  geneSetByTerm?: Maybe<GeneSet>;
  /** Reads and enables pagination through a set of `GeneSet`. */
  geneSetTermSearch?: Maybe<GeneSetsConnection>;
  /** Reads and enables pagination through a set of `GeneSet`. */
  geneSets?: Maybe<GeneSetsConnection>;
  /** Reads and enables pagination through a set of `Gene`. */
  genes?: Maybe<GenesConnection>;
  /** Fetches an object given its globally unique `ID`. */
  node?: Maybe<Node>;
  /** The root query type must be a `Node` to work well with Relay 1 mutations. This just resolves to `query`. */
  nodeId: Scalars['ID']['output'];
  /**
   * Exposes the root query type nested one level down. This is helpful for Relay 1
   * which can only query top level fields if they are in a particular form.
   */
  query: Query;
  /** Reads and enables pagination through a set of `TripothesisMetadatum`. */
  tripothesisMetadata?: Maybe<TripothesisMetadataConnection>;
  tripothesisMetadatum?: Maybe<TripothesisMetadatum>;
  /** Reads a single `TripothesisMetadatum` using its globally unique `ID`. */
  tripothesisMetadatumByNodeId?: Maybe<TripothesisMetadatum>;
  tripothesisMetadatumByTripothesisId?: Maybe<TripothesisMetadatum>;
  userGeneSet?: Maybe<UserGeneSet>;
  /** Reads a single `UserGeneSet` using its globally unique `ID`. */
  userGeneSetByNodeId?: Maybe<UserGeneSet>;
  userGeneSetCount?: Maybe<Scalars['Int']['output']>;
  /** Reads and enables pagination through a set of `UserGeneSet`. */
  userGeneSets?: Maybe<UserGeneSetsConnection>;
};


/** The root query type which gives access points into the data universe. */
export type QueryBackgroundArgs = {
  id: Scalars['UUID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryBackgroundByNodeIdArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryBackgroundsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<BackgroundCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<BackgroundsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryGeneArgs = {
  id: Scalars['UUID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryGeneByNodeIdArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryGeneBySymbolArgs = {
  symbol: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryGeneMapArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  genes: Array<InputMaybe<Scalars['String']['input']>>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


/** The root query type which gives access points into the data universe. */
export type QueryGeneSetArgs = {
  id: Scalars['UUID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryGeneSetByNodeIdArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryGeneSetByTermArgs = {
  term: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryGeneSetTermSearchArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  terms: Array<InputMaybe<Scalars['String']['input']>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryGeneSetsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<GeneSetCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<GeneSetsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryGenesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<GeneCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<GenesOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryNodeArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryTripothesisMetadataArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<TripothesisMetadatumCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<TripothesisMetadataOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryTripothesisMetadatumArgs = {
  geneSetId: Scalars['UUID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryTripothesisMetadatumByNodeIdArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryTripothesisMetadatumByTripothesisIdArgs = {
  tripothesisId: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryUserGeneSetArgs = {
  id: Scalars['UUID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryUserGeneSetByNodeIdArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryUserGeneSetsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  condition?: InputMaybe<UserGeneSetCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<UserGeneSetsOrderBy>>;
};

/** A connection to a list of `TripothesisMetadatum` values. */
export type TripothesisMetadataConnection = {
  __typename?: 'TripothesisMetadataConnection';
  /** A list of edges which contains the `TripothesisMetadatum` and cursor to aid in pagination. */
  edges: Array<TripothesisMetadataEdge>;
  /** A list of `TripothesisMetadatum` objects. */
  nodes: Array<TripothesisMetadatum>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `TripothesisMetadatum` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};

/** A `TripothesisMetadatum` edge in the connection. */
export type TripothesisMetadataEdge = {
  __typename?: 'TripothesisMetadataEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `TripothesisMetadatum` at the end of the edge. */
  node: TripothesisMetadatum;
};

/** Methods to use when ordering `TripothesisMetadatum`. */
export enum TripothesisMetadataOrderBy {
  FinalRankAsc = 'FINAL_RANK_ASC',
  FinalRankDesc = 'FINAL_RANK_DESC',
  GeneSetIdAsc = 'GENE_SET_ID_ASC',
  GeneSetIdDesc = 'GENE_SET_ID_DESC',
  HumanReadableTitleAsc = 'HUMAN_READABLE_TITLE_ASC',
  HumanReadableTitleDesc = 'HUMAN_READABLE_TITLE_DESC',
  Natural = 'NATURAL',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC',
  TripothesisIdAsc = 'TRIPOTHESIS_ID_ASC',
  TripothesisIdDesc = 'TRIPOTHESIS_ID_DESC'
}

/** Preserved precomputed Tripothesis metadata. One active release per application database. */
export type TripothesisMetadatum = Node & {
  __typename?: 'TripothesisMetadatum';
  compositionAdjustedPriorityScore?: Maybe<Scalars['Float']['output']>;
  epigenomicsLibrary?: Maybe<Scalars['String']['output']>;
  epigenomicsSetSize?: Maybe<Scalars['Int']['output']>;
  epigenomicsTerm?: Maybe<Scalars['String']['output']>;
  finalRank?: Maybe<Scalars['Int']['output']>;
  /** Reads a single `GeneSet` that is related to this `TripothesisMetadatum`. */
  geneSet?: Maybe<GeneSet>;
  geneSetId: Scalars['UUID']['output'];
  genomicsLibrary?: Maybe<Scalars['String']['output']>;
  genomicsSetSize?: Maybe<Scalars['Int']['output']>;
  genomicsTerm?: Maybe<Scalars['String']['output']>;
  humanReadableTitle?: Maybe<Scalars['String']['output']>;
  modalityCrossing?: Maybe<Scalars['String']['output']>;
  negLog10PValue?: Maybe<Scalars['Float']['output']>;
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  noveltyAdjustedPriorityScore?: Maybe<Scalars['Float']['output']>;
  pValueConservative?: Maybe<Scalars['Float']['output']>;
  pubmedNoveltyScore?: Maybe<Scalars['Float']['output']>;
  pubmedTripleCount?: Maybe<Scalars['Int']['output']>;
  rank?: Maybe<Scalars['Int']['output']>;
  rankingScore?: Maybe<Scalars['Float']['output']>;
  releaseId: Scalars['String']['output'];
  reportPath?: Maybe<Scalars['String']['output']>;
  reportUrl?: Maybe<Scalars['String']['output']>;
  sourceCrossing?: Maybe<Scalars['String']['output']>;
  sourceRecord: Scalars['JSON']['output'];
  threeWayJaccardSimilarity?: Maybe<Scalars['Float']['output']>;
  threeWayOverlapCount?: Maybe<Scalars['Int']['output']>;
  threeWayOverlapGenes?: Maybe<Scalars['String']['output']>;
  transcriptomicsLibrary?: Maybe<Scalars['String']['output']>;
  transcriptomicsSetSize?: Maybe<Scalars['Int']['output']>;
  transcriptomicsTerm?: Maybe<Scalars['String']['output']>;
  tripothesisId: Scalars['String']['output'];
};

/**
 * A condition to be used against `TripothesisMetadatum` object types. All fields
 * are tested for equality and combined with a logical ‘and.’
 */
export type TripothesisMetadatumCondition = {
  /** Checks for equality with the object’s `finalRank` field. */
  finalRank?: InputMaybe<Scalars['Int']['input']>;
  /** Checks for equality with the object’s `geneSetId` field. */
  geneSetId?: InputMaybe<Scalars['UUID']['input']>;
  /** Checks for equality with the object’s `humanReadableTitle` field. */
  humanReadableTitle?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `tripothesisId` field. */
  tripothesisId?: InputMaybe<Scalars['String']['input']>;
};

export type UserGeneSet = Node & {
  __typename?: 'UserGeneSet';
  created: Scalars['Datetime']['output'];
  description: Scalars['String']['output'];
  genes: Array<Maybe<Scalars['String']['output']>>;
  id: Scalars['UUID']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
};

/**
 * A condition to be used against `UserGeneSet` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type UserGeneSetCondition = {
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['UUID']['input']>;
};

/** A connection to a list of `UserGeneSet` values. */
export type UserGeneSetsConnection = {
  __typename?: 'UserGeneSetsConnection';
  /** A list of edges which contains the `UserGeneSet` and cursor to aid in pagination. */
  edges: Array<UserGeneSetsEdge>;
  /** A list of `UserGeneSet` objects. */
  nodes: Array<UserGeneSet>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The count of *all* `UserGeneSet` you could get from the connection. */
  totalCount: Scalars['Int']['output'];
};

/** A `UserGeneSet` edge in the connection. */
export type UserGeneSetsEdge = {
  __typename?: 'UserGeneSetsEdge';
  /** A cursor for use in pagination. */
  cursor?: Maybe<Scalars['Cursor']['output']>;
  /** The `UserGeneSet` at the end of the edge. */
  node: UserGeneSet;
};

/** Methods to use when ordering `UserGeneSet`. */
export enum UserGeneSetsOrderBy {
  IdAsc = 'ID_ASC',
  IdDesc = 'ID_DESC',
  Natural = 'NATURAL',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC'
}

export type StatsQueryVariables = Exact<{ [key: string]: never; }>;


export type StatsQuery = { __typename?: 'Query', userGeneSetCount?: number | null, geneSets?: { __typename?: 'GeneSetsConnection', totalCount: number } | null };

export type FetchUserGeneSetQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type FetchUserGeneSetQuery = { __typename?: 'Query', userGeneSet?: { __typename?: 'UserGeneSet', genes: Array<string | null>, description: string } | null };

export type EnrichmentQueryQueryVariables = Exact<{
  genes: Array<InputMaybe<Scalars['String']['input']>> | InputMaybe<Scalars['String']['input']>;
  filterTerm?: InputMaybe<Scalars['String']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type EnrichmentQueryQuery = { __typename?: 'Query', currentBackground?: { __typename?: 'Background', enrich?: { __typename?: 'PaginatedEnrichResult', totalCount?: number | null, nodes?: Array<{ __typename?: 'EnrichResult', geneSetHash?: any | null, pvalue?: number | null, adjPvalue?: number | null, oddsRatio?: number | null, nOverlap?: number | null, geneSets: { __typename?: 'GeneSetsConnection', totalCount: number, nodes: Array<{ __typename?: 'GeneSet', id: any, term: string, title?: string | null, description?: string | null, nGeneIds: number }> } } | null> | null } | null } | null };

export type TermSearchQueryVariables = Exact<{
  terms: Array<InputMaybe<Scalars['String']['input']>> | InputMaybe<Scalars['String']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type TermSearchQuery = { __typename?: 'Query', geneSetTermSearch?: { __typename?: 'GeneSetsConnection', totalCount: number, nodes: Array<{ __typename?: 'GeneSet', id: any, term: string, title?: string | null, description?: string | null, nGeneIds: number, tripothesis?: { __typename?: 'TripothesisMetadatum', threeWayOverlapCount?: number | null, pValueConservative?: number | null } | null }> } | null };

export type TripothesisDetailQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type TripothesisDetailQuery = { __typename?: 'Query', geneSet?: { __typename?: 'GeneSet', id: any, tripothesis?: { __typename?: 'TripothesisMetadatum', tripothesisId: string, finalRank?: number | null, sourceCrossing?: string | null, modalityCrossing?: string | null, sourceRecord: any } | null } | null };

export type AddUserGeneSetMutationVariables = Exact<{
  genes?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>> | InputMaybe<Scalars['String']['input']>>;
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type AddUserGeneSetMutation = { __typename?: 'Mutation', addUserGeneSet?: { __typename?: 'AddUserGeneSetPayload', userGeneSet?: { __typename?: 'UserGeneSet', id: any } | null } | null };

export type ViewGeneSetQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type ViewGeneSetQuery = { __typename?: 'Query', geneSet?: { __typename?: 'GeneSet', term: string, title?: string | null, description?: string | null, genes: { __typename?: 'GenesConnection', nodes: Array<{ __typename?: 'Gene', symbol: string, ncbiGeneId?: number | null, description?: string | null, summary?: string | null }> } } | null };

export type OverlapQueryQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
  genes: Array<InputMaybe<Scalars['String']['input']>> | InputMaybe<Scalars['String']['input']>;
}>;


export type OverlapQueryQuery = { __typename?: 'Query', geneSet?: { __typename?: 'GeneSet', overlap: { __typename?: 'GenesConnection', nodes: Array<{ __typename?: 'Gene', symbol: string, ncbiGeneId?: number | null, description?: string | null, summary?: string | null }> } } | null };

export type FetchGeneInfoQueryVariables = Exact<{
  genes: Array<InputMaybe<Scalars['String']['input']>> | InputMaybe<Scalars['String']['input']>;
}>;


export type FetchGeneInfoQuery = { __typename?: 'Query', geneMap?: { __typename?: 'GeneMappingsConnection', nodes: Array<{ __typename?: 'GeneMapping', gene?: string | null, geneInfo?: { __typename?: 'Gene', symbol: string, ncbiGeneId?: number | null, description?: string | null, summary?: string | null } | null }> } | null };


export const StatsDocument = gql`
    query Stats {
  userGeneSetCount
  geneSets {
    totalCount
  }
}
    `;

/**
 * __useStatsQuery__
 *
 * To run a query within a React component, call `useStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useStatsQuery(baseOptions?: Apollo.QueryHookOptions<StatsQuery, StatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StatsQuery, StatsQueryVariables>(StatsDocument, options);
      }
export function useStatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StatsQuery, StatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StatsQuery, StatsQueryVariables>(StatsDocument, options);
        }
export type StatsQueryHookResult = ReturnType<typeof useStatsQuery>;
export type StatsLazyQueryHookResult = ReturnType<typeof useStatsLazyQuery>;
export type StatsQueryResult = Apollo.QueryResult<StatsQuery, StatsQueryVariables>;
export const FetchUserGeneSetDocument = gql`
    query FetchUserGeneSet($id: UUID!) {
  userGeneSet(id: $id) {
    genes
    description
  }
}
    `;

/**
 * __useFetchUserGeneSetQuery__
 *
 * To run a query within a React component, call `useFetchUserGeneSetQuery` and pass it any options that fit your needs.
 * When your component renders, `useFetchUserGeneSetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFetchUserGeneSetQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useFetchUserGeneSetQuery(baseOptions: Apollo.QueryHookOptions<FetchUserGeneSetQuery, FetchUserGeneSetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FetchUserGeneSetQuery, FetchUserGeneSetQueryVariables>(FetchUserGeneSetDocument, options);
      }
export function useFetchUserGeneSetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FetchUserGeneSetQuery, FetchUserGeneSetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FetchUserGeneSetQuery, FetchUserGeneSetQueryVariables>(FetchUserGeneSetDocument, options);
        }
export type FetchUserGeneSetQueryHookResult = ReturnType<typeof useFetchUserGeneSetQuery>;
export type FetchUserGeneSetLazyQueryHookResult = ReturnType<typeof useFetchUserGeneSetLazyQuery>;
export type FetchUserGeneSetQueryResult = Apollo.QueryResult<FetchUserGeneSetQuery, FetchUserGeneSetQueryVariables>;
export const EnrichmentQueryDocument = gql`
    query EnrichmentQuery($genes: [String]!, $filterTerm: String = "", $offset: Int = 0, $first: Int = 10) {
  currentBackground {
    enrich(genes: $genes, filterTerm: $filterTerm, offset: $offset, first: $first) {
      nodes {
        geneSetHash
        pvalue
        adjPvalue
        oddsRatio
        nOverlap
        geneSets {
          nodes {
            id
            term
            title
            description
            nGeneIds
          }
          totalCount
        }
      }
      totalCount
    }
  }
}
    `;

/**
 * __useEnrichmentQueryQuery__
 *
 * To run a query within a React component, call `useEnrichmentQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useEnrichmentQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEnrichmentQueryQuery({
 *   variables: {
 *      genes: // value for 'genes'
 *      filterTerm: // value for 'filterTerm'
 *      offset: // value for 'offset'
 *      first: // value for 'first'
 *   },
 * });
 */
export function useEnrichmentQueryQuery(baseOptions: Apollo.QueryHookOptions<EnrichmentQueryQuery, EnrichmentQueryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EnrichmentQueryQuery, EnrichmentQueryQueryVariables>(EnrichmentQueryDocument, options);
      }
export function useEnrichmentQueryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EnrichmentQueryQuery, EnrichmentQueryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EnrichmentQueryQuery, EnrichmentQueryQueryVariables>(EnrichmentQueryDocument, options);
        }
export type EnrichmentQueryQueryHookResult = ReturnType<typeof useEnrichmentQueryQuery>;
export type EnrichmentQueryLazyQueryHookResult = ReturnType<typeof useEnrichmentQueryLazyQuery>;
export type EnrichmentQueryQueryResult = Apollo.QueryResult<EnrichmentQueryQuery, EnrichmentQueryQueryVariables>;
export const TermSearchDocument = gql`
    query TermSearch($terms: [String]!, $offset: Int = 0, $first: Int = 10000) {
  geneSetTermSearch(terms: $terms, offset: $offset, first: $first) {
    nodes {
      id
      term
      title
      description
      nGeneIds
      tripothesis {
        threeWayOverlapCount
        pValueConservative
      }
    }
    totalCount
  }
}
    `;

/**
 * __useTermSearchQuery__
 *
 * To run a query within a React component, call `useTermSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useTermSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTermSearchQuery({
 *   variables: {
 *      terms: // value for 'terms'
 *      offset: // value for 'offset'
 *      first: // value for 'first'
 *   },
 * });
 */
export function useTermSearchQuery(baseOptions: Apollo.QueryHookOptions<TermSearchQuery, TermSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TermSearchQuery, TermSearchQueryVariables>(TermSearchDocument, options);
      }
export function useTermSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TermSearchQuery, TermSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TermSearchQuery, TermSearchQueryVariables>(TermSearchDocument, options);
        }
export type TermSearchQueryHookResult = ReturnType<typeof useTermSearchQuery>;
export type TermSearchLazyQueryHookResult = ReturnType<typeof useTermSearchLazyQuery>;
export type TermSearchQueryResult = Apollo.QueryResult<TermSearchQuery, TermSearchQueryVariables>;
export const TripothesisDetailDocument = gql`
    query TripothesisDetail($id: UUID!) {
  geneSet(id: $id) {
    id
    tripothesis {
      tripothesisId
      finalRank
      sourceCrossing
      modalityCrossing
      sourceRecord
    }
  }
}
    `;

/**
 * __useTripothesisDetailQuery__
 *
 * To run a query within a React component, call `useTripothesisDetailQuery` and pass it any options that fit your needs.
 * When your component renders, `useTripothesisDetailQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTripothesisDetailQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useTripothesisDetailQuery(baseOptions: Apollo.QueryHookOptions<TripothesisDetailQuery, TripothesisDetailQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TripothesisDetailQuery, TripothesisDetailQueryVariables>(TripothesisDetailDocument, options);
      }
export function useTripothesisDetailLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TripothesisDetailQuery, TripothesisDetailQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TripothesisDetailQuery, TripothesisDetailQueryVariables>(TripothesisDetailDocument, options);
        }
export type TripothesisDetailQueryHookResult = ReturnType<typeof useTripothesisDetailQuery>;
export type TripothesisDetailLazyQueryHookResult = ReturnType<typeof useTripothesisDetailLazyQuery>;
export type TripothesisDetailQueryResult = Apollo.QueryResult<TripothesisDetailQuery, TripothesisDetailQueryVariables>;
export const AddUserGeneSetDocument = gql`
    mutation AddUserGeneSet($genes: [String], $description: String = "") {
  addUserGeneSet(input: {genes: $genes, description: $description}) {
    userGeneSet {
      id
    }
  }
}
    `;
export type AddUserGeneSetMutationFn = Apollo.MutationFunction<AddUserGeneSetMutation, AddUserGeneSetMutationVariables>;

/**
 * __useAddUserGeneSetMutation__
 *
 * To run a mutation, you first call `useAddUserGeneSetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddUserGeneSetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addUserGeneSetMutation, { data, loading, error }] = useAddUserGeneSetMutation({
 *   variables: {
 *      genes: // value for 'genes'
 *      description: // value for 'description'
 *   },
 * });
 */
export function useAddUserGeneSetMutation(baseOptions?: Apollo.MutationHookOptions<AddUserGeneSetMutation, AddUserGeneSetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddUserGeneSetMutation, AddUserGeneSetMutationVariables>(AddUserGeneSetDocument, options);
      }
export type AddUserGeneSetMutationHookResult = ReturnType<typeof useAddUserGeneSetMutation>;
export type AddUserGeneSetMutationResult = Apollo.MutationResult<AddUserGeneSetMutation>;
export type AddUserGeneSetMutationOptions = Apollo.BaseMutationOptions<AddUserGeneSetMutation, AddUserGeneSetMutationVariables>;
export const ViewGeneSetDocument = gql`
    query ViewGeneSet($id: UUID!) {
  geneSet(id: $id) {
    term
    title
    description
    genes {
      nodes {
        symbol
        ncbiGeneId
        description
        summary
      }
    }
  }
}
    `;

/**
 * __useViewGeneSetQuery__
 *
 * To run a query within a React component, call `useViewGeneSetQuery` and pass it any options that fit your needs.
 * When your component renders, `useViewGeneSetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useViewGeneSetQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useViewGeneSetQuery(baseOptions: Apollo.QueryHookOptions<ViewGeneSetQuery, ViewGeneSetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ViewGeneSetQuery, ViewGeneSetQueryVariables>(ViewGeneSetDocument, options);
      }
export function useViewGeneSetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ViewGeneSetQuery, ViewGeneSetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ViewGeneSetQuery, ViewGeneSetQueryVariables>(ViewGeneSetDocument, options);
        }
export type ViewGeneSetQueryHookResult = ReturnType<typeof useViewGeneSetQuery>;
export type ViewGeneSetLazyQueryHookResult = ReturnType<typeof useViewGeneSetLazyQuery>;
export type ViewGeneSetQueryResult = Apollo.QueryResult<ViewGeneSetQuery, ViewGeneSetQueryVariables>;
export const OverlapQueryDocument = gql`
    query OverlapQuery($id: UUID!, $genes: [String]!) {
  geneSet(id: $id) {
    overlap(genes: $genes) {
      nodes {
        symbol
        ncbiGeneId
        description
        summary
      }
    }
  }
}
    `;

/**
 * __useOverlapQueryQuery__
 *
 * To run a query within a React component, call `useOverlapQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useOverlapQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOverlapQueryQuery({
 *   variables: {
 *      id: // value for 'id'
 *      genes: // value for 'genes'
 *   },
 * });
 */
export function useOverlapQueryQuery(baseOptions: Apollo.QueryHookOptions<OverlapQueryQuery, OverlapQueryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<OverlapQueryQuery, OverlapQueryQueryVariables>(OverlapQueryDocument, options);
      }
export function useOverlapQueryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<OverlapQueryQuery, OverlapQueryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<OverlapQueryQuery, OverlapQueryQueryVariables>(OverlapQueryDocument, options);
        }
export type OverlapQueryQueryHookResult = ReturnType<typeof useOverlapQueryQuery>;
export type OverlapQueryLazyQueryHookResult = ReturnType<typeof useOverlapQueryLazyQuery>;
export type OverlapQueryQueryResult = Apollo.QueryResult<OverlapQueryQuery, OverlapQueryQueryVariables>;
export const FetchGeneInfoDocument = gql`
    query FetchGeneInfo($genes: [String]!) {
  geneMap(genes: $genes) {
    nodes {
      gene
      geneInfo {
        symbol
        ncbiGeneId
        description
        summary
      }
    }
  }
}
    `;

/**
 * __useFetchGeneInfoQuery__
 *
 * To run a query within a React component, call `useFetchGeneInfoQuery` and pass it any options that fit your needs.
 * When your component renders, `useFetchGeneInfoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFetchGeneInfoQuery({
 *   variables: {
 *      genes: // value for 'genes'
 *   },
 * });
 */
export function useFetchGeneInfoQuery(baseOptions: Apollo.QueryHookOptions<FetchGeneInfoQuery, FetchGeneInfoQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FetchGeneInfoQuery, FetchGeneInfoQueryVariables>(FetchGeneInfoDocument, options);
      }
export function useFetchGeneInfoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FetchGeneInfoQuery, FetchGeneInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FetchGeneInfoQuery, FetchGeneInfoQueryVariables>(FetchGeneInfoDocument, options);
        }
export type FetchGeneInfoQueryHookResult = ReturnType<typeof useFetchGeneInfoQuery>;
export type FetchGeneInfoLazyQueryHookResult = ReturnType<typeof useFetchGeneInfoLazyQuery>;
export type FetchGeneInfoQueryResult = Apollo.QueryResult<FetchGeneInfoQuery, FetchGeneInfoQueryVariables>;