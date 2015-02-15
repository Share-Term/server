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

        console.log(socket.id);

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

            // Term closed
            term.on("close", function (data) {
                console.log("> Emitting _termClosed");
                socket.emit("_termClosed", data);
            });
        });

        // Create term
        socket.on("createTerm", function (data) {
            _terms[socket.id] = new Term(socket);
            _terms[socket.id].on("close", function () {
                console.log("Deleting...");
                setTimeout(function() {
                    delete _terms[socket.id];
                }, 1000);
            });
        });

        socket.on("error", function (err) {
            debugger
            console.log(err);
            socket.emit("_termError", err);
        });
    });
};
