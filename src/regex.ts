/**
 * [AT URI](https://atproto.com/specs/at-uri-scheme) regex. Captures the
 * authority, collection, record key, trailing slash, query and fragment so the
 * parts can be validated individually. It does not validate the parts itself.
 */
export const AT_URI_REGEX =
  /^(?<uri>at:\/\/(?<authority>[^/?#\s]+)(?:\/(?<collection>[^/?#\s]+)(?:\/(?<rkey>[^/?#\s]+))?)?(?<trailingSlash>\/)?)(?:\?(?<query>[^#\s]*))?(?:#(?<fragment>[^\s]*))?$/u;

/**
 * Matches any character that is not allowed anywhere in an AT URI.
 */
export const AT_URI_INVALID_CHAR_REGEX =
  /[^a-zA-Z0-9._~:@!$&'()*+,;=%/\\[\]#?-]/u;

/**
 * Matches the subset of [JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901)
 * syntax allowed in an AT URI fragment.
 */
export const AT_URI_FRAGMENT_REGEX = /^\/[a-zA-Z0-9._~:@!$&')(*+,;=%[\]/-]*$/u;

/**
 * [Lexicon `bytes`](https://atproto.com/specs/data-model#bytes) regex. Matches
 * the standard (not URL-safe) base64 alphabet of RFC 4648 §4, with optional
 * `=` padding, as used by the `$bytes` JSON encoding.
 */
export const BYTES_REGEX =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}(?:==)?|[A-Za-z0-9+/]{3}=?)?$/u;

/**
 * [CID](https://atproto.com/specs/data-model#link-and-cid-formats) regex for
 * the CID profile allowed by the atproto data model: CIDv1, `dag-cbor` (0x71)
 * or `raw` (0x55) codec, a 32 byte `sha-256` digest, encoded as lowercase
 * base32 with the `b` multibase prefix.
 *
 * Hint: The fixed prefix bytes (`01 71 12 20` or `01 55 12 20`) always encode
 * to `bafyrei` or `bafkrei`, the next character only has room for 3 bits of
 * digest, and the final character must have zero padding bits, which is why
 * those positions are restricted.
 */
export const CID_REGEX = /^baf[yk]rei[a-h][a-z2-7]{50}[aeimquy4]$/u;

/**
 * [Datetime](https://atproto.com/specs/lexicon#datetime) regex. Matches the
 * intersection of RFC 3339 and ISO 8601: a full date, an uppercase `T`, a time
 * with whole seconds and optional fractional seconds, and a mandatory `Z` or
 * `±hh:mm` timezone.
 */
export const DATETIME_REGEX =
  /^(?<fullYear>[0-9]{4})-(?<month>0[1-9]|1[012])-(?<day>[0-2][0-9]|3[01])T(?<hour>[0-1][0-9]|2[0-3]):(?<minute>[0-5][0-9]):(?<second>[0-5][0-9]|60)(?<fraction>\.[0-9]+)?(?<offset>Z|[+-](?:[0-1][0-9]|2[0-3]):[0-5][0-9])$/u;

/**
 * [DID](https://atproto.com/specs/did) regex. Matches the generic W3C DID
 * syntax: a lowercase `did:` prefix, a lowercase method name, and an
 * identifier made of ASCII letters, digits and `._:%-` that does not end in
 * `:` or `%`.
 */
export const DID_REGEX = /^did:[a-z]+:[a-zA-Z0-9._:%-]*[a-zA-Z0-9._-]$/u;

/**
 * [`did:plc`](https://github.com/did-method-plc/did-method-plc) regex. The
 * identifier is always 24 lowercase base32 characters.
 */
export const DID_PLC_REGEX = /^did:plc:[a-z2-7]{24}$/u;

/**
 * [`did:web`](https://atproto.com/specs/did#blessed-did-methods) regex as
 * restricted by atproto: only hostname identifiers are supported (no paths),
 * and a port (percent-encoded as `%3A`) is only allowed for `localhost`.
 */
export const DID_WEB_REGEX =
  /^did:web:(?:localhost(?:%3[aA][0-9]{1,5})?|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)$/u;

/**
 * [Handle](https://atproto.com/specs/handle) regex. Matches a domain name of
 * at least two labels. Labels are ASCII letters, digits and hyphens, cannot
 * start or end with a hyphen, and the final label (the TLD) must start with a
 * letter.
 */
export const HANDLE_REGEX =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/u;

/**
 * [Language](https://atproto.com/specs/lexicon#language) regex. Matches a
 * well-formed [BCP 47](https://www.rfc-editor.org/rfc/rfc5646) language tag,
 * including grandfathered and private-use tags.
 */
export const LANGUAGE_REGEX =
  /^((?<grandfathered>(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?<language>([A-Za-z]{2,3}(-(?<extlang>[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?<script>[A-Za-z]{4}))?(-(?<region>[A-Za-z]{2}|[0-9]{3}))?(-(?<variant>[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?<extension>[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?<privateUseA>[xX](-[A-Za-z0-9]{1,8})+))?)|(?<privateUseB>[xX](-[A-Za-z0-9]{1,8})+))$/u;

/**
 * [NSID](https://atproto.com/specs/nsid) regex. Matches a reversed domain
 * authority of at least two labels followed by a name segment. The name is
 * ASCII letters and digits only, cannot start with a digit, and is case
 * sensitive.
 */
export const NSID_REGEX =
  /^[a-zA-Z](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?:\.[a-zA-Z](?:[a-zA-Z0-9]{0,62})?)$/u;

/**
 * [Record key](https://atproto.com/specs/record-key) regex. Matches 1 to 512
 * characters from the unreserved URI set: ASCII letters, digits and `.-_:~`.
 *
 * Hint: The values `.` and `..` match this regex but are not valid record
 * keys. The `recordKey` action rejects them separately.
 */
export const RECORD_KEY_REGEX = /^[a-zA-Z0-9_~.:-]{1,512}$/u;

/**
 * [TID](https://atproto.com/specs/tid) regex. Matches exactly 13 characters of
 * the base32-sortable alphabet. The first character is restricted because the
 * top bit of the underlying 64-bit integer is always zero.
 */
export const TID_REGEX =
  /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/u;

/**
 * [URI](https://atproto.com/specs/lexicon#uri) regex. Matches any RFC 3986
 * style URI: a scheme, an optional `//`, and a non-empty body with no
 * whitespace.
 */
export const URI_REGEX = /^\w+:(?:\/\/)?[^\s/][^\s]*$/u;
