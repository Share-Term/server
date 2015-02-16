(function ($) {
    var EventEmitter = Terminal.EventEmitter;

    // Web Term plugin
    $.fn.webTerm = function () {
        var $self = this;
        var term = new EventEmitter;
        var inherits = Terminal.inherits;

        term.updateSize = function (size) {
            size = size || {};
            term.w.cols = size.width || Terminal.geometry[0];
            term.w.rows = size.height || Terminal.geometry[1];

            term.socket.emit("resize", term.w.cols, term.w.rows);
            term.tab.resize(term.w.cols, term.w.rows);
        };

        function openTerm() {
            term.socket = io.connect();

            // Initialize ui
            /// Create the window
            var win = term.w = new EventEmitter;
            win.$ = $self;
            win.$.addClass("webTerm-window");

            win.bind = function () {
                win.$.on("mousedown", function(ev) {
                    term.tab.focus();
                });
            };

            var $bar = $("<div>").addClass("bar");
            var $button = $("<div>").addClass("grip");
            var $title = $("<div>").addClass("title");

            $self.append($bar);
            $bar.append($title);

            /// Create the tab
            var tab = term.tab = Terminal.call(term, {
                cols: win.cols,
                rows: win.rows
            });

            // Create the terminal
            term.socket.emit("getTerm", { id: Url.queryString("id") })

            term.emit("open tab", term);
            term.emit("open");
            // term.updateSize();

            // Listen for connect
            term.socket.on("connect", function() {
                term.emit("connect");
            });

            // Listen for data
            term.socket.on("_termData", function(data) {
                tab.write(data);
            });

            term.socket.on("_termResized", function(size) {
                term.updateSize(size);
            });

            // Listen for kill event
            term.socket.on("kill", function() {
                alert("Closed");
            });

            tab.open(win.$.get(0));
            tab.focus();
            // tab.on("data", function (data) {
            //     term.socket.emit("data", data);
            // });

            win.bind();

            term.emit("load");
            term.emit("open");
            term.updateSize();
        }

        // Open the terminal
        openTerm();
    };
})($);

$(document).ready(function() {
    $(".container").webTerm();
});
