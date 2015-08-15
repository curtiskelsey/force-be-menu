/**
 * Initialize with a d3 selector of the navigation's ul or a JSON array of navigation objects
 * @constructor
 */
var ForceMenu = function(navigationData, options) {

    var _log = {},
        _dataSet = navigationData,
        width = window.innerWidth,
        height = window.innerHeight,
        diagonal = Math.sqrt(width * width + height * height),
        force = null,
        root = null,
        svg = null,
        overlay = null,
        links = null,
        nodes = null,
        circles = null,
        text = null,
        title = document.title,
        maxNameLength = null,
        ref = this,
        _options = {
            'gravity': '0.05',
            'charge': '-30',
            'navigationFillColor': '#AABED8',
            'navigationStrokeColor': '#999999',
            'navigationRadius': diagonal/20,
            'rootFillColor': 'rgb(31, 119, 180)',
            'rootStrokeColor': '#999999',
            'rootRadius': diagonal/20,
            'lineStrokeColor': '#666666',
            'lineStrokeWidth': '1px',
            'lineDistance': diagonal/6,
            'textStrokeColor': '#000000',
            'textSize': '',
            'container': 'body'
        };

    _log.dummyConsole = {
        assert : function(){},
        log : function(){},
        warn : function(){},
        error : function(){},
        debug : function(){},
        dir : function(){},
        info : function(){}
    };

    _log.console = _log.dummyConsole;

    _log.enableConsoleOutput = function(enable) {
        if (enable && window.console !== undefined) {
            _log.console = window.console;
        } else {
            _log.console = _log.dummyConsole;
        }
    };

    /**
     * Initialize the force menu
     */
    function initialize() {

        _log.enableConsoleOutput(true);

        _log.console.debug("Initializing...");

        if (typeof d3 == 'undefined') {
            throw "d3.js is not loaded.";
        }

        switch(detectDataType()){
            case 'element':
                convertElementToDataSet();
                break;
            default:
                break;
        }

        maxNameLength = d3.max(_dataSet.nodes, function(d){ return d.name.length; });
        _options.textSize = diagonal/(10 * maxNameLength);

        constructLinks();

        setupRootNode();

        setupDisplay();

        run();
    }

    /**
     * TODO: Handle resize events
     */
    function resize() {

    }

    /**
     * Determine if the argument provided is a selector or an array of JSON objects
     */
    function detectDataType() {

        if (typeof navigationData[0] == 'undefined') {
            return 'dataset';
        }

        // check if it is a jQuery selection
        if (navigationData[0] instanceof Element) {

            _log.console.debug('The constructor data is a jQuery selector.');
            navigationData = d3.selectAll(navigationData.toArray());
            return 'element';
        }

        if (typeof navigationData[0][0] == 'undefined') {
            return 'dataset';
        }

        if (navigationData[0][0] instanceof Element) {

            _log.console.debug('The constructor data is a selector.');
            return 'element';
        }

        _log.console.debug('The constructor data is a data set.');
        return 'dataset';
    }

    function convertElementToDataSet() {

        _log.console.debug("Converting element selector to data set...");

        var navigationItems = navigationData.selectAll("a");
        _log.console.debug(navigationItems);

        var tempDataSet = [];


        for (var i = 0; i < navigationItems[0].length; i++) {

            _log.console.debug(d3.select(navigationItems[0][i]).text());

            var item = d3.select(navigationItems[0][i]);

            tempDataSet.push({"name":item.text(),"group":1,"url":item.attr("href")});
        }

        _dataSet.nodes = tempDataSet;
    }

    /**
     * Setup a root node for the navigation to attach to
     */
    function setupRootNode() {

        var rootNode = {"name":title,"group":2,"radius":10,"url":"#"};

        _dataSet.nodes.unshift(rootNode);

        root = _dataSet.nodes[0];
        root.x = width/2;
        root.y = height/2;
        root.radius = 10;
        root.fixed = true;

        _log.console.debug(_dataSet);
    }

    /**
     * Define all of the links between the navigation nodes and the root node
     */
    function constructLinks() {

        _dataSet.links = [];

        for (var i = 1; i <= _dataSet.nodes.length; i++) {

            _dataSet.links.push({"source":i,"target":0,"value":10});
        }
    }

    function setupDisplay() {

        overlay = d3.select(_options.container)
            .append("div")
            .attr("class", "svg-container")
            .style("display", "none");

        // Setup the display
        svg = d3.select(_options.container)
            .append("svg:svg")
            .attr("width", width)
            .attr("height", height)
            .style("display", "none");

        links = svg.selectAll("line")
            .data(_dataSet.links)
            .enter().append("svg:line")
            .attr("class", "link")
            .style("stroke-width", _options.lineStrokeWidth)
            .style("stroke", _options.lineStrokeColor);

        nodes = svg.selectAll("circle")
            .data(_dataSet.nodes)
            .enter()
            .append("svg:g");

        circles = nodes.append("svg:circle")
            .attr("class", "node")
            .attr("r", function (d){
                if (d.name == title) {
                    return _options.rootRadius;
                }

                return _options.navigationRadius;
            })
            .style("fill", function(d) {
                if (d.name == title) {
                    return _options.rootFillColor;
                }

                return _options.navigationFillColor;
            })
            .style("stroke", function(d){
                if (d.name == title) {
                    return _options.rootStrokeColor;
                }

                return _options.navigationStrokeColor;
            });

        text = nodes.append("svg:text")
            .attr("class", "text")
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "central")
            .attr("stroke", _options.textStrokeColor)
            .attr("font-size", _options.textSize)
            .text(function(d) {
                return d.name;
            });
    }

    /**
     * Run the display
     */
    function run() {

        force = d3.layout.force()
            .gravity(_options.gravity)
            .charge(_options.charge)
            .nodes(_dataSet.nodes)
            .links(_dataSet.links)
            .linkDistance(_options.lineDistance)
            .size([width, height]);

        // On each tick of the display
        force.on("tick", function (e) {
            var q = d3.geom.quadtree(_dataSet.nodes),
                    i = 0,
                    n = _dataSet.nodes.length;

            while (++i < n) {
                q.visit(collide(_dataSet.nodes[i]));
            }

            nodes.attr("transform",  function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            });

            links.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });
        });

        // When a menu item is clicked, navigate to that location
        nodes.on("click", function(e){

            _log.console.debug(e);

            if (e.url == '#') {
                ref.hide();
            }

            location.assign(e.url);
        });

        //svg.on("click", function(e){
        //   ref.hide();
        //});

        circles.call(force.drag);
    }

    this.hide = function() {

        if (overlay != null) {
            overlay.style("display","none");
        }

        if (svg != null) {
            svg.style("display", "none");
        }

        force.stop();
    }

    this.show = function() {

        if (overlay != null) {
            overlay.style("display","inline");
        }

        if (svg != null) {
            svg.style("display", "inline");
        }

        force.start();
    }

    /**
     * Handle menu item collisions
     */
    function collide(node) {

        var r = node.radius + 16,
                nx1 = node.x - r,
                nx2 = node.x + r,
                ny1 = node.y - r,
                ny2 = node.y + r;

        return function (quad, x1, y1, x2, y2) {

            if (quad.point && (quad.point !== node)) {

                var x = node.x - quad.point.x,
                    y = node.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = node.radius + quad.point.radius;

                if (l < r) {

                    l = (l - r) / l * .5;
                    node.x -= x *= l;
                    node.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }

            return x1 > nx2
                || x2 < nx1
                || y1 > ny2
                || y2 < ny1;
        };
    }

    initialize();
}