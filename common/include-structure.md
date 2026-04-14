# Include Structure Convention

Shared convention for sc4sap ABAP programs that wrap logic in a Main Program + conditional Includes. Reference template: `sc4sap/tests/program-template.abap`.

## Include Set

| Include | Suffix | Condition | Content |
|---------|--------|-----------|---------|
| TOP | `{PROG}t` | Always | TYPES, DATA, CONSTANTS declarations |
| Selection Screen | `{PROG}s` | Always | SELECTION-SCREEN, PARAMETERS, SELECT-OPTIONS |
| FORM / Logic | `{PROG}f` | Always (Procedural) / Optional (OOP) | PERFORM business logic |
| Class Definition | `{PROG}c` | OOP | `LCL_DATA` — data extraction class |
| ALV Class | `{PROG}a` | ALV present | `LCL_ALV` — screen/ALV display class |
| PBO | `{PROG}o` | Screen/GUI present | Screen PBO modules |
| PAI | `{PROG}i` | Screen/GUI present | Screen PAI modules |
| Event Handler | `{PROG}e` | OOP + ALV events | ALV event handler class (`LCL_EVENT`) |
| Test Class | `{PROG}_tst` | OOP (required) | FOR TESTING local test classes |

## Main Program

The main program must contain **only**:
- `REPORT` statement
- `INCLUDE` statements (ordered: t → s → c → a → e → o → i → f → _tst)
- Event blocks: `INITIALIZATION`, `AT SELECTION-SCREEN`, `START-OF-SELECTION`, `END-OF-SELECTION`

All declarations and logic live inside the includes, not the main program.

## Conditional Generation Rule

When a program has **no Screen and no ALV**, skip `c` / `a` / `o` / `i` / `e` includes — generate only `t` / `s` / `f`.
