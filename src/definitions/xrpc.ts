import type { GenericSchema } from "valibot";

/**
 * XRPC body interface. Describes the input or output of an endpoint.
 */
export interface XrpcBody<TSchema extends GenericSchema | undefined> {
  /**
   * The MIME type of the body, such as `application/json` or `*\/*`.
   */
  readonly encoding: string;
  /**
   * The schema of the body. Only used for JSON bodies.
   */
  readonly schema?: TSchema;
  /**
   * A description of the body.
   */
  readonly description?: string;
}

/**
 * XRPC error interface. A named error an endpoint may respond with.
 */
export interface XrpcError {
  /**
   * The error name, such as `InvalidSwap`.
   */
  readonly name: string;
  /**
   * A description of when the error occurs.
   */
  readonly description?: string;
}

/**
 * Query config interface.
 */
export interface QueryConfig<
  TParameters extends GenericSchema | undefined,
  TOutput extends GenericSchema | undefined
> {
  /**
   * A description of the endpoint.
   */
  readonly description?: string;
  /**
   * The schema of the HTTP query parameters.
   */
  readonly parameters?: TParameters;
  /**
   * The response body.
   */
  readonly output?: XrpcBody<TOutput>;
  /**
   * The errors the endpoint may return.
   */
  readonly errors?: readonly XrpcError[];
}

/**
 * Query definition interface.
 */
export interface QueryDefinition<
  TParameters extends GenericSchema | undefined,
  TOutput extends GenericSchema | undefined
> extends QueryConfig<TParameters, TOutput> {
  /**
   * The definition kind.
   */
  readonly kind: "definition";
  /**
   * The definition type.
   */
  readonly type: "query";
  /**
   * The NSID of the endpoint.
   */
  readonly id: string;
}

/**
 * Creates a [query](https://atproto.com/specs/lexicon#query) definition.
 *
 * A query is an XRPC endpoint called with HTTP GET, identified by an NSID
 * such as `app.bsky.feed.getPosts`. It takes query parameters, has no
 * request body, and usually returns JSON. Use the `parameters` and
 * `output.schema` schemas to validate requests and responses.
 *
 * Hint: Definitions are plain descriptors, not Valibot schemas. They exist
 * so that `toLexicon()` can emit a complete Lexicon document.
 *
 * @param id The NSID of the endpoint.
 * @param config The query config.
 *
 * @returns A query definition.
 */
// @__NO_SIDE_EFFECTS__
export function query<
  const TParameters extends GenericSchema | undefined = undefined,
  const TOutput extends GenericSchema | undefined = undefined
>(
  id: string,
  config: QueryConfig<TParameters, TOutput> = {}
): QueryDefinition<TParameters, TOutput> {
  return { kind: "definition", type: "query", id, ...config };
}

/**
 * Procedure config interface.
 */
export interface ProcedureConfig<
  TParameters extends GenericSchema | undefined,
  TInput extends GenericSchema | undefined,
  TOutput extends GenericSchema | undefined
> extends QueryConfig<TParameters, TOutput> {
  /**
   * The request body.
   */
  readonly input?: XrpcBody<TInput>;
}

/**
 * Procedure definition interface.
 */
export interface ProcedureDefinition<
  TParameters extends GenericSchema | undefined,
  TInput extends GenericSchema | undefined,
  TOutput extends GenericSchema | undefined
> extends ProcedureConfig<TParameters, TInput, TOutput> {
  /**
   * The definition kind.
   */
  readonly kind: "definition";
  /**
   * The definition type.
   */
  readonly type: "procedure";
  /**
   * The NSID of the endpoint.
   */
  readonly id: string;
}

/**
 * Creates a [procedure](https://atproto.com/specs/lexicon#procedure)
 * definition.
 *
 * A procedure is an XRPC endpoint called with HTTP POST, identified by an
 * NSID such as `com.atproto.repo.createRecord`. It may take query
 * parameters, a request body (`input`) and return a response body
 * (`output`). Use the attached schemas to validate each part.
 *
 * Hint: Definitions are plain descriptors, not Valibot schemas. They exist
 * so that `toLexicon()` can emit a complete Lexicon document.
 *
 * @param id The NSID of the endpoint.
 * @param config The procedure config.
 *
 * @returns A procedure definition.
 */
// @__NO_SIDE_EFFECTS__
export function procedure<
  const TParameters extends GenericSchema | undefined = undefined,
  const TInput extends GenericSchema | undefined = undefined,
  const TOutput extends GenericSchema | undefined = undefined
>(
  id: string,
  config: ProcedureConfig<TParameters, TInput, TOutput> = {}
): ProcedureDefinition<TParameters, TInput, TOutput> {
  return { kind: "definition", type: "procedure", id, ...config };
}

/**
 * Subscription message interface.
 */
export interface SubscriptionMessage<TSchema extends GenericSchema> {
  /**
   * A description of the messages.
   */
  readonly description?: string;
  /**
   * The schema of each message. Must be a `union()` of object definitions.
   */
  readonly schema: TSchema;
}

/**
 * Subscription config interface.
 */
export interface SubscriptionConfig<
  TParameters extends GenericSchema | undefined,
  TMessage extends GenericSchema | undefined
> {
  /**
   * A description of the endpoint.
   */
  readonly description?: string;
  /**
   * The schema of the HTTP query parameters.
   */
  readonly parameters?: TParameters;
  /**
   * The messages sent over the stream.
   */
  readonly message?: TMessage extends GenericSchema
    ? SubscriptionMessage<TMessage>
    : undefined;
  /**
   * The errors the endpoint may return.
   */
  readonly errors?: readonly XrpcError[];
}

/**
 * Subscription definition interface.
 */
export interface SubscriptionDefinition<
  TParameters extends GenericSchema | undefined,
  TMessage extends GenericSchema | undefined
> extends SubscriptionConfig<TParameters, TMessage> {
  /**
   * The definition kind.
   */
  readonly kind: "definition";
  /**
   * The definition type.
   */
  readonly type: "subscription";
  /**
   * The NSID of the endpoint.
   */
  readonly id: string;
}

/**
 * Creates a [subscription](https://atproto.com/specs/lexicon#subscription)
 * definition.
 *
 * A subscription is an XRPC event stream served over WebSocket, such as the
 * firehose `com.atproto.sync.subscribeRepos`. Clients connect with query
 * parameters (typically a `cursor`) and receive a stream of messages, each of
 * which is one variant of the `message.schema` union.
 *
 * Hint: Definitions are plain descriptors, not Valibot schemas. They exist
 * so that `toLexicon()` can emit a complete Lexicon document.
 *
 * @param id The NSID of the endpoint.
 * @param config The subscription config.
 *
 * @returns A subscription definition.
 */
// @__NO_SIDE_EFFECTS__
export function subscription<
  const TParameters extends GenericSchema | undefined = undefined,
  const TMessage extends GenericSchema | undefined = undefined
>(
  id: string,
  config: SubscriptionConfig<TParameters, TMessage> = {}
): SubscriptionDefinition<TParameters, TMessage> {
  return { kind: "definition", type: "subscription", id, ...config };
}

/**
 * Any XRPC definition.
 */
export type XrpcDefinition =
  | ProcedureDefinition<
      GenericSchema | undefined,
      GenericSchema | undefined,
      GenericSchema | undefined
    >
  | QueryDefinition<GenericSchema | undefined, GenericSchema | undefined>
  | SubscriptionDefinition<
      GenericSchema | undefined,
      GenericSchema | undefined
    >;
