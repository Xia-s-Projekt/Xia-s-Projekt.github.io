#!/usr/bin/env python
import http.server
import socketserver
import sys
import os

PORT = 8000
DIRECTORY = "."

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

# Force socket release on Linux to prevent "Address already in use" on rapid restarts
socketserver.TCPServer.allow_reuse_address = True

def main():
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            sys.stdout.write(f"Serving directory '{os.path.abspath(DIRECTORY)}' at http://localhost:{PORT}\n")
            sys.stdout.flush()
            httpd.serve_forever()
    except KeyboardInterrupt:
        sys.stdout.write("\nProcess terminated by user.\n")
        sys.exit(0)
    except OSError as e:
        sys.stderr.write(f"Socket binding failure on port {PORT}: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
