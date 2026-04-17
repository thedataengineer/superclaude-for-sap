*&---------------------------------------------------------------------*
*& Sample Report Program Template
*& Program  : ZRSC4SAP_PRC_EX
*& Author   : SVT_00005
*& Date     : 2026-04-03
*& S/4HANA  : 2025 Release
*& Version  : v1.0 - Include Structure Change Completed
*& Desc     : Sample Report Program Template
*&            
*&            
*&---------------------------------------------------------------------*
REPORT ZRSC4SAP_PRC_EX.

INCLUDE ZRSC4SAP_PRC_EXT. "TOP
INCLUDE ZRSC4SAP_PRC_EXS. "SELECTION SCREEN
INCLUDE ZRSC4SAP_PRC_EXC. "CLASS
INCLUDE ZRSC4SAP_PRC_EXA. "ALV
INCLUDE ZRSC4SAP_PRC_EXO. "PBO
INCLUDE ZRSC4SAP_PRC_EXI. "PAI
INCLUDE ZRSC4SAP_PRC_EXF. "FORM

*&---------------------------------------------------------------------*
*& INITIALIZATION
*&---------------------------------------------------------------------*
INITIALIZATION.

*&---------------------------------------------------------------------*
*& AT SELECTION-SCREEN
*&---------------------------------------------------------------------*
AT SELECTION-SCREEN.

*&---------------------------------------------------------------------*
*& AT SELECTION-SCREEN OUTPUT 
*&---------------------------------------------------------------------*
AT SELECTION-SCREEN OUTPUT.

*&---------------------------------------------------------------------*
*& AT SELECTION-SCREEN
*&---------------------------------------------------------------------*
AT SELECTION-SCREEN OUTPUT FOR FIELD P_FILE.

    PERFROM GET_FILE.

*&---------------------------------------------------------------------*
*& START-OF-SELECTION
*&---------------------------------------------------------------------*
START-OF-SELECTION.

    PERFORM GET_DATA.

*&---------------------------------------------------------------------*
*& END-OF-SELECTION
*&---------------------------------------------------------------------*
END-OF-SELECTION.

    PERFORM DISPLAY.