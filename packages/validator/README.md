# @autoagentprotocol/validator

Ajv-based validators for [Auto Agent Protocol](https://autoagentprotocol.org) payloads — usable as a library or as the `aap-validate` command-line tool.

## CLI

Validate a payload against the AAP schemas bundled with this package (the current released spec):

```bash
# Auto-detect the schema from the payload's "type" field
npx @autoagentprotocol/validator ./agent-card.json

# Or name the schema (basename) or the AAP message type explicitly
npx @autoagentprotocol/validator inventory-search-request ./search.json
npx @autoagentprotocol/validator inventory.search.request  ./search.json

# Check a live dealer's published agent card
curl -s https://dealer.example.com/.well-known/agent-card.json -o card.json
npx @autoagentprotocol/validator agent-card card.json

# List every schema name and message type the validator knows
npx @autoagentprotocol/validator --list
```

Exit codes: `0` valid · `1` invalid · `2` usage/IO error — so it drops straight into CI:

```yaml
- run: npx @autoagentprotocol/validator agent-card ./public/.well-known/agent-card.json
```

Options:

- `--schemas <dir>` — validate against schemas in `<dir>` instead of the bundled set (e.g. a local `spec/<version>/schemas`).
- `-h, --help`, `-v, --version`.

## Library

```ts
import { AAPValidator } from "@autoagentprotocol/validator";

const validator = new AAPValidator();
validator.loadSchemas("/path/to/spec/v1.1/schemas"); // or loadDefaults()

const { valid, errors } = validator.validate("inventory-search-request", payload);
if (!valid) console.error(errors);
```

`getSchemaNames()` returns every loaded schema key (the schema file basename, e.g. `inventory-search-request`).

## License

Apache-2.0
