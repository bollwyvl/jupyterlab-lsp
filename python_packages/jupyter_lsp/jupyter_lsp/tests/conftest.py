from __future__ import annotations

import json
import os
import pathlib
import shutil
import socket
from pathlib import Path
from typing import TYPE_CHECKING, Text

import pytest_asyncio
from jupyter_server.serverapp import ServerApp
from pytest import fixture
from tornado.httpserver import HTTPRequest
from tornado.httputil import HTTPServerRequest
from tornado.queues import Queue
from tornado.web import Application

# local imports
from jupyter_lsp import LanguageServerManager
from jupyter_lsp.constants import APP_CONFIG_D_SECTIONS
from jupyter_lsp.handlers import LanguageServersHandler, LanguageServerWebSocketHandler

if TYPE_CHECKING:
    from collections.abc import AsyncIterator, Iterator

# these should always be available in a test environment
KNOWN_SERVERS = [
    "bash-language-server",
    "dockerfile-language-server-nodejs",
    "typescript-language-server",
    "pylsp",
    "unified-language-server",
    "sql-language-server",
    "vscode-css-languageserver-bin",
    "vscode-html-languageserver-bin",
    "vscode-json-languageserver-bin",
    "yaml-language-server",
]

CMD_BASED_SERVERS = {
    "Rscript": ["r-languageserver"],
    "texlab": ["texlab"],
    "jedi-language-server": ["jedi-language-server"],
    "julia": ["julia-language-server"],
}

KNOWN_SERVERS += sum(
    [langs for cmd, langs in CMD_BASED_SERVERS.items() if shutil.which(cmd)], []
)

KNOWN_UNKNOWN_SERVERS = ["foo-language-server"]

LOCALHOST = "127.0.0.1"


def extra_node_roots():
    root = Path(os.environ.get("JLSP_TEST_ROOT") or Path.cwd())
    return dict(extra_node_roots=[str(root)] if root else [])


@fixture
def manager() -> Iterator[LanguageServerManager]:
    manager: LanguageServerManager = LanguageServerManager(**extra_node_roots())
    yield manager
    for session in manager.sessions.values():
        session.stop()


@fixture
def echo_spec():
    return {"argv": ["echo", "no server here"], "languages": ["klingon"], "version": 2}


@fixture
def echo_conf_json(echo_spec) -> str:
    return json.dumps(
        {"LanguageServerManager": {"language_servers": {"_echo_": echo_spec}}},
        indent=2,
        sort_keys=True,
    )


@fixture(params=sorted(APP_CONFIG_D_SECTIONS))
def app_config_d(request, tmp_path, monkeypatch) -> pathlib.Path:
    conf_d = tmp_path / f"jupyter{request.param}config.d"
    conf_d.mkdir()
    monkeypatch.setenv("JUPYTER_CONFIG_PATH", f"{tmp_path}")
    return conf_d


@fixture(params=sorted(KNOWN_SERVERS))
def known_server(request):
    return request.param


@fixture(params=sorted(KNOWN_UNKNOWN_SERVERS))
def known_unknown_server(request):
    return request.param


@fixture
def handlers(
    manager: LanguageServerManager,
) -> Iterator[tuple[MockHandler, MockWebsocketHandler]]:
    ws_handler = MockWebsocketHandler()
    ws_handler.initialize(manager)
    handler = MockHandler()
    handler.initialize(manager)
    yield handler, ws_handler


@fixture
def jsonrpc_init_msg():
    return json.dumps(
        {
            "id": 0,
            "jsonrpc": "2.0",
            "method": "initialize",
            "params": {
                "capabilities": {
                    # see: https://github.com/julia-vscode/LanguageServer.jl/issues/1008
                    # LanguageServer.jl assumes that it is not missing
                    "workspace": {"didChangeConfiguration": {}},
                    # LanguageServer.jl assumes that it is not missing
                    "textDocument": {},
                },
                "initializationOptions": None,
                "processId": None,
                "rootUri": pathlib.Path(__file__).parent.as_uri(),
                "workspaceFolders": None,
            },
        }
    )


@pytest_asyncio.fixture
async def app(unused_port: int) -> AsyncIterator[MockServerApp]:
    app_ = MockServerApp(port=unused_port, ip=LOCALHOST)

    yield app_

    if hasattr(app_, "_http_server"):
        app_.http_server.stop()
        await app_.http_server.close_all_connections()


# mocks
class MockWebsocketHandler(LanguageServerWebSocketHandler):
    _messages_wrote = None  # type: Queue
    _ping_sent = None  # type: bool

    def __init__(self):
        self.request = HTTPServerRequest()
        self.application = Application()

    def initialize(self, manager):
        super().initialize(manager)
        self._messages_wrote = Queue()
        self._ping_sent = False

    def write_message(self, message: Text) -> None:  # type: ignore
        self.log.warning("write_message %s", message)
        self._messages_wrote.put_nowait(message)

    def send_ping(self):
        self._ping_sent = True


class MockHandler(LanguageServersHandler):
    _payload = None
    _jupyter_current_user = "foo"  # type:ignore[assignment]

    def __init__(self):
        self.request = HTTPRequest("GET")
        self.application = Application()

    def finish(self, payload):
        self._payload = payload


class MockServerApp(ServerApp):
    language_server_manager: LanguageServerManager

    def _find_http_port(self) -> None:
        """Overload port finding, to avoid unclosed socket warnings."""


@fixture
def unused_port() -> int:
    """Get an unused port by trying to listen to any random port.

    Probably could introduce race conditions if inside a tight loop.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind((LOCALHOST, 0))
    sock.listen(1)
    port = sock.getsockname()[1]
    assert isinstance(port, int)
    sock.close()
    return port
