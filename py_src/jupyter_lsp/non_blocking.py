"""
Derived from

https://github.com/rudolfwalter/pygdbmi/blob/523581bca12661503df02d74f64b2053945928ce/pygdbmi/gdbcontroller.py
"""
import os

if os.name == "nt":  # pragma: no cover
    import msvcrt
    from ctypes import windll, byref, wintypes, WinError, POINTER
    from ctypes.wintypes import HANDLE, DWORD, BOOL
else:  # pragma: no cover
    import fcntl


def make_non_blocking(file_obj):  # pragma: no cover
    """
    make file object non-blocking

    Windows doesn't have the fcntl module, but someone on
    stack overflow supplied this code as an answer, and it works
    http://stackoverflow.com/a/34504971/2893090
    """

    if os.name == "nt":
        LPDWORD = POINTER(DWORD)
        PIPE_NOWAIT = wintypes.DWORD(0x00000001)

        SetNamedPipeHandleState = windll.kernel32.SetNamedPipeHandleState
        SetNamedPipeHandleState.argtypes = [HANDLE, LPDWORD, LPDWORD, LPDWORD]
        SetNamedPipeHandleState.restype = BOOL

        h = msvcrt.get_osfhandle(file_obj.fileno())

        res = windll.kernel32.SetNamedPipeHandleState(h, byref(PIPE_NOWAIT), None, None)
        if res == 0:
            raise ValueError(WinError())

    else:
        # Set the file status flag (F_SETFL) on the pipes to be non-blocking
        # so we can attempt to read from a pipe with no new data without locking
        # the program up
        fcntl.fcntl(file_obj, fcntl.F_SETFL, os.O_NONBLOCK)
