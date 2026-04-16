*&---------------------------------------------------------------------*
*& Report YRTEST001
*&---------------------------------------------------------------------*
*&
*&---------------------------------------------------------------------*
REPORT ZRSC4SAP_OOP_EX.


INCLUDE ZRSC4SAP_OOP_EXT.
INCLUDE ZRSC4SAP_OOP_EXS.
INCLUDE ZRSC4SAP_OOP_EXC.
INCLUDE ZRSC4SAP_OOP_EXA.
INCLUDE ZRSC4SAP_OOP_EXE.
INCLUDE ZRSC4SAP_OOP_EXO.
INCLUDE ZRSC4SAP_OOP_EXI.
INCLUDE ZRSC4SAP_OOP_EXF.

INITIALIZATION.
  GO_DATA = NEW #( ).
  GO_ALV  = NEW #( ).

START-OF-SELECTION.
  GO_DATA->GET_DATA( ).

END-OF-SELECTION.
  GO_ALV->DISPLAY( ).
