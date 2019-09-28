from subprocess import PIPE
from threading import Thread

from pyls_jsonrpc.streams import (
    JsonRpcStreamReader as Reader,
    JsonRpcStreamWriter as Writer,
)
from tornado.escape import json_decode
from tornado.ioloop import IOLoop
from tornado.process import Subprocess
from tornado.queues import Queue
from tornado.websocket import WebSocketHandler
from traitlets import Instance, List, Unicode
from traitlets.config import LoggingConfigurable


class LanguageServerSession(LoggingConfigurable):
    """ Manage a session for a connection to a language server
    """

    argv = List(
        trait=Unicode,
        default_value=[],
        help="the command line arguments to start the language server",
    )
    process = Instance(Subprocess, help="the language server subprocess")
    writer = Instance(Writer, help="the JSON-RPC writer")
    reader = Instance(Reader, help="the JSON-RPC reader")
    thread = Instance(Thread, help="the reader thread")
    from_lsp = Instance(Queue, help="a queue for messages from the server")
    to_lsp = Instance(Queue, help="a queue for message to the server")
    handlers = List(
        trait=Instance(WebSocketHandler),
        default_value=[],
        help="the currently subscribed websockets",
    )

    def __init__(self, argv, **kwargs):
        super().__init__(args=argv, **kwargs)

    def initialize(self):
        self.init_queues()
        self.init_process()
        self.init_writer()
        self.init_reader()
        IOLoop.current().spawn_callback(self._read_from_lsp)
        IOLoop.current().spawn_callback(self._write_to_lsp)

    def write(self, message):
        self.to_lsp.put_nowait(message)

    def init_process(self):
        self.log.info(f"Starting process {self.argv}")
        self.process = Subprocess(self.argv, stdin=PIPE, stdout=PIPE)

    def init_queues(self):
        self.from_lsp = Queue()
        self.to_lsp = Queue()

    def init_writer(self):
        self.writer = Writer(self.process.stdin)

    def init_reader(self):
        def consume():
            IOLoop()
            self.log.debug(f"Thread starting")

            self.reader = Reader(self.process.stdout)

            def broadcast(msg):
                self.from_lsp.put_nowait(msg)

            self.reader.listen(broadcast)

        self.thread = Thread(target=consume)
        self.thread.daemon = True
        self.thread.start()

    async def _read_from_lsp(self):
        async for msg in self.from_lsp:
            for handler in self.handlers:
                handler.write_message(msg)
            self.from_lsp.task_done()

    async def _write_to_lsp(self):
        async for msg in self.to_lsp:
            self.writer.write(json_decode(msg))
            self.to_lsp.task_done()