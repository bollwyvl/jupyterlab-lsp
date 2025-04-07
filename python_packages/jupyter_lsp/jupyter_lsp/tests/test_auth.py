"""Integration tests of authorization running under jupyter-server."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import uuid
from typing import Iterator, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

import pytest

from .conftest import KNOWN_SERVERS, LOCALHOST, extra_node_roots

REST_ROUTES = ["/lsp/status"]
WS_ROUTES = [f"/lsp/ws/{ls}" for ls in KNOWN_SERVERS]
SUBPROCESS_PREFIX = json.loads(
    os.environ.get("JLSP_TEST_SUBPROCESS_PREFIX", f"""["{sys.executable}", "-m"]""")
)


@pytest.mark.parametrize("route", REST_ROUTES)
def test_auth_rest(route: str, a_server_url_and_token: Tuple[str, str]) -> None:
    """Verify a REST route only provides access to an authenticated user."""
    base_url, token = a_server_url_and_token

    verify_response(base_url, route)

    raw_body = verify_response(base_url, f"{route}?token={token}", 200)

    assert raw_body is not None, f"no response received from {route}"

    decode_error = None

    try:
        json.loads(raw_body.decode("utf-8"))
    except json.decoder.JSONDecodeError as err:  # pragma: no cover
        decode_error = err
    assert not decode_error, f"the response for {route} was not JSON: {decode_error}"


@pytest.mark.parametrize("route", WS_ROUTES)
def test_auth_websocket(route: str, a_server_url_and_token: Tuple[str, str]) -> None:
    """Verify a WebSocket does not provide access to an unauthenticated user."""
    verify_response(a_server_url_and_token[0], route)


@pytest.fixture
def a_server_url_and_token(
    tmp_path_factory: pytest.TempPathFactory, unused_port: int
) -> Iterator[Tuple[str, str]]:
    """Start a temporary, isolated jupyter server."""
    token = str(uuid.uuid4())

    root_dir = tmp_path_factory.mktemp("root_dir")
    home = tmp_path_factory.mktemp("home")
    server_conf = home / "etc/jupyter/jupyter_config.json"

    server_conf.parent.mkdir(parents=True)
    extensions = {"jupyter_lsp": True, "jupyterlab": False, "nbclassic": False}
    app = {"jpserver_extensions": extensions, "token": token}
    lsm = {**extra_node_roots()}
    config_data = {
        "ServerApp": app,
        "IdentityProvider": {"token": token},
        "LanguageServerManager": lsm,
    }

    server_conf.write_text(json.dumps(config_data), encoding="utf-8")
    args = [
        *SUBPROCESS_PREFIX,
        "jupyter_server",
        f"--port={unused_port}",
        "--no-browser",
    ]
    print("server args", args)
    env = dict(os.environ)
    env.update(
        HOME=str(home),
        USERPROFILE=str(home),
        JUPYTER_CONFIG_DIR=str(server_conf.parent),
    )
    with subprocess.Popen(
        args, cwd=str(root_dir), env=env, stdin=subprocess.PIPE
    ) as proc:
        url = f"http://{LOCALHOST}:{unused_port}"
        retries = 20
        ok = False
        while not ok and retries:
            try:
                with urlopen(f"{url}/favicon.ico"):
                    ok = True
            except URLError:
                print(f"[{retries} / 20] ...", flush=True)
                retries -= 1
                time.sleep(1)
        if not ok:  # pragma: no cover
            raise RuntimeError("the server did not start")
        yield url, token
        try:
            print("shutting down with API...")
            with urlopen(f"{url}/api/shutdown?token={token}", data=[]):
                print("... shut down OK")
        except URLError:  # pragma: no cover
            print("shutting down the hard way...")
            proc.terminate()
            proc.communicate(b"y\n")
            proc.wait()
            proc.kill()
    assert proc.returncode is not None, "jupyter-server probably still running"


def verify_response(
    base_url: str, route: str, expect_code: int = 403
) -> Optional[bytes]:
    """Verify that a response returns the expected error."""
    body = None
    code = None
    url = f"{base_url}{route}"
    try:
        with urlopen(url) as res:
            code = res.getcode()
            body = res.read()
    except HTTPError as err:
        code = err.getcode()
    assert code == expect_code, f"HTTP {code} (not expected {expect_code}) for {url}"
    return body
