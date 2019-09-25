""" A `jupyter-server-proxy`-ready configuration frontend for `jsonrpc-ws-proxy`
"""
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
from typing import Dict, List, Text

import pkg_resources
from jupyter_core.application import JupyterApp, base_aliases, base_flags
from jupyterlab.commands import get_app_dir
from traitlets import Bool
from traitlets import Dict as Dict_
from traitlets import Int
from traitlets import List as List_
from traitlets import Unicode, default

from ._version import __version__
from .constants import EP_CONNECTOR_V0, JWP

aliases = dict(port="LanguageServerApp.port", **base_aliases)

flags = dict(**base_flags)

ConnectorCommands = Dict[Text, List[Text]]


class LanguageServerApp(JupyterApp):
    """ An bridge to jsonrpc-ws-proxy
    """

    version = __version__

    aliases = aliases
    flags = flags

    language_servers = Dict_(
        {}, help="a dictionary of lists of command arguments keyed by language names"
    ).tag(
        config=True
    )  # type: ConnectorCommands

    port = Int(help="the (dynamically) assigned port to pass to jsonrpc-ws-proxy").tag(
        config=True
    )

    jsonrpc_ws_proxy = Unicode(help="path to jsonrpc-ws-proxy/dist/server.js").tag(
        config=True
    )

    nodejs = Unicode(help="path to nodejs executable").tag(config=True)

    autodetect = Bool(
        True, help="try to find known language servers in sys.prefix (and elsewhere)"
    ).tag(config=True)

    node_roots = List_([], help="absolute paths in which to seek node_modules").tag(
        config=True
    )

    extra_node_roots = List_(
        [], help="additional absolute paths to seek node_modules first"
    ).tag(config=True)

    cmd = List_().tag(config=True)

    @default("nodejs")
    def _default_nodejs(self):
        return shutil.which("node") or shutil.which("nodejs")

    @default("jsonrpc_ws_proxy")
    def _default_jsonrpc_ws_proxy(self):
        """ try to find
        """
        return shutil.which(JWP) or self.find_node_module(JWP, "dist", "server.js")

    @default("cmd")
    def _default_cmd(self):
        return [self.nodejs, self.jsonrpc_ws_proxy]

    @default("node_roots")
    def _default_node_roots(self):
        return self.extra_node_roots + [
            os.getcwd(),
            pathlib.Path(get_app_dir()) / "staging",
            pathlib.Path(sys.prefix) / "lib",
            # TODO: "well-known" windows paths
            sys.prefix,
        ]

    def start(self):
        """ Start the Notebook server app, after initialization

        This method takes no arguments so all configuration and initialization
        must be done prior to calling this method."""

        super().start()

        language_servers = self.init_language_servers()

        with tempfile.TemporaryDirectory() as td:
            config_file = pathlib.Path(td) / "langservers.yml"

            # JSON _is_ YAML, so we don't need a dependency just to dump YAML
            config_json = json.dumps(
                {"langservers": language_servers}, indent=2, sort_keys=True
            )
            config_file.write_text(config_json)

            self.log.error(__import__("pprint").pformat(config_json))

            args = self.cmd + [
                "--port",
                str(self.port),
                "--languageServers",
                str(config_file),
            ]

            return subprocess.check_call(args, cwd=td)

    def init_language_servers(self):
        """ determine the final language server configuration.
        """
        language_servers = {}  # type: ConnectorCommands

        # copy the language servers before anybody monkeys with them
        language_servers_from_config = dict(self.language_servers)

        if self.autodetect:
            language_servers.update(self._autodetect_language_servers())

        # restore config
        language_servers.update(language_servers_from_config)

        # coalesce the servers, allowing a user to opt-out by specifying `[]`
        return {language: cmd for language, cmd in language_servers.items() if cmd}

    def _autodetect_language_servers(self):
        servers = {}

        for ep in pkg_resources.iter_entry_points(EP_CONNECTOR_V0):
            try:
                connector = ep.load()
            except Exception as err:
                self.log.warn(
                    "Failed to load language server connector `{}`: \n{}".format(
                        ep.name, err
                    )
                )
                continue

            try:
                for language, cmd in connector(self).items():
                    servers[language] = cmd
            except Exception as err:
                self.log.warning(
                    "Failed to fetch commands from language server conector `{}`:\n{}".format(
                        ep.name, err
                    )
                )
                continue

        return servers

    def find_node_module(self, *path_frag):
        """ look through the node_module roots to find the given node module
        """
        for candidate_root in self.node_roots:
            candidate = pathlib.Path(candidate_root, "node_modules", *path_frag)
            if candidate.exists():
                return str(candidate)


main = launch_new_instance = LanguageServerApp.launch_instance

if __name__ == "__main__":
    sys.exit(main())