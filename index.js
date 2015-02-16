// Dependencies
var SocketIO = require("socket.io")
  , EventEmitter = require("events").EventEmitter
  , Jade = require("jade")
  ;

// Configurations
var Views = {
    shareTerm: Jade.compileFile(__dirname + "/ui/index.jade")
};

function Term(socket) {
    var ev = new EventEmitter();

    socket.on("_termData", function (data) {
        ev.emit("data", data);
    });

    socket.on("_termClosed", function (data) {
        ev.emit("close", data);
    });

    socket.on("_termResized", function (data) {
        ev.size = data;
        ev.emit("resize", data);
    });

    return ev;
}

module.exports = function (term) {

    var io = require("socket.io").listen(Bloggify.server._server)
      , _terms = {}
      ;

    Bloggify.server.page.add("/term", function (lien) {
        lien.end(Views.shareTerm({
            shareTerm: term
          , id: lien.search.id
          , data: {
                term: _terms[lien.search.id]
            }
        }));
    });

    // Socket connected
    io.sockets.on("connection", function(socket) {

        // Emit welcome
        socket.emit("welcome", {
           id: socket.id
        });

        // Get terminal data by id
        socket.on("getTerm", function (data) {

            if (!data.id) {
                return socket.emit("_termError", "Missing the term id.");
            }

            var term = _terms[data.id];
            if (!term) {
                return socket.emit("_termError", "Invalid terminal id.");
            }

            // Term data
            term.on("data", function (data) {
                socket.emit("_termData", data);
            });

            term.on("resize", function (data) {
                socket.emit("_termResized", data);
            });

            term.emit("resize", term.size);

            // Term closed
            term.on("close", function (data) {
                socket.emit("_termClosed", data);
            });
        });

        // Create term
        socket.on("createTerm", function (data) {
            _terms[socket.id] = new Term(socket);
            _terms[socket.id].on("close", function () {
                setTimeout(function() {
                    delete _terms[socket.id];
                }, 1000);
            });
        });

        socket.on("error", function (err) {
            socket.emit("_termError", err);
        });
    });
};
