# Naming Conventions

Shared naming rules for sc4sap ABAP programs and related objects.

## Main Program

- Pattern: `Z{MODULE}{TYPE}{NN}`
- Example: `ZSDR23070` — SD Report #23070

## Includes

- Suffixes appended to the main program name: `t` / `s` / `c` / `a` / `o` / `i` / `e` / `f` / `_tst`
- Role mapping: see `include-structure.md`

## Local Classes

- `LCL_DATA` — data extraction
- `LCL_ALV` — screen / ALV / display
- `LCL_EVENT` — ALV event handler
- `LCL_TEST_*` — FOR TESTING classes in `{PROG}_tst`

## Global References

Declared in TOP include (`{PROG}t`):
- `GO_DATA`, `GO_ALV`, `GO_EVENT`

## Screens

- 4-digit numeric: `0100`, `0200`, ...

## GUI Status

- `STATUS_{SCREEN}` or purpose-based name (e.g. `MAIN_0100`)

## Procedural ALV FORMs

- Must end with `_{screen_no}` — see `procedural-form-naming.md`
