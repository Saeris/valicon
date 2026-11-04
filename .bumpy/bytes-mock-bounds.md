---
"@saeris/valicon": patch
---

Keep `bytes` mocks within Valimock's string bound. A Lexicon `maxLength` such as the 2 MB limit on `com.atproto.sync.subscribeRepos#commit` no longer produces megabytes of base64 that Valimock rejects and regenerates until its retry budget runs out, which made mocking that definition take over a second. A `minLength` larger than the bound now widens it instead of being reported as unsatisfiable.
