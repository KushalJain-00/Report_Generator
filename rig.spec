# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec — build: pyinstaller rig.spec --noconfirm --clean
a = Analysis(
    ["app.py"],
    pathex=[],
    binaries=[],
    datas=[("index.html", "."), ("assets", "assets")],
    hiddenimports=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="RIG",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # UPX triggers AV false positives on distributable exes
    console=False,  # windowed app — browser auto-opens
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
