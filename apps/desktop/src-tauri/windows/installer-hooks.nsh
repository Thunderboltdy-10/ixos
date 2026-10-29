; The Start menu entry is part of the installation, including /UPDATE installs.
; Tauri normally skips creating a missing link during an update and can preserve
; an old link's icon when the executable name changes. Rebuild it with the app ID
; and notify the shell so Windows can discover the new target without a reboot.
!macro NSIS_HOOK_POSTINSTALL
  ${If} $NoShortcutMode != 1
    CreateDirectory "$SMPROGRAMS"
    ClearErrors
    CreateShortcut "$SMPROGRAMS\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\${MAINBINARYNAME}.exe" 0 SW_SHOWNORMAL "" "Search your code and documents by meaning"
    ${If} ${Errors}
      SetErrorLevel 1
      Abort "Could not create the Ixos Start menu shortcut. Run the installer again."
    ${EndIf}
    !insertmacro SetLnkAppUserModelId "$SMPROGRAMS\${PRODUCTNAME}.lnk"
    System::Call 'shell32::SHChangeNotify(i 0x00002000, i 0x1005, w "$SMPROGRAMS\${PRODUCTNAME}.lnk", p 0)'
    System::Call 'shell32::SHChangeNotify(i 0x00001000, i 0x1005, w "$SMPROGRAMS", p 0)'
  ${EndIf}
!macroend
