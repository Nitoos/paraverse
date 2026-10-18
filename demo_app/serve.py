import http.server
import socketserver
import os
import sys

PORT = int(os.environ.get("DEMO_PORT", 3001))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map = {
    **Handler.extensions_map,
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
}

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Demo app at http://localhost:{PORT}", flush=True)
    print(f"  Baseline: http://localhost:{PORT}/baseline/", flush=True)
    print(f"  Flawed:   http://localhost:{PORT}/flawed/", flush=True)
    print(f"  Fixed:    http://localhost:{PORT}/fixed/", flush=True)
    httpd.serve_forever()
