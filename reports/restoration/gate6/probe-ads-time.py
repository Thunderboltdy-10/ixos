import ctypes
from ctypes import wintypes
import json
from pathlib import Path
import tempfile

kernel=ctypes.WinDLL('kernel32',use_last_error=True)
kernel.CreateFileW.argtypes=[wintypes.LPCWSTR,wintypes.DWORD,wintypes.DWORD,ctypes.c_void_p,wintypes.DWORD,wintypes.DWORD,wintypes.HANDLE]
kernel.CreateFileW.restype=wintypes.HANDLE
class FT(ctypes.Structure):
    _fields_=[('low',wintypes.DWORD),('high',wintypes.DWORD)]
kernel.SetFileTime.argtypes=[wintypes.HANDLE,ctypes.POINTER(FT),ctypes.POINTER(FT),ctypes.POINTER(FT)]
kernel.WriteFile.argtypes=[wintypes.HANDLE,ctypes.c_void_p,wintypes.DWORD,ctypes.POINTER(wintypes.DWORD),ctypes.c_void_p]
kernel.CloseHandle.argtypes=[wintypes.HANDLE]
rows=[]
with tempfile.TemporaryDirectory(prefix='ixos-ads-time-probe-') as folder:
    source=Path(folder)/'source.txt'
    source.write_text('primary bytes',encoding='utf-8')
    for operation in ['create','replace']:
        before=source.stat().st_mtime_ns
        handle=kernel.CreateFileW(str(source)+':ixos_time_probe',0x40000000,7,None,4,0x80,None)
        if handle==ctypes.c_void_p(-1).value:raise ctypes.WinError(ctypes.get_last_error())
        opened=source.stat().st_mtime_ns
        try:
            frozen=FT(0xffffffff,0xffffffff)
            if not kernel.SetFileTime(handle,None,ctypes.byref(frozen),ctypes.byref(frozen)):raise ctypes.WinError(ctypes.get_last_error())
            written=wintypes.DWORD()
            if not kernel.WriteFile(handle,b'cache payload',13,ctypes.byref(written),None):raise ctypes.WinError(ctypes.get_last_error())
        finally:kernel.CloseHandle(handle)
        rows.append({'operation':operation,'mtime_before':before,'mtime_after_open':opened,'mtime_after_close':source.stat().st_mtime_ns})
    assert source.read_text()=='primary bytes'
print(json.dumps(rows,indent=2))
