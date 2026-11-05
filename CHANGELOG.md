# Changelog



## 0.2.1
<sub>2026-11-05</sub>

- [#5](https://github.com/Saeris/valicon/pull/5)  *(patch)* Thanks [@Saeris](https://github.com/Saeris)!
  Keep `bytes` mocks within Valimock's string bound. A Lexicon `maxLength` such as the 2 MB limit on `com.atproto.sync.subscribeRepos#commit` no longer produces megabytes of base64 that Valimock rejects and regenerates until its retry budget runs out, which made mocking that definition take over a second. A `minLength` larger than the bound now widens it instead of being reported as unsatisfiable.

## 0.2.0
<sub>2026-11-04</sub>

- [#3](https://github.com/Saeris/valicon/pull/3)  *(minor)* Thanks [@Saeris](https://github.com/Saeris)!
  Rebuild the `@saeris/valicon/valimock` entry on Valimock 1.7: `lexiconMocks` is now a set of Valimock options (`stringActions`, `stringFormats` and a `lazy` custom mock) to spread into `new Valimock()`, and the `stringActions` and `stringFormats` tables are exported separately. Valimock 1.7.1 or newer is required.

## 0.1.0
<sub>2026-11-04</sub>

- [#1](https://github.com/Saeris/valicon/pull/1)  *(minor)* Thanks [@Saeris](https://github.com/Saeris)!
  Initial release: Lexicon format actions, Lexicon-only schemas, XRPC definitions, toLexicon, fromLexicon, compileLexicon, and the @saeris/valicon/valimock mocks.
