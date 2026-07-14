# QueryKeys and VariableEnforceTypeCast

## Overview

ToQuery conditions involve two separate concerns:

| Concern | Example | Config |
|--------|---------|--------|
| Cast **variable values** (type safety) | `{{$organizations}}` → ObjectId[] | `VariableEnforceTypeCast` |
| Allow **Mongo field paths** in the generated filter | `buyer.organization` | `QueryKeys` (optional) |

Do **not** infer `QueryKeys` from cast maps. Cast maps never participate in field-key allowlisting.

## Security model

1. **Always deny** resolved ToQuery keys that start with `$`, or are `__proto__` / `constructor` / `prototype` (including after template resolution).
2. **`QueryKeys` optional** — if set, only those field paths are allowed; if unset, any non-dangerous key is allowed.
3. **`VariableEnforceTypeCast`** (renamed from `QueryEnforceTypeCast`) only casts values / maps variable names → casters.
4. Template keys are validated **after** resolution at runtime.

## Rename / migration

- Canonical name: `VariableEnforceTypeCast`
- Legacy alias (one release): `QueryEnforceTypeCast`
- At schema compile/validate time, presence of `QueryEnforceTypeCast` emits a `console.warn` deprecation message. Compile does **not** fail for the legacy key.

```typescript
export interface ConditionSchema {
  Enforce?: ConditionEnforceSchema;
  Operators?: string[];
  QueryOperators?: string[];
  VariableEnforceTypeCast?: Record<string, string>;
  /** @deprecated Use VariableEnforceTypeCast */
  QueryEnforceTypeCast?: Record<string, string>;
  QueryKeys?: string[];
}
```

## Schema example (viewOrderLight-style split)

```json
{
  "Condition": {
    "VariableEnforceTypeCast": {
      "organizations": "ToObjectIdArray"
    },
    "QueryKeys": ["buyer.organization"]
  }
}
```

Policy:

```json
"InArray:ToQuery": {
  "buyer.organization": "{{$organizations}}"
}
```

Here the cast map names the **variable**; `QueryKeys` names the **Mongo field path**.

## Runtime behavior (`src/lib/conditions.ts`)

Before building a ToQuery fragment:

1. Resolve each condition key (templates included).
2. Reject dangerous keys (`$…`, `__proto__`, `constructor`, `prototype`).
3. If `QueryKeys` is set, reject keys not in that list.
4. Apply casts from `VariableEnforceTypeCast`, falling back to legacy `QueryEnforceTypeCast`.

## Linter (`src/lib/linter.ts`)

- Same always-on deny-list for literal ToQuery keys.
- Optional `QueryKeys` allow-list when present on referenced schemas.
- Template keys are skipped in static QueryKeys checks (resolved and enforced at runtime).

## Tests

- `$where` denied with **no** `QueryKeys`
- Resolved template keys that become `$where` denied at runtime
- `buyer.organization` allowed when listed in `QueryKeys` while cast map only has `organizations`
- Without `QueryKeys`, dotted paths still work; only deny-list applies
- Legacy `QueryEnforceTypeCast` still works and warns at schema load
