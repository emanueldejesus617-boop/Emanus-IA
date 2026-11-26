; Emanus IA — NSIS Installer Custom Script
; Personaliza o instalador Windows

!macro customHeader
  !system "echo Emanus IA Installer"
!macroend

!macro customInit
  ; Verificar se já está instalado e fechar se necessário
!macroend

!macro customInstall
  ; Criar atalho adicional no Desktop com o nome correto
  CreateShortCut "$DESKTOP\Emanus IA.lnk" "$INSTDIR\Emanus IA.exe" "" "$INSTDIR\Emanus IA.exe" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Emanus IA.lnk"
!macroend

