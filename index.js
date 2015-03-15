// Dependencies
var SocketIO = require("socket.io")
  , EventEmitter = require("events").EventEmitter
  , Jade = require("jade")
  ;

// Configurations
var Views = {
    shareTerm: Jade.compileFile(__dirname + "/ui/index.jade")
  , requestControl: Jade.compileFile(__dirname + "/ui/request-control.jade")
};

function Term(socket) {
    var ev = new EventEmitter()
      , _requestingControl = ev._requestingControl = {}
      ;

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

    ev._socket = socket;
    ev._access = {};

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

            socket.on("requestControl", function () {
                var token = term._requestingControl[socket.id] = Math.random()
                  , data = {
                        clientId: socket.id
                      , token: token
                      , termId: term._socket.id
                    }
                  ;
                term._socket.emit("->requestControl", data);
            });

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

            socket.on("clientData", function (data) {
                if (!term._access[socket.id]) {
                    return;
                }
                term._socket.emit("->clientData", data);
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

    // Requesting control
    Bloggify.server.page.add("/term/request-control", function (lien) {
        if (lien.method === "post") {
            lien.redirect("/");
            var thisTerm = _terms[lien.data.termId];
            if (!thisTerm) {
                return;
            }
            var token = thisTerm._requestingControl[lien.data.clientId];
            if (!token) { return; }
            if (token.toString() !== lien.data.token) {
                return;
            }
            if ("yes" in lien.data) {
                thisTerm._access[lien.data.clientId] = true;
                delete thisTerm._requestingControl[lien.data.clientId];
            }
        } else if (!lien.search || !lien.search.clientId || !lien.search.token || !lien.search.termId) {
            lien.redirect("/");
        } else if (lien.method === "get") {
            lien.end(Views.requestControl({
                shareTerm: term
              , data: {
                    clientId: lien.search.clientId
                  , termId: lien.search.termId
                  , token: lien.search.token
                }
            }));
        }
    });
};
