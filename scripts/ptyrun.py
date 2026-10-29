#!/usr/bin/env python3
"""Run a command inside a pseudo-terminal so interactive CLIs (eas-cli) see a TTY.

Claude Code's shell has no TTY, so eas-cli switches to non-interactive mode and
skips Apple login, capability sync and provisioning-profile repair. This wrapper
gives the child a real pty, appends its output to <log>, and forwards any bytes
appended to <input> as keystrokes.

usage: ptyrun.py <log> <input> -- <cmd> [args...]
  answer a prompt with:  printf 'y\\n' >> <input>
"""
import fcntl
import os
import pty
import select
import struct
import sys
import termios

log_path, input_path = sys.argv[1], sys.argv[2]
assert sys.argv[3] == '--', 'usage: ptyrun.py <log> <input> -- <cmd> [args...]'
cmd = sys.argv[4:]

open(input_path, 'ab').close()
pid, fd = pty.fork()
if pid == 0:
    os.execvp(cmd[0], cmd)

fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 50, 160, 0, 0))
pos = 0
exit_code = None
with open(log_path, 'ab') as log:
    while True:
        ready, _, _ = select.select([fd], [], [], 0.2)
        if fd in ready:
            try:
                data = os.read(fd, 65536)
            except OSError:
                data = b''
            if not data:
                break
            log.write(data)
            log.flush()
        with open(input_path, 'rb') as f:
            f.seek(pos)
            new = f.read()
        if new:
            pos += len(new)
            os.write(fd, new)
        wpid, status = os.waitpid(pid, os.WNOHANG)
        if wpid:
            exit_code = os.waitstatus_to_exitcode(status)
            while True:
                ready, _, _ = select.select([fd], [], [], 0.5)
                if fd not in ready:
                    break
                try:
                    data = os.read(fd, 65536)
                except OSError:
                    break
                if not data:
                    break
                log.write(data)
                log.flush()
            break
    log.write(f'\n[ptyrun] child exited with {exit_code}\n'.encode())
if exit_code is None:
    _, status = os.waitpid(pid, 0)
    exit_code = os.waitstatus_to_exitcode(status)
sys.exit(exit_code)
