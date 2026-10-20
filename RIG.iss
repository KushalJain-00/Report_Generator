; Inno Setup script — compile: iscc RIG.iss  (expects dist\RIG.exe from PyInstaller)
[Setup]
AppName=RIG - Report Intelligence Generator
AppVersion=1.0.1
DefaultDirName={autopf}\RIG
DefaultGroupName=RIG
OutputBaseFilename=RIG-Setup
OutputDir=dist
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\RIG.exe
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "dist\RIG.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\RIG"; Filename: "{app}\RIG.exe"
Name: "{autodesktop}\RIG"; Filename: "{app}\RIG.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; Flags: unchecked

[Run]
Filename: "{app}\RIG.exe"; Description: "Launch RIG"; Flags: nowait postinstall skipifsilent
