# OOP Pattern — Two-Class Split

Shared convention for OOP-mode ABAP programs in sc4sap. Reference: `babamba2/OOALV` repository, program `YRPAEK001`.

## Two-Class Split (Mandatory)

OOP-mode programs must split responsibilities across two local classes (plus an optional event handler):

- **`LCL_DATA`** (in `{PROG}c`) — data selection / extraction
  - Methods: `CONSTRUCTOR`, `GET_DATA`
  - Holds result internal tables as private attributes
  - No UI concerns

- **`LCL_ALV`** (in `{PROG}a`) — screen / ALV / display
  - Methods: `CONSTRUCTOR`, `DISPLAY`, field catalog builders, button/menu handlers
  - Holds ALV grid / container references
  - Reads data from `LCL_DATA` instance

- **`LCL_EVENT`** (in `{PROG}e`) — *optional* ALV event handler
  - Handles `double_click`, `hotspot_click`, `user_command`, etc.

## Main Program Orchestration

```abap
INITIALIZATION.
  GO_DATA = NEW #( ).
  GO_ALV  = NEW #( ).

START-OF-SELECTION.
  GO_DATA->GET_DATA( ).

END-OF-SELECTION.
  GO_ALV->DISPLAY( ).
```

Global references (`GO_DATA`, `GO_ALV`, `GO_EVENT`) are declared in the TOP include (`{PROG}t`).
