; ==============================================================================
; Emanus IA — NSIS Installer Script
; Produz o instalador standalone .exe oficial para Windows
; ==============================================================================

!include "MUI2.nsh"
!include "FileFunc.nsh"

; Definições Gerais
!define PRODUCT_NAME "Emanus IA"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "Emanus IA"
!define PRODUCT_WEB_SITE "https://emanus-ia.vercel.app"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\Emanus IA.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKCU"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "dist\Emanus IA Setup 1.0.0.exe"
InstallDir "$LOCALAPPDATA\Programs\Emanus IA"
InstallDirRegKey HKCU "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show
RequestExecutionLevel user

; Ícones
!define MUI_ICON "assets\icon.ico"
!define MUI_UNICON "assets\icon.ico"

; Páginas do Instalador
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

; Opção de iniciar app após a instalação
!define MUI_FINISHPAGE_RUN "$INSTDIR\Emanus IA.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir o Emanus IA agora"
!insertmacro MUI_PAGE_FINISH

; Páginas do Desinstalador
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Idioma
!insertmacro MUI_LANGUAGE "Portuguese"

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer

  ; Ficheiros binários da aplicação
  File "bin\Release\net10.0-windows\Emanus IA.exe"
  File "bin\Release\net10.0-windows\Emanus IA.dll"
  File "bin\Release\net10.0-windows\Emanus IA.deps.json"
  File "bin\Release\net10.0-windows\Emanus IA.runtimeconfig.json"

  ; Recursos
  SetOutPath "$INSTDIR\assets"
  File "assets\icon.ico"
  File "assets\icon.png"

  SetOutPath "$INSTDIR"

  ; Criar atalhos
  CreateDirectory "$SMPROGRAMS\Emanus IA"
  CreateShortCut "$SMPROGRAMS\Emanus IA\Emanus IA.lnk" "$INSTDIR\Emanus IA.exe" "" "$INSTDIR\assets\icon.ico" 0
  CreateShortCut "$SMPROGRAMS\Emanus IA\Desinstalar Emanus IA.lnk" "$INSTDIR\Uninstall Emanus IA.exe" "" "$INSTDIR\Uninstall Emanus IA.exe" 0
  CreateShortCut "$DESKTOP\Emanus IA.lnk" "$INSTDIR\Emanus IA.exe" "" "$INSTDIR\assets\icon.ico" 0
SectionEnd

Section -AdditionalIcons
  WriteIniStr "$INSTDIR\${PRODUCT_NAME}.url" "InternetShortcut" "URL" "${PRODUCT_WEB_SITE}"
  CreateShortCut "$SMPROGRAMS\Emanus IA\Site Oficial Emanus IA.lnk" "$INSTDIR\${PRODUCT_NAME}.url" "" "$INSTDIR\assets\icon.ico" 0
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\Uninstall Emanus IA.exe"
  WriteRegStr HKCU "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\Emanus IA.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\Uninstall Emanus IA.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\assets\icon.ico"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd

Function un.onUninstSuccess
  HideWindow
  MessageBox MB_ICONINFORMATION|MB_OK "O $(^Name) foi removido com sucesso do teu computador."
FunctionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Tens a certeza que queres desinstalar completamente o $(^Name) e todos os seus componentes?" IDYES +2
  Abort
FunctionEnd

Section Uninstall
  ; Remover atalhos
  Delete "$DESKTOP\Emanus IA.lnk"
  Delete "$SMPROGRAMS\Emanus IA\Emanus IA.lnk"
  Delete "$SMPROGRAMS\Emanus IA\Desinstalar Emanus IA.lnk"
  Delete "$SMPROGRAMS\Emanus IA\Site Oficial Emanus IA.lnk"
  RMDir "$SMPROGRAMS\Emanus IA"

  ; Remover ficheiros
  Delete "$INSTDIR\Emanus IA.exe"
  Delete "$INSTDIR\Emanus IA.dll"
  Delete "$INSTDIR\Emanus IA.deps.json"
  Delete "$INSTDIR\Emanus IA.runtimeconfig.json"
  Delete "$INSTDIR\${PRODUCT_NAME}.url"
  Delete "$INSTDIR\assets\icon.ico"
  Delete "$INSTDIR\assets\icon.png"
  RMDir "$INSTDIR\assets"

  Delete "$INSTDIR\Uninstall Emanus IA.exe"
  RMDir "$INSTDIR"

  ; Limpar chaves de registo
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKCU "${PRODUCT_DIR_REGKEY}"
  SetAutoClose true
SectionEnd

