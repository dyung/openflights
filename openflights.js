/**
 * openflights.js -- for openflights.org
 * by Jani Patokallio <jani at contentshare dot sg>
 */

// Core map features
var map, proj, selectControl, selectedFeature, lineLayer, currentPopup;
var paneStack = ["ad"];

// User settings (defaults)
var privacy = "Y",
  flightTotal = 0,
  prefs_editor = "B",
  elite = "";

// Filter selections and currently chosen airport
var filter_user = 0,
  filter_trid = 0,
  filter_alid = 0,
  filter_year = 0,
  apid = 0;
var tripname, tripurl;

// Current list of flights
var fidList,
  fidPtr = 0,
  fid = 0;
// Query and description of the current list
var lastQuery, lastDesc;

// Temporary variables for current flight being edited
var alid = 0,
  plane;
var logged_in = false,
  demo_mode = true,
  initializing = true;
var input_srcmarker, input_dstmarker, input_line, input_toggle, input_al_toggle;
var changed = false,
  majorEdit = false;

// Some helpers for multi-input handling
const MULTI_INPUT_ORDER = [
  "src_ap1",
  "dst_ap1",
  "dst_ap2",
  "dst_ap3",
  "dst_ap4",
];
const MULTI_INPUT_IDS = [
  "src_ap1id",
  "src_ap2id",
  "src_ap3id",
  "src_ap4id",
  "dst_ap1id",
  "dst_ap2id",
  "dst_ap3id",
  "dst_ap4id",
  "airline1id",
  "airline2id",
  "airline3id",
  "airline4id",
];
var multiinput_rows = 1;

const URL_FLIGHTS = "/php/flights.php",
  URL_GETCODE = "/php/autocomplete.php",
  URL_KML = "/php/kml.php",
  URL_LOGIN = "/php/login.php",
  URL_LOGOUT = "/php/logout.php",
  URL_MAP = "/php/map.php",
  URL_ROUTES = "/php/routes.php",
  URL_STATS = "/php/stats.php",
  URL_SUBMIT = "/php/submit.php",
  URL_TOP10 = "/php/top10.php";

const CODE_FAIL = 0,
  CODE_ADDOK = 1,
  CODE_EDITOK = 2,
  CODE_DELETEOK = 100;

const INPUT_MAXLEN = 50,
  SELECT_MAXLEN = 25;

const COLOR_NORMAL = "#ee9900", // orange
  COLOR_ROUTE = "#99ee00", // yellow
  COLOR_TRAIN = "#ee5555", // dull red
  COLOR_ROAD = "#9f6500", // brown
  COLOR_SHIP = "#00ccff", // cyany blue
  COLOR_HIGHLIGHT = "#007fff"; // deeper blue

var airportMaxFlights = 0;
const AIRPORT_ICONS = [
  ["/img/icon_plane-13x13.png", 13],
  ["/img/icon_plane-15x15.png", 15],
  ["/img/icon_plane-17x17.png", 17],
  ["/img/icon_plane-19x19b.png", 19],
  ["/img/icon_plane-19x19b.png", 19],
  ["/img/icon_plane-19x19.png", 19],
];

// Redefined with localized strings under init
var classes,
  seattypes,
  reasons,
  classes_short,
  reasons_short,
  extreme_directions,
  distance_units,
  modenames,
  modesegments,
  modeoperators,
  topmodes,
  directions_short;

const MODE_COLORS = {
  F: COLOR_NORMAL,
  T: COLOR_TRAIN,
  R: COLOR_ROAD,
  S: COLOR_SHIP,
};
const MODE_ICONS = {
  F: "/img/icon_airline.png",
  T: "/img/icon_train.png",
  R: "/img/icon_car.png",
  S: "/img/icon_ship.png",
};
const MODE_SPEEDS = { F: 500, T: 100, R: 60, S: 40 };
var toplimits;

/**
 * Validate YYYY*MM*DD date; contains groups, leading zeroes not required for month, date)
 * @type {RegExp}
 */
const RE_DATE =
  /^((19|20)\d\d)[- /.]?([1-9]|0[1-9]|1[012])[- /.]?([1-9]|0[1-9]|[12][0-9]|3[01])$/;
/**
 * Validate numeric value
 * @type {RegExp}
 */
const RE_NUMERIC = /^[0-9]*$/;

var lasturl;

var airportLayer;

// avoid pink tiles
OpenLayers.IMAGE_RELOAD_ATTEMPTS = 3;
OpenLayers.Util.onImageLoadErrorColor = "transparent";

// Init Google Charts
google.load("visualization", "1", { packages: ["corechart"] });
// Call init after Google JS is done initing.
google.setOnLoadCallback(init);

function init() {
  $("helplink").style.display = "inline";
  gt = new Gettext({ domain: "messages" });

  classes = {
    Y: gt.gettext("Economy"),
    P: gt.gettext("Prem.Eco"),
    C: gt.gettext("Business"),
    F: gt.gettext("First"),
    "": "",
  };
  seattypes = {
    W: gt.gettext("Window"),
    A: gt.gettext("Aisle"),
    M: gt.gettext("Middle"),
    "": "",
  };
  reasons = {
    B: gt.gettext("Work"),
    L: gt.gettext("Leisure"),
    C: gt.gettext("Crew"),
    O: gt.gettext("Other"),
    "": "",
  };
  classes_short = {
    Y: gt.gettext("Econ"),
    P: gt.gettext("P.Eco"),
    C: gt.gettext("Biz"),
    F: gt.gettext("1st"),
    "": "",
  };
  reasons_short = {
    B: gt.gettext("Work"),
    L: gt.gettext("Leis."),
    C: gt.gettext("Crew"),
    O: gt.gettext("Other"),
    "": "",
  };
  modenames = {
    F: gt.gettext("Flight"),
    T: gt.gettext("Train"),
    R: gt.gettext("Road"),
    S: gt.gettext("Ship"),
  };
  modesegments = {
    F: gt.gettext("flight"),
    T: gt.gettext("train"),
    R: gt.gettext("road trip"),
    S: gt.gettext("ship"),
  };
  modeoperators = {
    F: gt.gettext("airline"),
    T: gt.gettext("railway"),
    R: gt.gettext("road transport"),
    S: gt.gettext("shipping"),
  };
  extreme_directions = {
    N: gt.gettext("Northernmost"),
    S: gt.gettext("Southernmost"),
    E: gt.gettext("Easternmost"),
    W: gt.gettext("Westernmost"),
  };
  distance_units = {
    km: gt.gettext("km"),
    mi: gt.gettext("miles"),
  };
  topmodes = { F: gt.gettext("Segments"), D: gt.gettext("Mileage") };
  toplimits = {
    10: gt.gettext("Top 10"),
    20: gt.gettext("Top 20"),
    50: gt.gettext("Top 50"),
    "-1": gt.gettext("All"),
  };
  directions_short = {
    N: gt.gettext("N"),
    E: gt.gettext("E"),
    S: gt.gettext("S"),
    W: gt.gettext("W"),
  };
  const projectionName = "EPSG:4326"; // spherical Mercator
  proj = new OpenLayers.Projection(projectionName);

  map = new OpenLayers.Map("map", {
    center: new OpenLayers.LonLat(0, 1682837.6144925),
    controls: [
      new OpenLayers.Control.PanZoom(),
      new OpenLayers.Control.Navigation({
        title: gt.gettext("Toggle pan and region select mode"),
      }),
      new OpenLayers.Control.LayerSwitcher({
        ascending: false,
        title: gt.gettext("Switch map layers"),
      }),
      new OpenLayers.Control.ScaleLine(),
      new OpenLayers.Control.OverviewMap({
        title: gt.gettext("Toggle overview map"),
      }),
      new OpenLayers.Control.Attribution(),
    ],
  });

  // Horrible hack to stop OpenLayers 2 from showing ZL < 2
  map.events.register("zoomend", this, function (event) {
    if (map.getZoom() < 2) {
      map.zoomTo(2);
    }
  });

  var poliLayer = new OpenLayers.Layer.XYZ(
    gt.gettext("Political"),
    [
      "https://cartodb-basemaps-1.global.ssl.fastly.net/light_nolabels/${z}/${x}/${y}.png",
      "https://cartodb-basemaps-1.global.ssl.fastly.net/light_nolabels/${z}/${x}/${y}.png",
      "https://cartodb-basemaps-1.global.ssl.fastly.net/light_nolabels/${z}/${x}/${y}.png",
      "https://cartodb-basemaps-1.global.ssl.fastly.net/light_nolabels/${z}/${x}/${y}.png",
    ],
    {
      attribution: gt.gettext(
        "Map tiles &copy; <a href='https://carto.com/' target='_blank'>CartoDB</a> (CC BY 3.0), data &copy; <a href='https://www.openstreetmap.org' target='_blank'>OSM</a> (ODbL)"
      ),
      sphericalMercator: true,
      transitionEffect: "resize",
      wrapDateLine: true,
    }
  );

  var artLayer = new OpenLayers.Layer.XYZ(
    gt.gettext("Artistic"),
    ["https://stamen-tiles.a.ssl.fastly.net/watercolor/${z}/${x}/${y}.jpg"],
    {
      attribution: gt.gettext(
        "Map tiles &copy; <a href='http://maps.stamen.com/' target='_blank'>Stamen</a> (CC BY 3.0), data &copy; <a href='https://www.openstreetmap.org' target='_blank'>OSM</a> (CC BY SA)"
      ),
      sphericalMercator: true,
      transitionEffect: "resize",
      wrapDateLine: true,
    }
  );
  artLayer.setVisibility(false);

  var earthLayer = new OpenLayers.Layer.XYZ(
    gt.gettext("Satellite"),
    [
      "https://api.tiles.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}.png?access_token=pk.eyJ1IjoianBhdG9rYWwiLCJhIjoiY2lyNmFyZThqMDBiNWcybTFlOWdkZGk1MiJ9.6_VWU3skRwM68ASapMLIQg",
    ],
    {
      attribution: gt.gettext(
        "Map tiles &copy; <a href='https://www.mapbox.com/maps/satellite' target='_blank'>Mapbox</a>"
      ),
      sphericalMercator: true,
      transitionEffect: "resize",
      wrapDateLine: true,
    }
  );
  earthLayer.setVisibility(false);

  lineLayer = new OpenLayers.Layer.Vector(gt.gettext("Flights"), {
    projection: projectionName,
    styleMap: new OpenLayers.StyleMap({
      strokeColor: "${color}",
      strokeOpacity: 1,
      strokeWidth: "${count}",
      strokeDashstyle: "${stroke}",
    }),
  });

  var style = new OpenLayers.Style(
    {
      graphicTitle: "${name}",
      externalGraphic: "${icon}",
      graphicWidth: "${size}",
      graphicHeight: "${size}",
      graphicXOffset: "${offset}",
      graphicYOffset: "${offset}",
      graphicOpacity: "${opacity}",
      pointerEvents: "visiblePainted",
      label: "\xA0${code}",
      fontColor: "#000000",
      fontSize: "9px",
      fontFamily: "Calibri, Verdana, Arial, sans-serif",
      labelAlign: "lt",
      fillColor: "black",
    },
    {
      context: {
        name: function (feature) {
          if (feature.cluster) {
            // The last airport is always the largest
            var last = feature.cluster.length - 1;
            if (feature.cluster[last].attributes.index > 2) {
              // One airport is dominant, copy its attributes into cluster
              feature.attributes.apid = feature.cluster[last].attributes.apid;
              feature.attributes.coreid =
                feature.cluster[last].attributes.coreid;
              feature.attributes.code =
                feature.cluster[last].attributes.code + "+";
              feature.attributes.desc = feature.cluster[last].attributes.desc;
              feature.attributes.rdesc = feature.cluster[last].attributes.rdesc;
              feature.attributes.icon = feature.cluster[last].attributes.icon;
              feature.attributes.size = feature.cluster[last].attributes.size;
              feature.attributes.offset =
                feature.cluster[last].attributes.offset;
              feature.attributes.name =
                feature.cluster[last].attributes.name + " \u2295";
            } else {
              // No dominant airport, show cluster icon with aggregate info
              var name = "";
              for (var c = last; c >= 0; c--) {
                if (c < last) {
                  name += ", ";
                }
                name += feature.cluster[c].attributes.code;
              }
              feature.attributes.icon = "/img/icon_cluster.png";
              feature.attributes.code = "";
              feature.attributes.size = clusterRadius(feature);
              feature.attributes.offset = -clusterRadius(feature) / 2;
              feature.attributes.name = name;
            }
          }
          return feature.attributes.name;
        },
        icon: function (feature) {
          return feature.attributes.icon;
        },
        size: function (feature) {
          return feature.attributes.size;
        },
        offset: function (feature) {
          return feature.attributes.offset;
        },
        opacity: function (feature) {
          return feature.cluster ? 1 : feature.attributes.opacity;
        },
        code: function (feature) {
          return feature.attributes.code;
        },
      },
    }
  );

  var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
  renderer = renderer
    ? [renderer]
    : OpenLayers.Layer.Vector.prototype.renderers;
  var strategy = new OpenLayers.Strategy.Cluster({
    distance: 15,
    threshold: 3,
  });
  airportLayer = new OpenLayers.Layer.Vector(gt.gettext("Airports"), {
    projection: projectionName,
    styleMap: new OpenLayers.StyleMap({
      default: style,
      select: {
        fillOpacity: 1.0,
        pointerEvents: "visiblePainted",
        label: "",
      },
    }),
    renderers: renderer,
    strategies: [strategy],
  });
  map.addLayers([poliLayer, artLayer, earthLayer, lineLayer, airportLayer]);

  selectControl = new OpenLayers.Control.SelectFeature(airportLayer, {
    onSelect: onAirportSelect,
    onUnselect: onAirportUnselect,
  });
  map.addControl(selectControl);
  selectControl.activate();

  // When using the earth map layer, change the font color from black to white, since the map is mostly dark colors.
  map.events.on({
    changelayer: function () {
      style.defaultStyle.fontColor = earthLayer.visibility ? "#fff" : "#000";
    },
  });

  // Extract any arguments from URL
  var query;
  arguments = parseUrl();
  switch (arguments[0]) {
    case "trip":
      filter_trid = arguments[1];
      break;
    case "user":
      filter_user = arguments[1];
      break;
    case "query":
    case "airport":
    case "airline":
      query = arguments[1];
  }

  prepareAutocomplete("qs", "multisearch", {
    successCb: getQuickSearchId,
    failureCb: (e) => undefined,
  });

  // Are we viewing another user's flights or trip?
  if (filter_user != "0" || filter_trid != 0) {
    demo_mode = false;
    $("loginstatus").style.display = "inline";
    if (filter_trid != 0) {
      $("filter_tripselect").style.display = "none";
    }
  } else {
    $("news").style.display = "inline";
    $("quicksearch").style.display = "inline";

    // Nope, set up hinting and autocompletes for editor
    var ac_airport = [
      "src_ap",
      "src_ap1",
      "src_ap2",
      "src_ap3",
      "src_ap4",
      "dst_ap",
      "dst_ap1",
      "dst_ap2",
      "dst_ap3",
      "dst_ap4",
    ];
    var ac_airline = [
      "airline",
      "airline1",
      "airline2",
      "airline3",
      "airline4",
    ];
    var ac_plane = ["plane"];

    for (const airportAutoCompInputId of ac_airport) {
      prepareAutocomplete(airportAutoCompInputId, "airport", {
        successCb: (item) => {
          document.getElementById(airportAutoCompInputId).value = item.label;
          getSelectedApid(airportAutoCompInputId, item.value);
        },
        failureCb: (error) => {
          invalidateField(airportAutoCompInputId, true);
        },
      });
    }

    for (const airlineAutoCompInputId of ac_airline) {
      prepareAutocomplete(airlineAutoCompInputId, "airline", {
        successCb: (item) => {
          document.getElementById(airlineAutoCompInputId).value = item.label;
          getSelectedAlid(airlineAutoCompInputId, item.value);
        },
      });
    }

    for (const planeAutoCompInputId of ac_plane) {
      prepareAutocomplete(planeAutoCompInputId, "plane", {
        preprocessCb: (list) =>
          list.map((item) => {
            // Logic moved from `autocomplete.php` to house presentation details
            // in the UI. But why are planes special? We don't shorten airport
            // or airline names. Is it because that input field isn't as wide?
            // This is the only type of autocomplete that needs this kind of
            // preprocessing...
            const maxLen = 35;
            let label = item.label;
            if (label.length > maxLen) {
              label = `${label.slice(0, maxLen - 13)}...${label.slice(-10)}`;
            }

            item.label = label;
            return item;
          }),
        successCb: (item) => {
          document.getElementById(planeAutoCompInputId).value = item.label;
          getSelectedPlid(planeAutoCompInputId, item.value);
        },
      });
    }

    // No idea why this is needed, but FF3 disables random buttons without it...
    for (var i = 0; i < document.forms["inputform"].elements.length; i++) {
      document.forms["inputform"].elements[i].disabled = false;
    }
    for (i = 0; i < document.forms["multiinputform"].elements.length; i++) {
      document.forms["multiinputform"].elements[i].disabled = false;
    }
    $("b_less").disabled = true;

    map.zoomTo(2);
  }

  OpenLayers.Util.alphaHack = function () {
    return false;
  };

  if (query) {
    xmlhttpPost(URL_ROUTES, 0, query);
  } else {
    xmlhttpPost(URL_MAP, 0, true);
  }
}

function clusterRadius(feature) {
  var radius = feature.attributes.count * 5;
  if (radius > 29) {
    radius = 29;
  }
  return radius;
}

/**
 * Extract arguments from URL (/command/value, eg. /trip/123 or /user/foo)
 * @returns {string[]|*[]}
 */
function parseUrl() {
  // http://foobar.com/name/xxx#blah *or* xxx?blah=blah
  // 0      1          2    3   4         3   4
  var urlbits = window.location.href.split(/[\/#?]+/);
  if (urlbits.length > 3) {
    return [urlbits[2], unescape(urlbits[3])];
  } else {
    return [null, null];
  }
}

function projectedPoint(x, y) {
  var point = new OpenLayers.Geometry.Point(x, y);
  point.transform(proj, map.getProjectionObject());
  return point;
}

function projectedLine(points) {
  var line = new OpenLayers.Geometry.LineString(points);
  line.transform(proj, map.getProjectionObject());
  return line;
}

/**
 * Draw a flight connecting (x1,y1)-(x2,y2)
 * Note: Values passed in *must already be parsed as floats* or very strange things happen
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @param count
 * @param distance
 * @param color
 * @param stroke
 * @returns {*[]}
 */
function drawLine(x1, y1, x2, y2, count, distance, color, stroke) {
  if (!color) {
    color = COLOR_NORMAL;
  }
  if (!stroke) {
    stroke = "solid";
  }

  // 1,2 flights as single pixel
  count = Math.floor(Math.sqrt(count) + 0.5);

  var paths = [
    gcPath(
      new OpenLayers.Geometry.Point(x1, y1),
      new OpenLayers.Geometry.Point(x2, y2)
    ),
  ];
  // The path is in or extends into east (+) half, so we have to make a -360 copy
  if (x1 > 0 || x2 > 0) {
    paths.push(
      gcPath(
        new OpenLayers.Geometry.Point(x1 - 360, y1),
        new OpenLayers.Geometry.Point(x2 - 360, y2)
      )
    );
  }
  // The path is in or extends into west (-) half, so we have to make a +360 copy
  if (x1 < 0 || x2 < 0) {
    paths.push(
      gcPath(
        new OpenLayers.Geometry.Point(x1 + 360, y1),
        new OpenLayers.Geometry.Point(x2 + 360, y2)
      )
    );
  }
  var features = [];
  for (var i = 0; i < paths.length; i++) {
    features.push(
      new OpenLayers.Feature.Vector(projectedLine(paths[i]), {
        count: count,
        color: color,
        stroke: stroke,
      })
    );
  }
  return features;
}

/**
 * `autocomplete.js` wrapper to encapsulate logic dealing with setting up the
 *  autocomplete widgets and interacting with the autocomplete API endpoint.
 * @param inputId
 * @param searchType
 * @param successCb
 * @param failureCb
 * @param preprocessCb
 */
function prepareAutocomplete(
  inputId,
  searchType,
  { successCb, failureCb, preprocessCb }
) {
  const inputElement = document.getElementById(inputId);

  autocomplete({
    input: inputElement,
    minLength: 1,
    debounceWaitMs: 100,
    fetch: (text, update) => {
      showLoadingAnimation(true);
      fetch(URL_GETCODE, {
        method: "POST",
        headers: {
          "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: new URLSearchParams([
          ["searchType", searchType],
          ["searchText", text],
        ]),
      })
        .then((response) => {
          if (response.status !== 200) {
            throw new Error(response.status);
          }
          return response.json();
        })
        .then((response) => {
          let data = response;
          if (preprocessCb) data = preprocessCb(data);

          if (data.length === 0) {
            // TODO: Localise?
            throw new Error("No data available");
          }

          update(data);
        })
        .catch((e) => {
          if (failureCb) {
            failureCb(e);
          } else {
            invalidateField(inputId);
          }
        })
        .finally(() => {
          showLoadingAnimation(false);
        });
    },
    onSelect: (item) => {
      successCb(item);
    },
    customize: (input, inputRect, container, maxHeight) => {
      if (maxHeight < 100) {
        container.style.top = "";
        container.style.bottom =
          window.innerHeight - inputRect.bottom + input.offsetHeight + "px";
        container.style.maxHeight = "200px";
      }
    },
  });
}

/**
 * Draw airport (or just update marker if it exists already)
 *
 * @param airportLayer
 * @param apdata
 * @param name
 * @param city
 * @param country
 * @param count
 * @param formattedName
 * @param opacity
 * @param coreid apid of "core" airport at the center of a map of routes
 * @returns {boolean} Returns true if a new marker was created, or false if it existed already
 */
function drawAirport(
  airportLayer,
  apdata,
  name,
  city,
  country,
  count,
  formattedName,
  opacity,
  coreid
) {
  var apcols = apdata.split(":");
  var code = apcols[0];
  var apid = apcols[1];
  var x = apcols[2];
  var y = apcols[3];

  // Description
  var desc =
    name +
    " (<b>" +
    code +
    "</b>)<br><small>" +
    city +
    ", " +
    country +
    "</small><br>" +
    gt.gettext("Flights: ") +
    count;
  var rdesc =
    name +
    " (<b>" +
    code +
    "</b>)<br><small>" +
    city +
    ", " +
    country +
    "</small>";

  // Select icon based on the number of flights (0...AIRPORT_ICONS.length-1)
  var colorIndex =
    Math.floor((count / airportMaxFlights) * AIRPORT_ICONS.length) + 1;

  // When two or fewer flights: smallest dot
  if (count <= 2 || colorIndex < 0) {
    colorIndex = 0;
  }
  // More than two flights: at least 2nd smallest
  if (count > 2) {
    colorIndex = Math.max(1, colorIndex);
  }
  // Max out at top color
  // Core airport of the route map always uses max color
  if (colorIndex >= AIRPORT_ICONS.length || apid == coreid) {
    colorIndex = AIRPORT_ICONS.length - 1;
  }
  // This should never happen
  if (!AIRPORT_ICONS[colorIndex]) {
    $("news").style.display = "inline";
    $("news").innerHTML = gt.strargs(
      gt.gettext(
        "ERROR: %1: %2 of %3.<br>Please hit CTRL-F5 to force refresh, and <a href='/about'>report</a> this error if it does not go away."
      ),
      [name, colorIndex, airportMaxFlights]
    );

    colorIndex = 0;
    return;
  }

  var feature = new OpenLayers.Feature.Vector(projectedPoint(x, y));
  feature.attributes = {
    apid: apid,
    coreid: coreid,
    code: code,
    name: formattedName,
    apdata: apdata,
    desc: desc,
    rdesc: rdesc,
    opacity: opacity,
    icon: AIRPORT_ICONS[colorIndex][0],
    size: AIRPORT_ICONS[colorIndex][1],
    index: count,
    offset: Math.floor(-AIRPORT_ICONS[colorIndex][1] / 2),
  };

  return feature;
}

/**
 * Run when the user clicks on an airport marker
 * @param airport
 */
function onAirportSelect(airport) {
  function encodeURIQuote(str) {
    return encodeURI(str).replace("'", "&apos;");
  }

  apid = airport.attributes.apid;
  var code = airport.attributes.code;
  var coreid = airport.attributes.coreid;
  var rdesc = airport.attributes.rdesc;

  // Single airport?
  if (!airport.cluster) {
    // Add toolbar to popup
    var desc =
      "<span style='position: absolute; right: 5; bottom: 1;'>" +
      "<a href='#' onclick='JavaScript:selectAirport(" +
      apid +
      // TODO: alt text
      ", true);'><img src='/img/icon_plane-src.png' width=17 height=17 title='" +
      gt.gettext("Select this airport") +
      "' id='popup" +
      apid +
      "' style='visibility: hidden'></a>";

    if (coreid == 0) {
      // Detailed flights accessible only if...
      // 1. user is logged in, or
      // 2. system is in "demo mode", or
      // 3. privacy is set to (O)pen
      if (logged_in || demo_mode || privacy == "O") {
        // Get list of user flights
        desc +=
          " <a href='#' onclick='JavaScript:xmlhttpPost(\"" +
          URL_FLIGHTS +
          '",' +
          apid +
          ', "' +
          encodeURIQuote(airport.attributes.desc) +
          // TODO: alt text
          "\");'><img src='/img/icon_copy.png' width=16 height=16 title='" +
          gt.gettext("List my flights") +
          "'></a>";
      }
    } else {
      if (code.length == 3) {
        var idstring;
        // Get a list of airport routes
        if (coreid.startsWith("L")) {
          idstring = coreid + "," + apid;
        } else {
          idstring = "R" + apid + "," + coreid;
        }
        desc +=
          " <a href='#' onclick='JavaScript:xmlhttpPost(\"" +
          URL_FLIGHTS +
          '","' +
          idstring +
          '", "' +
          encodeURIQuote(rdesc) +
          // TODO: alt text
          "\");'><img src='/img/icon_copy.png' width=16 height=16 title='" +
          gt.gettext("List routes") +
          "'></a> ";
      }
    }
    if (code.length == 3) {
      // IATA airport, we know its routes
      desc +=
        " <a href='#' onclick='JavaScript:xmlhttpPost(\"" +
        URL_ROUTES +
        '",' +
        apid +
        // TODO: alt text
        ");'><img src='/img/icon_routes.png' width=17 height=17 title='" +
        gt.gettext("Map of routes from this airport") +
        "'></a>";
    }
    desc +=
      " <a href='#' onclick='JavaScript:popNewAirport(null, " +
      apid +
      // TODO: alt text
      ")'><img src='/img/icon_edit.png' width=16 height=16 title='" +
      gt.gettext("View airport details") +
      "'></a>";
    desc +=
      "</span>" +
      airport.attributes.desc.replace("Flights:", gt.gettext("Flights:"));
  } else {
    // Cluster, generate a clickable list of members in reverse order (most flights first)
    desc = "<b>" + gt.gettext("Airports") + "</b><br>";
    var edit = isEditMode() ? "true" : "false";
    var cmax = airport.cluster.length - 1;
    for (var c = cmax; c >= 0; c--) {
      if (c < cmax) {
        desc += ", ";
        if ((cmax - c) % 6 == 0) {
          desc += "<br>";
        }
      }
      desc +=
        "<a href='#' onclick='JavaScript:selectAirport(" +
        airport.cluster[c].attributes.apid +
        "," +
        edit +
        ")'>" +
        airport.cluster[c].attributes.code +
        "</a>";
    }
  }

  // TODO: alt text
  desc =
    '<img src="/img/close.gif" onclick="JavaScript:closePopup(true);" width=17 height=17> ' +
    desc;
  closePopup(false);

  if (airport.popup == null) {
    airport.popup = new OpenLayers.Popup.FramedCloud(
      "airport",
      airport.geometry.getBounds().getCenterLonLat(),
      new OpenLayers.Size(200, 80),
      desc,
      null,
      false
    );
    airport.popup.minSize = new OpenLayers.Size(200, 80);
    airport.popup.overflow = "auto";

    map.addPopup(airport.popup);
    airport.popup.show();
  } else {
    airport.popup.setContentHTML(desc);
    airport.popup.toggle();
  }
  if (airport.popup.visible()) {
    currentPopup = airport.popup;
  } else {
    closePane();
  }
  // Show or hide toolbar when applicable
  if ($("popup" + apid)) {
    if (isEditMode()) {
      $("popup" + apid).style.visibility = "visible";
    } else {
      $("popup" + apid).style.visibility = "hidden";
    }
  }
}

function onAirportUnselect(airport) {
  // do nothing
}

function xmlhttpPost(strURL, id, param) {
  var self = this;
  var query = "";

  if (!initializing) {
    closeNews();
  }

  // Mozilla/Safari
  if (window.XMLHttpRequest) {
    self.xmlHttpReq = new XMLHttpRequest();
  }
  // IE
  else if (window.ActiveXObject) {
    self.xmlHttpReq = new ActiveXObject("Microsoft.XMLHTTP");
  }
  self.xmlHttpReq.open("POST", strURL, true);
  self.xmlHttpReq.setRequestHeader(
    "Content-Type",
    "application/x-www-form-urlencoded"
  );
  self.xmlHttpReq.onreadystatechange = function () {
    // 4 means "request finished and response is ready"
    if (self.xmlHttpReq.readyState != 4) {
      return;
    }
    // TODO: Localised response? But also, probably just "Not logged in, aborting" based on usages
    if (self.xmlHttpReq.responseText.substring(0, 13) == "Not logged in") {
      logout(self.xmlHttpReq.responseText);
      return;
    }
    if (strURL == URL_FLIGHTS) {
      switch (param) {
        case "COPY":
        case "EDIT":
          editFlight(self.xmlHttpReq.responseText, param);
          break;

        case "RELOAD":
          param = lastDesc;
        // param contains previously escaped semi-random HTML title
        // fallthru

        case "MAP":
        default:
          listFlights(self.xmlHttpReq.responseText, unescape(param), id);
          break;
      }
      showLoadingAnimation(false);
    } else if (strURL == URL_GETCODE) {
      const resp = JSON.parse(self.xmlHttpReq.responseText);
      var cols;
      // Hack the old format back in (for now)
      if (resp.length) {
        cols = [resp[0].value, resp[0].label];
      } else {
        cols = [""];
      }
      switch (param) {
        case "qs":
          var alid = cols[0];
          if (alid != "" && alid != 0) {
            if (cols[0].indexOf(":") > 0) {
              $("qsid").value = cols[0].split(":")[1]; // airport
            } else {
              $("qsid").value = "L" + cols[0]; // airline
            }
            $("qs").value = cols[1];
            $("qs").style.color = "#000000";
            $("qsgo").disabled = false;
            $("qsgo").focus();
          } else {
            $("qsid").value = 0;
            $("qs").style.color = "#FF0000";
            $("qsgo").disabled = true;
          }
          break;

        case "airline":
        case "airline1":
        case "airline2":
        case "airline3":
        case "airline4":
          var alid = cols[0];
          if (alid != "" && alid != 0) {
            $(param + "id").value = cols[0];
            $(param).value = cols[1];
            $(param).style.color = "#000000";
            replicateSelection(param);
            markAsChanged(true); // new airline, force refresh on save
          } else {
            $(param).style.color = "#FF0000";
            $(param + "id").value = 0;
          }
          break;

        case "src_ap":
        case "dst_ap":
        case "src_ap1":
        case "dst_ap1":
        case "src_ap2":
        case "dst_ap2":
        case "src_ap3":
        case "dst_ap3":
        case "src_ap4":
        case "dst_ap4":
          var apdata = cols[0];
          var apid = apdata.split(":")[1];
          if (apid && apid != 0) {
            $(param + "id").value = apdata;
            $(param).value = cols[1];
            $(param).style.color = "#000000";
            replicateSelection(param);
            markAirport(param); // new airport, force refresh on save
            markAsChanged(true);
          } else {
            invalidateField(param);
          }
          break;
      }
    } else if (strURL == URL_LOGIN) {
      login(self.xmlHttpReq.responseText, param);
    } else if (strURL == URL_LOGOUT) {
      logout(self.xmlHttpReq.responseText);
    } else if (strURL == URL_MAP || strURL == URL_ROUTES) {
      var str = self.xmlHttpReq.responseText;
      // TODO: Localise
      if (str.substring(0, 6) == "Signup") {
        window.location = "/html/settings?new=yes&vbulletin=true";
      } else if (str.substring(0, 5) == "Error") {
        $("result").innerHTML =
          "<h4>" +
          str.split(";")[1] +
          "</h4><br><h6><a href='/'>" +
          gt.gettext("Home") +
          "</a></h6>";
        showLoadingAnimation(false);
        openPane("result");
      } else {
        // Zoom map to fit when first loading another user's flights/trip
        updateMap(str, strURL);
        if (!logged_in && !demo_mode && initializing) {
          closePane();
          var extent = airportLayer.getDataExtent();
          if (extent) {
            map.zoomToExtent(extent);
          }
        }
        if (strURL == URL_MAP) {
          if (param) {
            updateFilter(str);
          }
          $("maptitle").innerHTML = getMapTitle(true);
        } else {
          updateFilter(str);
          closePopup(true);
          $("qsid").value = 0;
          $("qsgo").disabled = true;
          if (filter_alid == 0) {
            var extent = airportLayer.getDataExtent();
            if (extent) {
              map.zoomToExtent(extent);
            }
          }
        }

        // Map now completely drawn for the first time
        if (initializing) {
          initializing = false;
        }
      }
    } else if (strURL == URL_STATS) {
      showStats(self.xmlHttpReq.responseText);
      showLoadingAnimation(false);
    } else if (strURL == URL_TOP10) {
      showTop10(self.xmlHttpReq.responseText);
      showLoadingAnimation(false);
    } else if (strURL == URL_SUBMIT) {
      var result = self.xmlHttpReq.responseText.split(";"),
        code = result[0],
        text = result[1];
      if (getCurrentPane() == "multiinput") {
        $("multiinput_status").innerHTML = "<b>" + text + "</b>";
      } else {
        $("input_status").innerHTML = "<b>" + text + "</b>";
      }
      setCommitAllowed(false);

      // Something went wrong, so we just abort
      if (code == CODE_FAIL) {
        return;
      }

      // If flight was successfully deleted...
      if (code == CODE_DELETEOK) {
        //... and we're in input mode, move to another flight
        if (getCurrentPane() == "input") {
          // Last flight deleted
          if (fidList.length == 1) {
            clearStack();
          } else {
            // Remove current flight
            fidList.splice(fidPtr, 1);

            // Edit next if you can
            if (fidPtr < fidList.length) {
              editPointer(0);
            } else {
              // Move back
              editPointer(-1);
            }
          }
        } else {
          // Not in edit mode, so reload the currently displayed list of flights
          xmlhttpPost(URL_FLIGHTS, 0, "RELOAD");
        }
        majorEdit = true; // trigger map refresh
      } else if (code == CODE_EDITOK || code == CODE_ADDOK) {
        // If adding new flights (not editing), swap last destination to be the new source and focus on date
        if (getCurrentPane() == "input") {
          if ($("addflighttitle").style.display == "inline") {
            swapAirports(false);
            document.forms["inputform"].seat.value = "";
            document.forms["inputform"].seat_type.selectedIndex = 0;
            document.forms["inputform"].src_date.focus();
          }
        } else {
          clearInput(); // Always clear multiview
        }
      }

      // A change that affected the map was made, so redraw
      if (majorEdit) {
        if (code == CODE_DELETEOK) {
          setTimeout("refresh(true)", 1000); // wait for earlier ops to complete...
        } else {
          refresh(true); // ...else do it right now
        }
      } else {
        showLoadingAnimation(false);
      }
      majorEdit = false;
    }
  };
  // End of result processing

  // Start query string generation
  switch (strURL) {
    case URL_SUBMIT:
      var inputform = document.forms["inputform"];

      // Deleting needs only the fid, and can be run without the input form
      if (param != "DELETE") {
        var i, indexes;
        if (getCurrentPane() == "multiinput") {
          query = "multi=" + multiinput_rows + "&";
          indexes = [];
          for (i = 1; i <= multiinput_rows; i++) {
            indexes.push(i);
          }
        } else {
          indexes = [""];
        }
        for (i = 0; i < indexes.length; i++) {
          var src_date = $("src_date" + indexes[i]).value;
          if (!RE_DATE.test(src_date)) {
            alert(
              gt.gettext(
                "Please enter a full date in year/month/date order, eg. 2008/10/30 for 30 October 2008. Valid formats include YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD and YYYY MM DD."
              )
            );
            $("src_date" + indexes[i]).focus();
            return;
          }
          var src_apid = getApid("src_ap" + indexes[i]);
          if (!src_apid || src_apid == "0") {
            alert(gt.gettext("Please enter a valid source airport."));
            $("src_ap" + indexes[i]).focus();
            return;
          }
          var dst_apid = getApid("dst_ap" + indexes[i]);
          if (!dst_apid || dst_apid == "0") {
            alert(gt.gettext("Please enter a valid destination airport."));
            $("dst_ap" + indexes[i]).focus();
            return;
          }
          var alid = $("airline" + indexes[i] + "id").value;
          var airline = $("airline" + indexes[i]).value.trim();
          if (!alid || alid == 0) {
            // TODO: Do we need this comparison against placeholder?
            if (airline == "" || airline == $("airline").placeholder) {
              alid = "-1"; // UNKNOWN
            } else {
              mode = getMode();
              if (
                confirm(
                  gt.strargs(
                    gt.gettext(
                      "'%1' not found in %2 database. Do you want to add it as a new %2 company?"
                    ),
                    [airline, modeoperators[mode], modeoperators[mode]]
                  )
                )
              ) {
                popNewAirline("airline" + indexes[i], airline, mode);
              } else {
                $("airline" + indexes[i]).focus();
              }
              return;
            }
          }
          query +=
            "alid" +
            indexes[i] +
            "=" +
            encodeURIComponent(alid) +
            "&" +
            "src_date" +
            indexes[i] +
            "=" +
            encodeURIComponent(src_date) +
            "&" +
            "src_apid" +
            indexes[i] +
            "=" +
            encodeURIComponent(src_apid) +
            "&" +
            "dst_apid" +
            indexes[i] +
            "=" +
            encodeURIComponent(dst_apid) +
            "&";
        }
        if (getCurrentPane() == "input") {
          var src_time = $("src_time").value;
          if (src_time != "" && src_time != "HH:MM") {
            if (!RE_TIME.test(src_time)) {
              alert(
                gt.gettext(
                  "Please enter times in 24-hour format with a colon between hour and minute, eg. 21:37 for 9:37 PM."
                )
              );
              $("src_time").focus();
              return;
            }
            query += "src_time=" + encodeURIComponent(src_time) + "&";
          }

          var type = inputform.seat_type.value;
          if (type == "-") {
            type = "";
          }
          var myClass = radioValue(inputform.myClass),
            reason = radioValue(inputform.reason),
            plane = inputform.plane.value;

          if (plane == gt.gettext("Enter plane model")) {
            plane = "";
          }
          var trid = 0;
          if (inputform.trips) {
            trid =
              inputform.trips[inputform.trips.selectedIndex].value.split(
                ";"
              )[0];
          }
          if (trid == 0) {
            trid = "NULL";
          }
          var registration = inputform.registration.value,
            note = inputform.note.value,
            duration = $("duration").value;
          if (!RE_TIME.test(duration)) {
            alert(
              gt.gettext(
                "Please enter flight duration as hours and minutes with a colon between hour and minute, eg. 5:37 for 5 hours, 37 minutes. You can blank the duration to have it recalculated automatically."
              )
            );
            $("duration").focus();
            return;
          }
          var distance = $("distance").value;
          if (!RE_NUMERIC.test(distance)) {
            alert(
              gt.gettext(
                "Please enter flight distance as miles, with no fractional parts. You can blank the distance to have it re-calculated automatically."
              )
            );
            $("distance").focus();
            return;
          }
          var number = inputform.number.value,
            seat = inputform.seat.value,
            mode = inputform.mode.value;
        } else {
          var number = "",
            seat = "",
            type = "",
            myClass = "",
            reason = "",
            plane = "",
            trid = "NULL",
            registration = "",
            note = "",
            duration = "",
            distance = "",
            mode = "F";
        }
      }
      query +=
        "duration=" +
        encodeURIComponent(duration) +
        "&" +
        "distance=" +
        encodeURIComponent(distance) +
        "&" +
        "number=" +
        encodeURIComponent(number) +
        "&" +
        "seat=" +
        encodeURIComponent(seat) +
        "&" +
        "type=" +
        encodeURIComponent(type) +
        "&" +
        "class=" +
        encodeURIComponent(myClass) +
        "&" +
        "reason=" +
        encodeURIComponent(reason) +
        "&" +
        "registration=" +
        encodeURIComponent(registration) +
        "&" +
        "note=" +
        encodeURIComponent(note) +
        "&" +
        "plane=" +
        encodeURIComponent(plane) +
        "&" +
        "trid=" +
        encodeURIComponent(trid) +
        "&" +
        "mode=" +
        encodeURIComponent(mode) +
        "&" +
        "fid=" +
        encodeURIComponent(fid) +
        "&" +
        "param=" +
        encodeURIComponent(param);
      if (getCurrentPane() == "multiinput") {
        $("multiinput_status").innerHTML = "<b>Saving...</b>";
      } else {
        $("input_status").innerHTML = "<b>Saving...</b>";
      }
      break;

    case URL_LOGIN:
      showLoadingAnimation(true);
      var name = document.forms["login"].name.value,
        pw = document.forms["login"].pw.value,
        challenge = document.forms["login"].challenge.value,
        hash = MD5(challenge + MD5(pw + name.toLowerCase())),
        legacy_hash = MD5(challenge + MD5(pw + name));
      query =
        "name=" +
        encodeURIComponent(name) +
        "&pw=" +
        encodeURIComponent(hash) +
        "&lpw=" +
        encodeURIComponent(legacy_hash) +
        "&challenge=" +
        encodeURIComponent(challenge);
      break;

    case URL_GETCODE:
      const getcodeParams = new URLSearchParams();
      getcodeParams.set("mode", getMode());
      getcodeParams.set("searchType", "multisearch");
      getcodeParams.set("searchText", id);
      getcodeParams.set("quick", true);
      query = getcodeParams.toString();
      break;

    case URL_LOGOUT:
      // no parameters needed
      break;

    case URL_FLIGHTS:
      if (param == "RELOAD") {
        query = lastQuery;
        break;
      }
    // ...else fallthru and generate a new query

    // URL_MAP, URL_ROUTES, URL_FLIGHTS, URL_STATS, URL_TOP10
    default:
      showLoadingAnimation(true);
      var form = document.forms["filterform"];
      if (!initializing && form.Trips) {
        filter_trid = form.Trips.value.split(";")[0];
      }
      filter_alid = form.Airlines.value.split(";")[0];
      filter_year = form.Years.value;
      query =
        "user=" +
        encodeURIComponent(filter_user) +
        "&" +
        "trid=" +
        encodeURIComponent(filter_trid) +
        "&" +
        "alid=" +
        encodeURIComponent(filter_alid) +
        "&" +
        "year=" +
        encodeURIComponent(filter_year) +
        "&" +
        "param=" +
        encodeURIComponent(param);
      var guestpw = $("guestpw");
      if (guestpw) {
        query += "&guestpw=" + MD5(guestpw.value + filter_user.toLowerCase());
      }
      var filter_extra_key = form.Extra.value;
      if (filter_extra_key != "" && $("filter_extra_value")) {
        query +=
          "&xkey=" +
          filter_extra_key +
          "&xvalue=" +
          $("filter_extra_value").value;
      }
      if (strURL == URL_ROUTES) {
        query += "&apid=" + encodeURIComponent(id);
      } else if (strURL == URL_FLIGHTS) {
        switch (param) {
          case "EDIT":
          case "COPY":
            query += "&fid=" + encodeURIComponent(id);
            break;

          default:
            query += "&id=" + encodeURIComponent(id);
            lastQuery = query;
            lastDesc = param;
        }
      } else if (strURL == URL_TOP10 && param) {
        query += "&" + param;
      }
  }
  // alert(strURL + ":" + query);
  self.xmlHttpReq.send(query);
}

/**
 * Set up filter options from the database result
 * (also copies the list of trips into the editor)
 * @param str {string}
 */
function updateFilter(str) {
  var master = str.split("\n");
  var trips = master[3];
  var airlines = master[4];
  var years = master[5];

  if (!trips || trips == "") {
    $("filter_tripselect").innerHTML = "&nbsp;" + gt.gettext("No trips");
    $("input_trip_select").innerHTML =
      "&nbsp;" + gt.gettext("No trips. Add one? ");
    document
      .getElementById("trip_edit")
      .setAttribute("onclick", 'JavaScript:editTrip("ADD")');
  } else {
    $("filter_tripselect").innerHTML = createSelect(
      "Trips",
      gt.gettext("All trips"),
      filter_trid,
      trips.split("\t"),
      SELECT_MAXLEN,
      "refresh(true)"
    );
    var editTripSelect = document.forms["inputform"].trips;
    var selected = null;
    if (editTripSelect) {
      // New trip added, so now we need to figure out the newest (highest) trid to find it
      if (editTripSelect.reselect) {
        var newestId = 0;
        var filterTripSelect = document.forms["filterform"].Trips;
        for (var i = 0; i < filterTripSelect.length; i++) {
          var id = filterTripSelect[i].value.split(";")[0];
          if (parseInt(id) > newestId) {
            newestId = id;
            selected = i;
          }
        }
      } else {
        selected = editTripSelect.selectedIndex;
      }
    }
    $("input_trip_select").innerHTML = cloneSelect(
      document.forms["filterform"].Trips,
      "trips",
      "markAsChanged",
      selected
    );
    document
      .getElementById("trip_edit")
      .setAttribute("onclick", 'JavaScript:editTrip("EDIT")');
    document.forms["inputform"].trips[0].text = "Select trip";
  }
  $("filter_airlineselect").innerHTML = createSelect(
    "Airlines",
    gt.gettext("All carriers"),
    filter_alid,
    airlines.split("\t"),
    SELECT_MAXLEN,
    "refresh(true)"
  );
  $("filter_yearselect").innerHTML = createSelect(
    "Years",
    gt.gettext("All"),
    filter_year,
    years.split("\t"),
    20,
    "refresh(true)"
  );
}

// Generate title for current map
function getMapTitle(closable) {
  var form = document.forms["filterform"];
  var text = "";
  var alid = form.Airlines.value.split(";")[0];
  var airline = form.Airlines.value.split(";")[1];
  var year = form.Years.value;
  var trid = 0;
  if (form.Trips) {
    trid = form.Trips[form.Trips.selectedIndex].value.split(";")[0];
  }

  // Logged in users
  if (logged_in) {
    switch (filter_trid) {
      case 0:
      case "0":
        // do nothing
        break;
      case "null":
        text = gt.gettext("Unassigned flights");
        break;
      default:
        text = tripname + ' <a href="' + tripurl + '">\u2197</a>';
        break;
    }
    if (alid != "0") {
      if (text != "") {
        text += ", ";
      }
      text += airline + " " + getAirlineMapIcon(alid);
    }
    if (year != "0") {
      if (text != "") {
        text += ", ";
      }
      text += year;
    }
  } else {
    // Demo mode
    if (demo_mode) {
      if (alid != "0") {
        text =
          gt.strargs(gt.gettext("Recent flights on %1"), [airline]) +
          " " +
          getAirlineMapIcon(alid);
      } else {
        text = gt.gettext("Recently added flights");
      }
    } else {
      // Viewing another's profile
      if (trid != "0") {
        text = tripname + ' <a href="' + tripurl + '">\u2197</a>';
      } else {
        if (alid != "0") {
          if (year != "0") {
            text = gt.strargs(gt.gettext("%1's flights on %2 in %3"), [
              filter_user,
              airline,
              year,
            ]);
          } else {
            text = gt.strargs(gt.gettext("%1's flights on %2"), [
              filter_user,
              airline,
            ]);
          }
          text += " " + getAirlineMapIcon(alid);
        } else if (year != "0") {
          text = gt.strargs(gt.gettext("%1's flights in %2"), [
            filter_user,
            year,
          ]);
        } else {
          text = gt.strargs(gt.gettext("%1's flights"), [filter_user]);
        }
      }
      $("loginstatus").innerHTML =
        getEliteIcon(elite) +
        "<b>" +
        text +
        "</b> <h6><a href='/'>" +
        gt.gettext("Home") +
        "</a></h6>";
    }
  }

  // Tack on the extra filter, if any
  var filter_extra_key = form.Extra.value;
  if (filter_extra_key != "" && $("filter_extra_value")) {
    if (text != "") {
      text = text + ", ";
    }
    text +=
      form.Extra[form.Extra.selectedIndex].text +
      " " +
      $("filter_extra_value").value;
  }

  // Add X for easy filter removal (only for logged-in users with non-null titles)
  if (closable && logged_in && text != "") {
    text =
      // TODO: alt text
      '<img src="/img/close.gif" onclick="JavaScript:clearFilter(true);" width=17 height=17> ' +
      text;
  }
  return text;
}

/**
 * Create a <SELECT> box from row of (id;name)
 *
 * @param selectName document name (id) of select element
 * @param allopts "No filtering" option
 * @param id id to match col 1 against
 * @param rows Array of strings
 * @param maxlen maximum length (omit or set to <= 0 to allow any length)
 * @param hook Function to call on value change, with name as argument
 * @param tabIndex tabindex
 */
function createSelect(selectName, allopts, id, rows, maxlen, hook, tabIndex) {
  var select =
    "<select class='filter' id='" + selectName + "' name='" + selectName + "'";
  var r = 1;
  if (hook) {
    select += " onChange='JavaScript:" + hook + "'";
  }
  if (tabIndex) {
    select += ' tabindex="' + tabIndex + '"';
  }
  if (!rows[0].startsWith("NOALL")) {
    r = 0;
    if (selectName == "Years") {
      select += "><option value='0'>" + allopts + "</option>";
    } else {
      select += "><option value='0;" + allopts + "'>" + allopts + "</option>";
    }
  }
  // No data?  Return an empty element
  if (!rows || rows == "") {
    return select + "</select>";
  }

  var selected = "";
  for (; r < rows.length; r++) {
    var col = rows[r].split(";");
    var rid = col[0];
    var name = col[1];
    var url = col[2];

    if (rid == id) {
      selected = " SELECTED";
      // Special case: un-truncated trip name and URL
      if (selectName == "Trips") {
        tripname = name;
        tripurl = url;
      }
    } else {
      selected = "";
    }
    // ID;Full name
    if (selectName != "Years") {
      rid = rid + ";" + name;
    }
    // Truncate display name
    if (maxlen && maxlen > 0 && name.length > maxlen) {
      // Three dots in a proportional font is about two chars...
      name = name.substring(0, maxlen - 2) + "...";
    }
    select +=
      '<option value="' + rid + '"' + selected + ">" + name + "</option>";
  }
  if (logged_in && selectName == "Trips") {
    select +=
      "<option value='null' " +
      (filter_trid == "null" ? " SELECTED" : "") +
      ">" +
      gt.gettext("Not in a trip") +
      "</option>";
  }
  select += "</select>";
  return select;
}

/**
 * If the current value is given, don't add "All" option
 * @param selectName
 * @param opts
 * @param hook
 * @param current
 * @returns {string}
 */
function createSelectFromArray(selectName, opts, hook, current) {
  var select =
    "<select style='width: 100px' id='" +
    selectName +
    "' name='" +
    selectName +
    "' onChange='JavaScript:" +
    hook +
    "'>";
  if (!current) {
    select += "<option value=''>" + gt.gettext("All") + "</option>";
  }
  for (const r of Object.keys(opts)) {
    // console.log(r);
    select +=
      "<option value='" +
      r +
      "' " +
      (r == current ? "SELECTED" : "") +
      ">" +
      opts[r] +
      "</option>";
  }
  select += "</select>";
  return select;
}

/**
 * Create a copy of 'select', renamed (incl. hook) as 'name'
 * Note: *not* class="filter", so width is not limited
 * @param oldSelect
 * @param name
 * @param hook
 * @param selected
 * @returns {string}
 */
function cloneSelect(oldSelect, name, hook, selected) {
  var newSelect = '<select name="' + name + '"';
  if (hook) {
    newSelect += " onChange='JavaScript:" + hook + '("' + name + "\")'>";
  }
  for (var index = 0; index < oldSelect.length; index++) {
    var id = oldSelect[index].value.split(";")[0];
    var text = oldSelect[index].value.split(";")[1];
    var selectedText = index == selected ? " SELECTED" : "";
    if (id != "null") {
      // Skip "Not in trip" special option
      newSelect +=
        '<option value="' + id + '" ' + selectedText + ">" + text + "</option>";
    }
  }
  newSelect += "</select>";
  return newSelect;
}

// Return value of the currently selected radio button in this group
function radioValue(radio) {
  for (var r = 0; r < radio.length; r++) {
    if (radio[r].checked) {
      return radio[r].value;
    }
  }
  return "";
}

/**
 * Clear all flights, airports and popups
 */
function clearMap() {
  lineLayer.destroyFeatures();
  airportLayer.destroyFeatures();
  var popups = map.popups;
  for (var p = 0; p < popups.length; p++) {
    popups[p].destroy();
  }
}

/**
 * Reinsert all flights, airports from the database result
 * @param str {string}
 * @param url {string}
 */
function updateMap(str, url) {
  lineLayer.destroyFeatures();
  airportLayer.destroyFeatures();
  lasturl = url; // used for refresh

  var master = str.split("\n");
  var stats = master[0];
  var flights = master[1];
  var airports = master[2];
  var col = stats.split(";");
  var type = "M"; // map

  if (url == URL_MAP) {
    // User flight map
    var distance = col[1];
    if (!distance) {
      distance = 0;
    }
    var days = Math.floor(col[2] / (60 * 24));
    var hours = Math.floor((col[2] / 60) % 24);
    var min = Math.floor(col[2] % 60);
    if (min < 10) {
      min = "0" + min;
    }

    stats =
      // TODO: Use more specific locale if one exists
      col[0].toLocaleString("en-US") +
      " " +
      gt.gettext("segments") +
      "<br>" +
      distance +
      "<br>" +
      // TODO: Use more specific locale if one exists
      days.toLocaleString("en-US") +
      " " +
      gt.gettext("days") +
      " " +
      hours +
      ":" +
      min;
    $("stats_ajax").style.display = "none";
    $("stats").innerHTML = stats;
    $("statsbox").style.visibility = "visible";

    flightTotal = col[0];
    privacy = col[3];
    if (!logged_in) {
      elite = col[4];
      document.forms["login"].challenge.value = col[7];

      // Does the user have a PHP session open?  Log him in!
      // Simulate login.php: "1;name;editor;elite"
      if (col[5] != "demo") {
        var op = flightTotal == "0" ? "NEWUSER" : "REFRESH";
        login(
          '{"status": 1, "name": "' +
            col[5] +
            '","editor": "' +
            col[6] +
            '","elite": "' +
            elite +
            '"}',
          op
        );
      }
    }
    // Our PHP session has timed out, kick out the user
    if (logged_in && col[5] == "demo") {
      logout(gt.gettext("Your session has timed out, please log in again."));
    }
  } else {
    // Route map
    $("statsbox").style.visibility = "hidden";

    apid = col[0];
    flightTotal = col[1];
    var desc = col[2];
    var coreid;
    var title;
    if (apid.startsWith("L")) {
      type = "L";
      coreid = apid;
      title = gt.gettext("List all routes on this airline");
    } else {
      type = "R";
      coreid = "R" + apid + "," + apid;
      title = gt.gettext("List all routes from this airport");
    }

    // TODO: alt text
    var maptitle =
      '<img src="/img/close.gif" onclick="JavaScript:clearFilter(true);" width=17 height=17> ' +
      desc;
    var form = document.forms["filterform"];
    filter_alid = form.Airlines.value.split(";")[0];
    maptitle +=
      " <a href='#' onclick='JavaScript:xmlhttpPost(\"" +
      URL_FLIGHTS +
      '","' +
      coreid +
      '", "' +
      encodeURI(desc) +
      // TODO: alt text
      "\");'><img src='/img/icon_copy.png' width=16 height=16 title='" +
      title +
      "'></a>";
    if (filter_alid != 0 && !apid.startsWith("L")) {
      maptitle +=
        " <small>" +
        gt.gettext("on ") +
        form.Airlines.value.split(";")[1] +
        "</small> " +
        getAirlineMapIcon(filter_alid);
    }
    maptitle = maptitle.replace("routes", gt.gettext("routes"));
    $("maptitle").innerHTML = maptitle;
  }

  // New user (or filter setting) with no flights?  Then don't even try to draw
  if (flightTotal != "0") {
    var rows = flights.split("\t");
    for (var r = 0; r < rows.length; r++) {
      // apid1 0, x1 1, y1 2, apid2 3, x2 4, y2 5, count 6, distance 7, future 8, mode 9
      var rCol = rows[r].split(";");
      var stroke = rCol[8] == "Y" ? "dash" : "solid";
      var color;
      if (url == URL_ROUTES) {
        color = COLOR_ROUTE;
      } else {
        color = MODE_COLORS[rCol[9]];
        if (!color) {
          color = COLOR_NORMAL;
        }
      }
      lineLayer.addFeatures(
        drawLine(
          parseFloat(rCol[1]),
          parseFloat(rCol[2]),
          parseFloat(rCol[4]),
          parseFloat(rCol[5]),
          rCol[6],
          rCol[7],
          color,
          stroke
        )
      );
    }
  }

  // Route maps draw the core airport even if there are no routes
  if (flightTotal != "0" || type == "R") {
    var rows = airports.split("\t");
    var airports = Array();

    // Airports are ordered from least busy to busiest, so we calibrate the color scale based on the last result
    airportMaxFlights = rows[rows.length - 1].split(";")[4];
    for (r = 0; r < rows.length; r++) {
      var col = rows[r].split(";");
      // 0 apdata, 1 name, 2 city, 3 country, 4 count, 5 formatted_name, 6 future
      var opacity = col[6] == "Y" ? 0.5 : 1;
      airports.push(
        drawAirport(
          airportLayer,
          col[0],
          col[1],
          col[2],
          col[3],
          col[4],
          col[5],
          opacity,
          apid
        )
      );
    }
    airportLayer.addFeatures(airports);
  }

  // Redraw selection markers if in input mode
  if (getCurrentPane() == "input") {
    if (input_srcmarker) {
      markAirport("src_ap", true);
    }
    if (input_dstmarker) {
      markAirport("dst_ap", true);
    }
  }

  showLoadingAnimation(false);
  if (initializing) {
    if (!logged_in && demo_mode) {
      $("loginform").style.display = "inline";
    }
    $("statsbox").style.visibility = "visible";
    $("filter").style.visibility = "visible";
    if (logged_in || privacy == "O") {
      $("filter_extra_key").style.visibility = "visible";
    } else {
      $("filter_extra_key").style.visibility = "hidden";
    }
  }
}

function startListFlights() {
  xmlhttpPost(URL_FLIGHTS, 0, "MAP");
}

function listFlights(str, desc, id) {
  openPane("result");
  fidList = [];
  const route = !RE_NUMERIC.test(id); // ids starting with R are routes

  if (desc == "MAP") {
    desc = gt.gettext("Flights:") + " " + getMapTitle(false);
  }

  // TODO: Won't be needed once the endpoint returns JSON.
  const gcmFlightList = [];

  var hasGCButton = false;

  // IE string concat is painfully slow, so we use an array and join it instead
  var table = [];
  table.push(
    // TODO: alt text
    '<img src="/img/close.gif" onclick="JavaScript:closePane();" width=17 height=17> '
  );
  if (str == "") {
    var msg;
    if (!route && id > 0) {
      msg = gt.gettext("No flights found at this airport.");
    } else if (route) {
      msg = gt.gettext("No routes found at this airport.");
    } else {
      // https://github.com/jpatokal/openflights/issues/1277
      msg = gt.gettext("No flights found.");
    }

    table.push("<i>" + msg + "</i></span></div>");
  } else {
    if (desc) {
      desc = desc.replace("Flights:", gt.gettext("Flights:"));
      desc = desc.replace("routes", gt.gettext("routes"));
      desc = desc.replace(/\<br\>/g, " &mdash; ");
      table.push(desc);
      table.unshift(
        "<span style='float: right'>" +
          gt.gettext("Export") +
          " " +
          "<input type='button' value='" +
          gt.gettext("CSV") +
          "' title='" +
          gt.gettext("Comma-Separated Value, for Excel and data processing") +
          "' align='middle' onclick='JavaScript:exportFlights(\"export\")'>" +
          "<input type='button' value='" +
          gt.gettext("KML") +
          "' title='" +
          gt.gettext(
            "Keyhole Markup Language, for Google Earth and visualization"
          ) +
          "' align='middle' onclick='JavaScript:exportFlights(\"KML\")'>" +
          "<input id='gcmapbutton' type='button' value='" +
          gt.gettext("GCMap") +
          "' title='" +
          gt.gettext("Great Circle Mapper, for image export") +
          "' align='middle'>" +
          "</span>"
      ); // place at the front of the array
      hasGCButton = true;
    }
    table.push(
      '<table width=100% class="sortable" id="apttable" cellpadding="0" cellspacing="0">'
    );
    table.push(
      '<tr><th class="unsortable"></th><th>' +
        gt.gettext("From") +
        "</th><th>" +
        gt.gettext("To") +
        "</th><th>" +
        gt.gettext("Nr.") +
        "</th><th>" +
        gt.gettext("Date") +
        '</th><th class="sorttable_numeric">' +
        gt.gettext("Distance") +
        "</th><th>" +
        gt.gettext("Time") +
        "</th><th>" +
        gt.gettext("Vehicle") +
        "</th>"
    );
    if (!route) {
      table.push(
        "<th>" +
          gt.gettext("Seat") +
          "</th><th>" +
          gt.gettext("Class") +
          "</th><th>" +
          gt.gettext("Reason") +
          "</th><th>" +
          gt.gettext("Trip") +
          "</th>"
      );
    }
    table.push("<th>" + gt.gettext("Note") + "</th>");
    if (logged_in) {
      table.push('<th class="unsortable">' + gt.gettext("Action") + "</th>");
    }
    table.push("</tr>");

    var today = new Date().getTime();
    var rows = str.split("\n");
    for (var r = 0; r < rows.length; r++) {
      // src_iata 0, src_apid 1, dst_iata 2, dst_apid 3, flight code 4, date 5, distance 6, duration 7, seat 8,
      // seat_type 9, class 10, reason 11, fid 12, plane 13, registration 14, alid 15, note 16, trid 17, plid 18,
      // airline_code 19, src_time 20, mode 21
      var col = rows[r].split("\t");
      var trip = col[17];
      var seat = col[8];
      var plane = col[13];
      var fid = col[12];
      var code = col[4];
      var date = col[5];
      var modeicon = MODE_ICONS[col[21]];
      var modename = modenames[col[21]];

      gcmFlightList.push({ src_code: col[0], dst_code: col[2] });

      // Date.parse() doesn't work on YYYY/MM/DD, so we chop it up and use Date.UTC instead (sigh)
      if (
        Date.UTC(
          date.substring(0, 4),
          date.substring(5, 7) - 1,
          date.substring(8, 10)
        ) > today
      ) {
        date = "<i>" + date + "</i>";
      }

      // Prepend airline code to numeric/missing flight number
      if (RE_NUMERIC.test(code)) {
        code = col[19] + code;
      }
      if (col[14] != "") {
        plane += " (" + col[14] + ")";
      }
      if (logged_in && trip != "") {
        trip =
          '<a href="#" onclick="JavaScript:editTrip(' +
          trip +
          ');">' +
          trip +
          "</a>";
      }
      // TODO: alt text
      table.push(
        "<tr><td><img src='" +
          modeicon +
          "' title='" +
          modename +
          "' width=17 height=17></td>" +
          '<td><a href="#" onclick="JavaScript:selectAirport(' +
          col[1] +
          ');">' +
          col[0] +
          "</a></td>" +
          '<td><a href="#" onclick="JavaScript:selectAirport(' +
          col[3] +
          ');">' +
          col[2] +
          "</a></td>" +
          "<td>"
      );
      if (route) {
        table.push(
          '<a href="#" onclick="JavaScript:showAirlineMap(' +
            col[15] +
            ');">' +
            code +
            "</a>"
        );
      } else {
        table.push(code);
      }
      table.push(
        "</td><td>" +
          date +
          "</td><td>" +
          col[6] +
          "</td><td>" +
          col[7] +
          "</td><td>" +
          plane +
          "</td>"
      );
      if (!route) {
        table.push(
          "<td>" +
            seat +
            "</td><td>" +
            classes[col[10]] +
            "</td><td>" +
            reasons[col[11]] +
            "</td><td>" +
            trip +
            "</td>"
        );
      }
      // Add an ellipsis to the note if we truncate it.
      var note = col[16];
      if (note.length > 15) {
        note = note.substring(0, 15) + "&hellip;";
      }
      table.push("<td>" + note + "</td>");
      if (logged_in && !route) {
        table.push("<td>");
        table.push(
          "<a href='#' onclick='JavaScript:preEditFlight(" +
            fid +
            "," +
            r +
            // TODO: alt text
            ");'><img src='/img/icon_edit.png' width=16 height=16 title='" +
            gt.gettext("Edit this flight") +
            "'></a>"
        );
        table.push(
          "<a href='#' onclick='JavaScript:preCopyFlight(" +
            fid +
            // TODO: alt text
            ");'><img src='/img/icon_copy.png' width=16 height=16 title='" +
            gt.gettext("Copy to new flight") +
            "'></a>"
        );
        table.push(
          "<a href='#' onclick='JavaScript:deleteFlight(" +
            fid +
            // TODO: alt text
            ");'><img src='/img/icon_delete.png' width=16 height=16 title='" +
            gt.gettext("Delete this flight") +
            "'></a>"
        );
        table.push("</td>");
      }
      table.push("</tr>");
      fidList.push(fid);
    }
    table.push("</table>");
  }
  $("result").innerHTML = table.join("");
  // Refresh sortables code
  sortables_init();

  if (hasGCButton) {
    // Great Circle Mapper button setup
    document.getElementById("gcmapbutton").onclick = () => {
      const gcmURL = new URL("http://www.gcmap.com/mapui");
      gcmURL.searchParams.append(
        "P",
        gcmFlightList.map((f) => `${f.src_code}-${f.dst_code}`).join(",")
      );
      gcmURL.searchParams.append("MS", "bm"); // 'M'ap 'S'tyle: 'b'lue 'm'arble
      window.open(gcmURL.href, "openflights_export");
    };
  }
}

/**
 * Dump flights to CSV
 * @param type {string} "backup" to export everything, "export" to export only current filter selection
 */
function exportFlights(type) {
  const urlParams = new URLSearchParams(lastQuery);
  // Remove param from the query string, it's not helpful
  urlParams.delete("param");
  var specifics;
  if (type == "KML") {
    specifics = URL_KML + "?";
  } else {
    specifics = URL_FLIGHTS + "?export=" + type + "&";
  }
  location.href = location.origin + specifics + urlParams.toString();
}

const createAirportLinkElement = (apid, text) => {
  const link = document.createElement("a");
  link.setAttribute("href", "#");
  link.setAttribute("onclick", `JavaScript:selectAirport(${apid});`);
  link.append(text);
  return link;
};

const formatCoordinates = ({ lat, lon }) => {
  const latStr = Math.abs(lat).toFixed(2);
  const lonStr = Math.abs(lon).toFixed(2);
  return `${lonStr}°${
    lon >= 0 ? directions_short["N"] : directions_short["S"]
  } ${latStr}°${lat >= 0 ? directions_short["E"] : directions_short["W"]}`;
};

/**
 * The "Analyze" button (detailed stats)
 * @param str {string}
 */
function showStats(str) {
  openPane("result");
  const result = document.getElementById("result");
  while (result.firstChild) result.removeChild(result.firstChild);

  let statsData;
  try {
    statsData = JSON.parse(str);
  } catch (e) {
    result.append(
      "<i>" + gt.gettext("Statistics calculation failed!") + "</i>"
    );
    return;
  }

  if ("error" in statsData) {
    result.append(gt.gettext(response.error));
    return;
  }

  if (statsData.total.segments === 0) {
    result.append(gt.gettext("This user has no flights."));
    return;
  }

  const displayUnit = distance_units[statsData.distance_unit];

  // TODO: alt text
  var bigtable =
    '<table><td style="vertical-align: top"><img src="/img/close.gif" onclick="JavaScript:closePane();" width=17 height=17></td><td style="vertical-align: top">';

  var table = '<table style="border-spacing: 10px 0px">';
  table += "<tr><th colspan=2>" + gt.gettext("Unique") + "</th></tr>";
  for (const dataPoint of [
    [gt.gettext("Airports"), "airports"],
    [gt.gettext("Carriers"), "carriers"],
    [gt.gettext("Countries"), "countries"],
    [gt.gettext("Vehicles"), "vehicles"],
  ]) {
    const row = document.createElement("tr");
    const label = document.createElement("td");
    label.append(gt.gettext(dataPoint[0]));
    const value = document.createElement("td");
    // TODO: Use more specific locale if one exists
    value.append(statsData.unique[dataPoint[1]].toLocaleString("en-US"));
    row.append(label);
    row.append(value);
    table += row.outerHTML;
  }
  table += "<tr><td>&nbsp;</td></tr>";

  var distance = statsData.total.distance_mi;
  table += "<tr><th colspan=2>" + gt.gettext("Distance") + "</th></tr>";
  table +=
    "<tr>" +
    `<td>${gt.gettext("Total flown")}</td>` +
    // TODO: Use more specific locale if one exists
    `<td>${statsData.total.distance.toLocaleString(
      "en-US"
    )} ${displayUnit}</td>` +
    "</tr>";
  table +=
    "<tr>" +
    `<td>${gt.gettext("Around the world")}</td>` +
    // TODO: Better localisation of the x (for "times")
    `<td>${(distance / EARTH_CIRCUMFERENCE).toFixed(2)}x</td>` +
    "</tr>";
  table +=
    "<tr>" +
    `<td>${gt.gettext("To the Moon")}</td>` +
    // TODO: Better localisation of the x (for "times")
    `<td>${(distance / MOON_DISTANCE).toFixed(3)}x</td>` +
    "</tr>";
  table +=
    "<tr>" +
    `<td>${gt.gettext("To Mars")}</td>` +
    // TODO: Better localisation of the x (for "times")
    `<td>${(distance / MARS_DISTANCE).toFixed(4)}x</td>` +
    "</tr>";
  table += "</table>";
  bigtable += table + '</td><td style="vertical-align: top">';

  table = '<table style="border-spacing: 10px 0px">';
  table += "<tr><th colspan=2>" + gt.gettext("Journey records") + "</th></tr>";

  for (const [label, prop] of [
    [gt.gettext("Longest"), "longest"],
    [gt.gettext("Shortest"), "shortest"],
  ]) {
    const flight = statsData.longshort[prop];
    const row = document.createElement("tr");
    const keyCol = document.createElement("td");
    keyCol.append(gt.gettext(label));
    const valCol = document.createElement("td");
    valCol.append(createAirportLinkElement(flight.src_apid, flight.src_code));
    valCol.append(" ↔ ");
    valCol.append(createAirportLinkElement(flight.dst_apid, flight.dst_code));
    // TODO: Use more specific locale if one exist
    valCol.append(
      `, ${flight.distance.toLocaleString("en-US")} ${displayUnit}, ${
        flight.duration
      }`
    );
    row.append(keyCol);
    row.append(valCol);
    table += row.outerHTML;
  }

  table +=
    "<tr><td>" +
    gt.gettext("Average") +
    "</td><td>" +
    // TODO: Use more specific locale if one exists
    statsData.average.distance.toLocaleString("en-US") +
    " " +
    displayUnit +
    ", " +
    statsData.average.duration +
    "</td></tr>";
  table += "<tr><td>&nbsp;</td></tr>";
  table += "<tr><td>&nbsp;</td></tr>";
  table += "<tr><th colspan=2>" + gt.gettext("Airport records") + "</th></tr>";
  for (const [direction, stat] of Object.entries(statsData.extreme)) {
    const row = document.createElement("tr");
    const keyCol = document.createElement("td");
    keyCol.append(extreme_directions[direction]);
    const valCol = document.createElement("td");
    valCol.append(createAirportLinkElement(stat.apid, stat.code));
    valCol.append(` (${formatCoordinates(stat)})`);
    row.append(keyCol);
    row.append(valCol);
    table += row.outerHTML;
  }
  table += "</table>";
  bigtable += table + '</td><td style="vertical-align: top">';

  table = '<table style="border-spacing: 10px 0px">';
  table +=
    "<tr><th>" +
    gt.gettext("Class") +
    "</th><th>" +
    gt.gettext("Reason") +
    "</th><th>" +
    gt.gettext("Seats") +
    "</th></tr>";
  table += "<tr>";
  table += '<td><div id="chart_class"></div></td>';
  table += '<td><div id="chart_reason"></div></td>';
  table += '<td><div id="chart_seat"></div></td>';
  table += "</tr>";

  table +=
    "<tr><th>" +
    gt.gettext("Class by distance") +
    "</th><th>" +
    gt.gettext("Mode") +
    "</th><th><!-- Empty Cell --></th></tr>";
  table += "<tr>";
  table += '<td><div id="chart_class_distance"></div></td>';
  table += '<td><div id="chart_mode"></div></td>';
  table += "<td><!-- Empty --></td>";
  table += "</tr>";
  table += "<tr><td>";
  table += "</td><td>";
  table += "</td><td>";
  // Empty Cell
  table += "</td></tr>";

  table += "</table>";
  bigtable += table + "</td></tr></table>";

  result.innerHTML = bigtable;

  // First row of charts
  googleChart(
    "chart_class",
    statsData.by_class.map((stat) => ({
      key: stat.class,
      value: stat.segments,
    })),
    classes_short
  );

  googleChart(
    "chart_reason",
    statsData.by_reason.map((stat) => ({
      key: stat.reason,
      value: stat.segments,
    })),
    reasons_short
  );

  googleChart(
    "chart_seat",
    statsData.by_seattype.map((stat) => ({
      key: stat.seattype,
      value: stat.segments,
    })),
    seattypes
  );

  // Second row of charts
  googleChart(
    "chart_class_distance",
    statsData.by_class.map((stat) => ({
      key: stat.class,
      value: stat.distance,
    })),
    classes_short,
    ` ${displayUnit}`
  );

  googleChart(
    "chart_mode",
    statsData.by_mode.map((stat) => ({
      key: stat.mode,
      value: stat.segments,
    })),
    modenames
  );
}

// Chart configuration.
const GOOGLE_CHART_OPTIONS = {
  fontSize: 10,
  // Google seems to be adding a 10px highlights above/below the chart when moused over.
  // The actual chart height should be in chartArea[height] and the div height will be
  // chartHeight+20. A margin of 10 at the top will ensure the top highlight will show up.
  chartArea: { left: 0, top: 10, width: "100%", height: "100" },
  height: 120,
  width: 200,
  legend: "none",
  pieSliceText: "label",
};

const GOOGLE_CHART_TWO_COLORS = ["2A416A", "B2C3DF"];
const GOOGLE_CHART_THREE_COLORS = ["2A416A", "688BC3", "B2C3DF"];
const GOOGLE_CHART_FOUR_COLORS = ["2A416A", "39588E", "688BC3", "B2C3DF"];

/**
 * Generate a pie chart image via Google Charts API

 * @param targetdiv {string} the <div> id for where we should place the chart
 * @param inputdata {array} a list of {'key': short-name, 'value': number}
 * @param labeldata {hash} a hash of short-names (Y, C, F) to localized names (Econ, Biz, 1st).
 * @param formatSuffix {string|null} suffix to apply to values (such as " mi")
 *
 * e.g. inputdata = F,1:C,2:F,3
 *       labeldata = {F: 'First', C: 'Biz', Y: 'Econ'}
 */
function googleChart(targetdiv, inputdata, labeldata, formatSuffix = null) {
  if (!inputdata) {
    return;
  }

  const dataTable = new google.visualization.DataTable();
  dataTable.addColumn("string", "Key");
  dataTable.addColumn("number", "Value");

  for (const dataPoint of inputdata) {
    dataTable.addRow([labeldata[dataPoint.key], dataPoint.value]);
  }

  // Apply formatter to the "Value" column.
  const formatter = new google.visualization.NumberFormat({
    fractionDigits: 0,
    suffix: formatSuffix ?? "",
  });
  formatter.format(dataTable, 1);

  if (inputdata.length <= 2) {
    GOOGLE_CHART_OPTIONS.colors = GOOGLE_CHART_TWO_COLORS;
  } else if (inputdata.length <= 3) {
    GOOGLE_CHART_OPTIONS.colors = GOOGLE_CHART_THREE_COLORS;
  } else {
    GOOGLE_CHART_OPTIONS.colors = GOOGLE_CHART_FOUR_COLORS;
  }

  const chart = new google.visualization.PieChart(
    document.getElementById(targetdiv)
  );
  chart.draw(dataTable, GOOGLE_CHART_OPTIONS);
}

function formatTop10Numbers(mode, countUnit, value) {
  // TODO: Use more specific locale if one exists
  var formattedNumber = value.toLocaleString("en-US");
  if (mode == "F") {
    return formattedNumber;
  } else {
    // Must be distance
    return (
      formattedNumber +
      " " +
      (countUnit == "miles" ? gt.gettext("mi") : gt.gettext("km"))
    );
  }
}

function showTop10(responseText) {
  let topData;
  try {
    topData = JSON.parse(responseText);
  } catch (e) {
    $("result").innerHTML =
      "<i>" + gt.gettext("Statistics calculation failed!") + "</i>";
    openPane("result");
    return;
  }

  if ("error" in topData) {
    $("result").innerHTML = topData.error;
    openPane("result");
    return;
  }

  // Take note of existing settings, if any
  var form = document.forms["top10form"];
  var mode, limit;
  if (form) {
    mode = form.mode[form.mode.selectedIndex].value;
    limit = form.limit[form.limit.selectedIndex].value;
  } else {
    mode = "F";
    limit = "10";
  }

  // TODO: alt text
  var bigtable =
    "<table style='width: 100%; border-collapse: collapse'><td style='vertical-align: top; padding-right: 10px'><img src='/img/close.gif' onclick='JavaScript:closePane();' width=17 height=17><form id='top10form'>";

  var table = "<br>" + gt.gettext("Show...") + "<br>";
  table +=
    createSelectFromArray("limit", toplimits, "updateTop10()", limit) + "<br>";
  table += gt.gettext("Sort by...") + "<br>";
  table +=
    createSelectFromArray("mode", topmodes, "updateTop10()", mode) + "<br>";
  bigtable += table + "</form></td>";

  bigtable +=
    "<td style='vertical-align: top; background-color: #ddd; padding: 0px 10px'>";
  table = "<table><tr><th colspan=3'>" + gt.gettext("Routes") + "</th></tr>";
  for (const route of topData.routes) {
    table +=
      "<tr><td><a href='#' onclick='JavaScript:selectAirport(" +
      route.src_apid +
      ");'>" +
      route.src_code +
      "</a>&harr;" +
      "<a href='#' onclick='JavaScript:selectAirport(" +
      route.dst_apid +
      ");'>" +
      route.dst_code +
      "</a></td>" +
      "<td style='text-align: right; padding-left: 10px'>" +
      formatTop10Numbers(mode, topData["countUnit"], route.count) +
      "</td></tr>";
  }
  table += "</table>";

  bigtable +=
    table + "</td><td style='vertical-align: top; padding: 0px 10px'>";
  table = "<table><tr><th colspan=3'>" + gt.gettext("Airports") + "</th></tr>";
  for (const airport of topData.airports) {
    var desc = airport.name.substring(0, 20) + " (" + airport.code + ")";
    table +=
      "<tr><td><a href='#' onclick='JavaScript:selectAirport(" +
      airport.apid +
      ");'>" +
      desc +
      "</a></td><td style='text-align: right; padding-left: 10px'>" +
      formatTop10Numbers(mode, topData["countUnit"], airport.count) +
      "</td>";
  }
  table += "</table>";

  bigtable +=
    table +
    "</td><td style='vertical-align: top; background-color: #ddd; padding: 0px 10px'>";
  table = "<table><tr><th colspan=3'>" + gt.gettext("Airlines") + "</th></tr>";
  for (const airline of topData.airlines) {
    table +=
      "<tr><td><a href='#' onclick='JavaScript:selectAirline(" +
      airline.alid +
      ");refresh(false);'>" +
      airline.name +
      "</a></td><td style='text-align: right; padding-left: 10px'>" +
      formatTop10Numbers(mode, topData["countUnit"], airline.count) +
      "</td>";
  }
  table += "</table>";

  bigtable +=
    table + "</td><td style='vertical-align: top; padding-left: 10px;'>";
  table = "<table><tr><th colspan=3>" + gt.gettext("Planes") + "</th></tr>";
  for (const plane of topData.planes) {
    table +=
      "<tr><td>" +
      plane.name +
      "</td><td style='text-align: right; padding-left: 10px'>" +
      formatTop10Numbers(mode, topData["countUnit"], plane.count) +
      "</td>";
  }
  table += "</table>";
  bigtable += table + "</td>";

  $("result").innerHTML = bigtable;
  openPane("result");
}

function updateTop10() {
  const form = document.forms["top10form"];
  const params = new URLSearchParams();
  if (form) {
    params.set("mode", form.mode[form.mode.selectedIndex].value);
    const limit = form.limit[form.limit.selectedIndex].value;
    if (limit !== "-1") {
      params.set("limit", limit);
    }
  } else {
    params.set("mode", "F");
    params.set("limit", 10);
  }
  xmlhttpPost(URL_TOP10, 0, params.toString());
}

/**
 * Move "pointer" in flight list up or down one when user clicks prev, next
 * @param offset
 */
function editPointer(offset) {
  var newPtr = fidPtr + offset;
  if (newPtr >= 0 && newPtr < fidList.length) {
    if (
      hasChanged() &&
      !confirm(
        gt.gettext(
          "Changes made to this flight have not been saved. OK to discard them?"
        )
      )
    ) {
      return;
    }
    // Load new flight
    preEditFlight(fidList[newPtr], newPtr);
  }
}

/**
 * Load up parameters of a given flight
 * @param fid
 * @param idx
 */
function preEditFlight(fid, idx) {
  fidPtr = idx;
  $("b_prev").disabled = fidPtr <= 0;
  $("b_next").disabled = fidPtr >= fidList.length - 1;
  $("editflighttitle").innerHTML = gt.gettext("Loading...");
  xmlhttpPost(URL_FLIGHTS, fid, "EDIT");
}

function preCopyFlight(fid) {
  xmlhttpPost(URL_FLIGHTS, fid, "COPY");
}

/**
 * Load existing flight data into the input form
 * @param str {string}
 * @param param {string}
 */
function editFlight(str, param) {
  // Oops, no matches!?
  if (str == "") {
    closeInput();
    return;
  }

  if (getCurrentPane() != "input") {
    // EDIT -> edit, COPY -> add
    openDetailedInput(param);
  }

  // src_iata 0, src_apid 1, dst_iata 2, dst_apid 3, flight code 4, date 5, distance 6, duration 7, seat 8, seat_type 9,
  // class 10, reason 11, fid 12, plane 13, registration 14, alid 15, note 16, trid 17, plid 18, alcode 19, src_time 20,
  // mode 21
  var col = str.split("\t");
  var form = document.forms["inputform"];
  form.number.value = col[4];
  form.src_date.value = col[5];
  if (col[20] != "") {
    $("src_time").style.color = "#000";
    form.src_time.value = col[20].substring(0, 5); // HH:MM, drop seconds
    // dst_time calculated automatically
  } else {
    clearTimes();
  }
  form.seat.value = col[8];

  // Don't recalc distance/duration yet
  selectAirport(col[1], true, true); // sets src_ap, src_apid
  selectAirport(col[3], true, true); // sets dst_ap, dst_apid
  selectAirline(col[15], true); // sets airline, airlineid

  selectInSelect(inputform.seat_type, col[9]);
  selectInSelect(inputform.trips, col[17]);
  selectInSelect(inputform.mode, col[21]);
  changeMode(col[21]);

  $("editflighttitle").innerHTML = gt.strargs(
    gt.gettext("Edit segment %1 of %2"),
    [fidPtr + 1, fidList.length]
  );

  var myClass = inputform.myClass;
  for (var index = 0; index < myClass.length; index++) {
    myClass[index].checked = myClass[index].value == col[10];
  }
  var reason = inputform.reason;
  for (index = 0; index < reason.length; index++) {
    reason[index].checked = reason[index].value == col[11];
  }

  // Read these after selectAirport mucks up the dist/duration
  $("distance").value = col[6];
  $("distance").style.color = "#000";
  $("duration").value = col[7];
  $("duration").style.color = "#000";
  calcDuration("DEPARTURE"); // figure out arrival time according to previous dist/dur
  fid = col[12]; // stored until flight is saved or deleted

  $("plane").value = col[13];
  $("planeid").value = col[18];

  form.registration.value = col[14];
  alid = col[15];
  form.note.value = col[16];
  form.seat.value = col[8];

  $("src_ap").style.color = "#000000";
  $("dst_ap").style.color = "#000000";
  $("airline").style.color = "#000000";
  $("plane").style.color = "#000000";

  // Don't allow saving until something is changed
  setCommitAllowed(false);
  majorEdit = false;
}

/**
 * Select correct input editor
 */
function newFlight() {
  switch (prefs_editor) {
    case "D":
      openDetailedInput("ADD");
      break;

    default:
      openBasicInput("ADD");
      break;
  }
}

/**
 * User has edited a flight's contents
 * @param major {boolean} if true, forces a redraw later
 */
function markAsChanged(major = false) {
  if (major) {
    majorEdit = true;
  }
  if (!changed) {
    changed = true;
    setCommitAllowed(true);
    $("input_status").innerHTML = "";
    $("multiinput_status").innerHTML = "";
  }
}

/**
 * Has the user made any changes?
 * @returns {boolean} If yes, the add button will be enabled (in both ADD and EDIT modes)
 */
function hasChanged() {
  return changed;
}

/**
 * Disable and re-enable submission while a) AJAX requests are pending, b) no changes have been made
 * @param state {boolean} true = enabled, false = disabled
 */
function setCommitAllowed(state) {
  state = !state; // enabled=true -> disabled=false
  if (state) {
    // if no commit allowed, then no changes have been made
    changed = false;
  }

  if (getCurrentPane() == "input") {
    $("b_add").disabled = state;
    $("b_save").disabled = state;
  } else {
    $("b_multi_add").disabled = state;
  }
}

/**
 * If clear=true, then the input form is cleared after successful entry
 */
function submitFlight() {
  xmlhttpPost(URL_SUBMIT, null, "ADD");
}

function saveFlight() {
  xmlhttpPost(URL_SUBMIT, false, "EDIT");
}

/**
 * Delete current flight
 * @param id
 */
function deleteFlight(id) {
  if (id) {
    fid = id;
  }
  if (confirm(gt.gettext("Are you sure you want to delete this flight?"))) {
    xmlhttpPost(URL_SUBMIT, false, "DELETE");
  } else {
    $("input_status").innerHTML =
      "<b>" + gt.gettext("Deleting flight cancelled.") + "</b>";
  }
}

/**
 * Handle change of transportation mode
 * @param mode {string} If 'mode' is supplied, force it
 */
function changeMode(mode) {
  if (!mode) {
    mode = document.forms["inputform"].mode.value;
  }
  $("icon_airline").src = MODE_ICONS[mode];
  $("icon_airline").title = gt.strargs(gt.gettext("Search for %1"), [
    modeoperators[mode],
  ]);
  calcDuration("AIRPORT"); // recompute duration estimate
  markAsChanged(true);
}

/**
 * Handle the "add new airports" buttons
 * @param type
 * @param apid
 */
function popNewAirport(type, apid) {
  if (!apid) {
    apid = 0;
  }
  var url = "/html/apsearch";
  if (type) {
    input_toggle = type;
    apid = getApid(type);
  }
  if (apid != 0) {
    url += "?apid=" + apid;
  }
  window.open(url, "Airport", "width=580,height=580,scrollbars=yes");
}

/**
 * Read in newly added airport (from Airport Search)
 * (new for this map, that is, not necessarily DB)
 * @param data
 * @param name
 */
function addNewAirport(data, name) {
  var element = input_toggle;
  if (input_toggle) {
    $(element).value = name;
    $(element).style.color = "#000000";
    $(element + "id").value = data;
    replicateSelection(element);
    markAirport(element);
    markAsChanged(true);
  }
}

/**
 * Handle the "add new airlines" buttons
 * @param type
 * @param name
 * @param mode
 */
function popNewAirline(type, name, mode) {
  if (type) {
    input_al_toggle = type;
  }
  var url = "/html/alsearch";
  if (name) {
    url += "?name=" + encodeURIComponent(name) + "&mode=" + mode;
  }
  window.open(url, "Airline", "width=580,height=580,scrollbars=yes");
}

/**
 * Read in newly added airline
 * @param alid
 * @param name
 * @param mode
 */
function addNewAirline(alid, name, mode) {
  markAsChanged();
  changeMode(mode);
  selectInSelect(inputform.mode, mode);

  // Check if the airline was listed already
  if (selectAirline(alid, true)) {
    return;
  }

  // Nope, we need to add it to filter options
  var al_select = document.forms["filterform"].Airlines;
  var elOptNew = document.createElement("option");
  if (name.length > SELECT_MAXLEN) {
    // Three dots in a proportional font is about two chars...
    elOptNew.text = name.substring(0, SELECT_MAXLEN - 2) + "...";
  } else {
    elOptNew.text = name;
  }
  elOptNew.value = alid + ";" + name;

  try {
    al_select.add(elOptNew, null); // standards compliant; doesn't work in IE
  } catch (ex) {
    al_select.add(elOptNew); // IE only
  }

  // And finally the input form
  $(input_al_toggle).value = name;
  $(input_al_toggle + "id").value = alid;
  $(input_al_toggle).style.color = "#000";
}

/**
 * Inject apid into hidden src/dst_apid field after new airport is selected, and draw on map
 * @param inputElementId
 * @param apid
 */
function getSelectedApid(inputElementId, apid) {
  $(inputElementId).style.color = "#000000";
  $(inputElementId + "id").value = apid;
  replicateSelection(inputElementId);
  markAirport(inputElementId);
  markAsChanged(true); // new airport, force refresh
}

/**
 * Inject alid into hidden alid field after the new plane type is selected
 * @param inputElementId
 * @param alid
 */
function getSelectedAlid(inputElementId, alid) {
  $(inputElementId).style.color = "#000000";
  $(inputElementId + "id").value = alid;
  markAsChanged(true); // new airline, force refresh
}

function getSelectedPlid(inputElementId, plid) {
  $(inputElementId).style.color = "#000000";
  $(inputElementId + "id").value = plid;
  markAsChanged(true); // new plane, force refresh
}

// Quick search

/**
 * Autocompleted airport or airline
 * @param item selected autocomplete item with data from the API {label, value}
 */
function getQuickSearchId(item) {
  const data = item.value.toString();
  let id;
  if (data.indexOf(":") > 0) {
    // code:apid:x:y
    id = data.split(":")[1];
    selectAirport(id, false, true); // pop it up if we can find it
  } else {
    id = `L${data}`;
  }
  $("qs").value = item.label;
  $("qsid").value = id;
  $("qsgo").disabled = false;
}

/**
 * Show map!
 */
function goQuickSearch() {
  xmlhttpPost(URL_ROUTES, $("qsid").value);
}

/**
 * Handle the "add new/edit trip" buttons in input
 * // thisTrip can be "ADD" (new), "EDIT" (edit selected), or a numeric trip id (edit this)
 * @param thisTrip
 */
function editTrip(thisTrip) {
  var url = "/html/trip";
  // default (for `thisTrip == "ADD"`); we'll create a new trip
  var trid = 0;

  if (thisTrip == "EDIT") {
    var inputform = document.forms["inputform"];
    trid = inputform.trips[inputform.trips.selectedIndex].value;
  } else if (thisTrip != "ADD") {
    trid = thisTrip;
  }
  if (trid != 0) {
    url += "?trid=" + trid;
  }
  window.open(url, "TripEditor", "width=500,height=280,scrollbars=yes");
}

/**
 * User has added, edited or deleted trip, so punch it in
 * @param code
 * @param newTrid
 * @param name
 * @param url
 */
function newTrip(code, newTrid, name, url) {
  code = parseInt(code);

  // Trip deleted?  Switch filter back to "all trips" view
  if (code == CODE_DELETEOK) {
    var tr_select = document.forms["filterform"].Trips;
    tr_select.selectedIndex = 0;
  }

  // This only applies when a new trip is added in the flight editor
  var trips = document.forms["inputform"].trips;
  if (!trips) {
    $("input_trip_select").innerHTML =
      "<select style='width: 100px' name='trips'></select>";
    document
      .getElementById("trip_edit")
      .setAttribute("onclick", 'JavaScript:editTrip("ADD")');
    trips = document.forms["inputform"].trips;
  }
  if (trips) {
    switch (code) {
      case CODE_ADDOK:
        trips.reselect = true; // means recalculate on refresh
        break;

      case CODE_DELETEOK:
        trips.selectedIndex = 0;
        break;

      default: // EDIT
        trips[trips.selectedIndex].text = name;
        break;
    }
  }
  // In all cases, refresh map
  // TODO: Would be enough to refresh the filter only...
  refresh(true);
  markAsChanged();
}

/**
 * When the user has manually entered an airport code, try to match it
 * @param type {string} contains the element name
 */
function airportCodeToAirport(type) {
  input_toggle = type;
  markAsChanged(true);

  // Is it blank?
  if ($(type).value == "") {
    $(type + "id").value = 0;
    return;
  }

  // Try to match against existing airports
  // TODO: Also match against marker.name
  var code = $(type).value.toUpperCase();
  if (selectAirport(null, true, false, code)) {
    if (type == "qs") {
      $("qsid").value = attrs.apid;
      $("qsgo").disabled = false;
      $("qsgo").focus();
    }
  } else {
    // If not found, dig up from DB
    xmlhttpPost(URL_GETCODE, code, type);
  }
}

/**
 * User has entered invalid input: clear apid, turn field red (unless empty) and remove marker
 * @param type
 * @param airport
 */
function invalidateField(type, airport = false) {
  // TODO: Do we need this comparison against placeholder?
  if ($(type).value != "" && $(type).value != $(type).placeholder) {
    $(type).style.color = "#FF0000";
  }
  $(type + "id").value = 0;
  if (airport) {
    unmarkAirports();
  }
}

/**
 * When the user has entered flight number, try to match it to airline
 * @param type {string} element invoked
 */
function flightNumberToAirline(type) {
  markAsChanged();
  if (type == "NUMBER") {
    // This is a flight number
    var flightNumber = document.forms["inputform"].number.value.toUpperCase();
    document.forms["inputform"].number.value = flightNumber;

    // Ignore all-numeric flight numbers
    if (RE_NUMERIC.test(flightNumber)) {
      return;
    }

    // Does the flight number start with IATA or ICAO code?
    if (flightNumber.length >= 2) {
      var re_iata = /^([a-zA-Z0-9][a-zA-Z0-9]$|[a-zA-Z0-9][a-zA-Z0-9][ 0-9])/; // XX or XX[ ]N...
      var re_icao =
        /^([a-zA-Z][a-zA-Z][a-zA-Z]$|[a-zA-Z][a-zA-Z][a-zA-Z][ 0-9])/; // XXX or XXX[ ]N...
      var airlineCode;
      if (re_iata.test(flightNumber.substring(0, 3))) {
        airlineCode = flightNumber.substring(0, 2);
      } else if (re_icao.test(flightNumber.substring(0, 4))) {
        airlineCode = flightNumber.substring(0, 3);
      } else {
        // User has entered something weird, ignore it
        return;
      }
      type = "airline";
    }
  } else {
    // This is a manually entered airline name
    // Is it blank?
    if ($(type).value == "") {
      $(type + "id").value = 0;
      return;
    }
    airlineCode = $(type).value;
  }

  // We've found something that looks like an airline code, so overwrite it into AIRLINE field
  if (airlineCode) {
    xmlhttpPost(URL_GETCODE, airlineCode, type);
  }
}

/**
 * Calculate the duration of the flight given user-entered arrival and departure time
 * @param param {string}
 *  'AIRPORT': airport changed by user, recompute duration and time at destination
 *  'ARRIVAL': arrival time changed by user, recompute duration
 *  'DEPARTURE': date or time at source (departure) changed, recompute time at destination
 *  'DURATION': duration changed by user, recompute time at destination
 *  'DISTANCE': recalculate distance *only* if blanked
 */
function calcDuration(param) {
  var days = 0,
    duration = 0;

  // Need both airports first
  if ($("src_apid").value == 0 || $("dst_apid").value == 0) {
    return;
  }
  var dst_time = $("dst_time").value.trim();
  if (dst_time == "" || dst_time == "HH:MM") {
    dst_time = 0;
  }

  switch (param) {
    case "DISTANCE":
      // Re-estimate *only* if blanked
      var distance = $("distance").value.trim();
      if (distance == "") {
        var lon1 = getX("src_ap");
        var lat1 = getY("src_ap");
        var lon2 = getX("dst_ap");
        var lat2 = getY("dst_ap");
        $("distance").value = gcDistance(lat1, lon1, lat2, lon2);
        $("distance").style.color = "#000";
      } else if (!RE_NUMERIC.test(distance)) {
        $("distance").focus();
        $("distance").style.color = "#F00";
      } else {
        $("distance").style.color = "#000";
      }
      markAsChanged();
      return; // always terminate here

    case "ARRIVAL":
      // User has changed arrival time: recompute duration
      // User has blanked arrival time: recompute arrival time (using existing duration)
      if (dst_time != 0) {
        duration = 0;
        break;
      }
    // else fallthru

    case "DURATION":
    case "DEPARTURE":
      // Recompute arrival time based on user-changed/previously calculated duration
      // (if no duration is available, estimate it)
      var duration = $("duration").value.trim();
      if (duration != "") {
        if (!RE_TIME.test(duration)) {
          $("duration").focus();
          $("duration").style.color = "#F00";
          return;
        }
        $("duration").style.color = "#000";
        duration =
          parseFloat(duration.split(":")[0]) +
          parseFloat(duration.split(":")[1] / 60);
        dst_time = 0;
        break;
      }
      // else no duration known, estimate and reset
      param = "AIRPORT";
    // fallthru

    case "AIRPORT":
      // User has changed airport, estimate duration based on distance then (30 min plus 1 hr/500 mi) and
      // compute time at destination
      var distance = $("distance").value;
      if (!RE_NUMERIC.test(distance)) {
        $("distance").focus();
        $("distance").style.color = "#F00";
        return;
      }
      $("distance").style.color = "#000";
      duration = $("distance").value / MODE_SPEEDS[getMode()] + 0.5;
      dst_time = 0;
      break;

    default:
      alert(
        gt.strargs(
          gt.gettext("Error: Unknown parameter '%1' at calcDuration()"),
          [param]
        )
      );
      return;
  }

  // Do we have a starting time?
  var src_time = $("src_time").value;
  if (src_time != "" && src_time != "HH:MM") {
    // We do!  Does it make sense?
    if (!RE_TIME.test(src_time)) {
      $("src_time").focus();
      $("src_time").style.color = "#F00";
      return;
    }
    src_time = parseTimeString(src_time);

    // Do we have an arrival time?
    if (dst_time != 0) {
      // Yes, validate it
      if (!RE_TIME.test(dst_time)) {
        $("dst_time").focus();
        $("dst_time").style.color = "#F00";
        return;
      }
      // Case 3: Need to determine duration
      dst_time = parseTimeString(dst_time);
      days = $("dst_days").value;
      if (days != "") {
        dst_time += parseInt($("dst_days").value) * 24;
      }
      duration = 0;
    }

    // Get timezones
    var src_tz = getTZ("src_ap");
    var dst_tz = getTZ("dst_ap");
    var src_dst = getDST("src_ap");
    var dst_dst = getDST("dst_ap");

    // Verify if DST is active
    // 2008-01-26[0],2008[1],20[2],01[3],26[4]
    var src_date = RE_DATE.exec($("src_date").value);
    if (!src_date) {
      // Nonsensical date
      return;
    }
    var src_year = src_date[1];
    var src_month = src_date[3];
    var src_day = src_date[4];
    src_date = new Date();
    src_date = src_date.setFullYear(src_year, src_month - 1, src_day);
    if (checkDST(src_dst, src_date, src_year)) {
      src_tz++;
      src_dst = "Y";
    }
    if (checkDST(dst_dst, src_date, src_year)) {
      dst_tz++;
      dst_dst = "Y";
    }
    $("icon_clock").title = gt.strargs(
      gt.gettext(
        "Departure UTC %1%2%3, Arrival UTC %4%5%6, Time difference %7 hours"
      ),
      [
        src_tz > 0 ? "+" : "",
        src_tz,
        src_dst == "Y" ? " (" + gt.gettext("DST") + ")" : "",
        dst_tz > 0 ? "+" : "",
        dst_tz,
        dst_dst == "Y" ? " (" + gt.gettext("DST") + ")" : "",
        dst_tz - src_tz,
      ]
    );

    // Case 2: Calculate arrival time from starting time and duration
    if (dst_time == 0) {
      dst_time = src_time + duration + (dst_tz - src_tz);
      days = Math.floor(dst_time / 24);
      dst_time = dst_time % 24;
      while (dst_time < 0) dst_time += 24;
      var hours = Math.floor(dst_time);
      var mins = Math.floor((dst_time - hours) * 60);
      if (mins < 10) {
        mins = "0" + mins + "";
      }
      $("dst_time").value = hours + ":" + mins;
      $("dst_time").style.color = "#000";
      if (days == 0) {
        $("dst_days").value = "";
        $("dst_days").style.display = "none";
      } else {
        if (days > 0) {
          $("dst_days").value = gt.strargs(gt.gettext("+%1 day"), [days]);
        } else {
          $("dst_days").value = gt.strargs(gt.gettext("%1 day"), [days]);
        }
        $("dst_days").style.display = "inline";
      }
    }

    // Case 3: Calculate duration from arrival time and starting time
    if (duration == 0) {
      duration = dst_time - src_time - (dst_tz - src_tz);
      if (duration < 0) {
        duration += 24;
      }
    }
  } else {
    // Case 1: Do nothing, just use estimated duration
    $("icon_clock").title = gt.gettext("Flight departure and arrival times");
  }

  if (param == "AIRPORT" || param == "ARRIVAL") {
    // Convert duration back to clock time (sexagesimal)
    hours = Math.floor(duration);
    mins = Math.round((Math.abs(duration) % 1.0) * 60);
    if (mins == 60) {
      mins = 0;
      hours++;
    }
    if (mins < 10) {
      mins = "0" + mins + "";
    }
    if (hours < 10) {
      hours = "0" + hours + "";
    }
    $("duration").value = hours + ":" + mins;
    $("duration").style.color = "#000";
  }
  markAsChanged();
}

/**
 * Add a temporary source or destination marker over currently selected airport
 * Also calculates distance and duration (unless "quick" is true)
 * @param element {string}
 * @param quick {boolean}
 */
function markAirport(element, quick) {
  var icon = element.startsWith("src_ap")
    ? "/img/icon_plane-src.png"
    : "/img/icon_plane-dst.png";
  if (getCurrentPane() == "multiinput") {
    element = markingLimit(element);
  }
  if (!element) {
    // nothing to draw
    return;
  }

  var data = $(element + "id").value.split(":");
  // var iata = data[0];
  var apid = data[1];
  var x = data[2];
  var y = data[3];

  if (apid > 0) {
    var point = projectedPoint(x, y);
    var marker = new OpenLayers.Feature.Vector(point);
    marker.attributes = {
      name: "",
      icon: icon,
      size: 17,
      offset: -17 / 2,
      opacity: 1,
      code: data[0],
    };
    airportLayer.addFeatures(marker, { silent: true });
  }
  if (element.startsWith("src_ap")) {
    if (input_srcmarker) {
      airportLayer.removeFeatures([input_srcmarker]);
    }
    if (apid > 0) {
      input_srcmarker = marker;
      if (element == "src_ap") {
        input_toggle = "dst_ap"; // single input
      } else {
        var idx = MULTI_INPUT_ORDER.indexOf(element) + 1;
        if (idx == MULTI_INPUT_ORDER.length) {
          idx = 0;
        }
        input_toggle = MULTI_INPUT_ORDER[idx];
      }
    } else {
      input_srcmarker = null;
    }
  } else {
    if (input_dstmarker) {
      airportLayer.removeFeatures([input_dstmarker]);
    }
    if (apid > 0) {
      input_dstmarker = marker;
      if (element == "dst_ap") {
        input_toggle = "src_ap"; // single input
      } else {
        var idx = MULTI_INPUT_ORDER.indexOf(element) + 1;
        if (idx == MULTI_INPUT_ORDER.length) {
          idx = 0;
        }
        input_toggle = MULTI_INPUT_ORDER[idx];
      }
    } else {
      input_dstmarker = null;
    }
  }

  // Draw line and calculate distance and duration
  if (!quick) {
    if (input_line) {
      lineLayer.removeFeatures(input_line);
      input_line = null;
    }
    if (input_dstmarker && input_srcmarker) {
      if (getCurrentPane() == "input") {
        var lon1 = getX("src_ap");
        var lat1 = getY("src_ap");
        var lon2 = getX("dst_ap");
        var lat2 = getY("dst_ap");
        var distance = gcDistance(lat1, lon1, lat2, lon2);
        input_line = drawLine(
          parseFloat(lon1),
          parseFloat(lat1),
          parseFloat(lon2),
          parseFloat(lat2),
          4,
          distance,
          COLOR_HIGHLIGHT
        );
      } else {
        input_line = [];
        for (var i = 1; i <= multiinput_rows; i++) {
          var src_ap = $("src_ap" + i + "id").value;
          var dst_ap = $("dst_ap" + i + "id").value;
          if (src_ap != 0 && dst_ap != 0) {
            var src_ap_data = src_ap.split(":");
            var lon1 = src_ap_data[2];
            var lat1 = src_ap_data[3];
            var dst_ap_data = dst_ap.split(":");
            var lon2 = dst_ap_data[2];
            var lat2 = dst_ap_data[3];
            var distance = gcDistance(lat1, lon1, lat2, lon2);
            var line = drawLine(
              parseFloat(lon1),
              parseFloat(lat1),
              parseFloat(lon2),
              parseFloat(lat2),
              4,
              distance,
              COLOR_HIGHLIGHT
            );
            input_line = input_line.concat(line);
          } else {
            break; // stop drawing
          }
        }
      }
      lineLayer.addFeatures(input_line);
      var oldDist = $("distance").value;
      $("distance").value = distance;
      // TODO: Do we need this comparison against placeholder?
      if (oldDist == "" && $("dst_time").value != $("dst_time").placeholder) {
        // user has already manually entered arrival time
        calcDuration("ARRIVAL");
      } else {
        // compute duration and arrival time
        calcDuration("AIRPORT");
      }
    } else {
      $("distance").value = "";
      $("duration").value = "";
    }
  }
}

/**
 * Remove input markers and flight lines
 */
function unmarkAirports() {
  if (input_srcmarker) {
    airportLayer.removeFeatures([input_srcmarker]);
    input_srcmarker = null;
  }
  if (input_dstmarker) {
    airportLayer.removeFeatures([input_dstmarker]);
    input_dstmarker = null;
  }
  if (input_line) {
    lineLayer.removeFeatures(input_line);
    input_line = null;
  }
}

/**
 * Find the highest valid (defined && non-zero apid) airport in multiinput
 * @param element
 * @returns {null|string}
 */
function markingLimit(element) {
  if (element.startsWith("src_ap")) {
    return "src_ap1";
  }
  for (var i = 1; i <= multiinput_rows; i++) {
    var ap = $("dst_ap" + i + "id").value;
    if (!ap || ap == "" || ap == 0) {
      i--; // this airport is no longer valid, so we use prev row as limit
      break;
    }
  }
  if (i == 0) {
    return null;
  } // no valid airports
  if (i > multiinput_rows) {
    i = multiinput_rows;
  } // otherwise, it goes one over if all rows are valid
  return "dst_ap" + i;
}

/**
 * Swap airports around
 * @param manual {boolean}
 *  If "true" (manual), swap both
 *  If "false" (automatic), swap only top to bottom and restore top to original
 */
function swapAirports(manual) {
  var srcName, srcData;
  if (manual) {
    srcName = $("src_ap").value;
    srcData = $("src_apid").value;
  }
  // Clear out times (makes no sense to swap them)
  clearTimes();

  // Clone SRC from DST
  $("src_ap").value = $("dst_ap").value;
  $("src_apid").value = $("dst_apid").value;

  if (manual) {
    // Clone DST from SRC
    $("dst_ap").value = srcName;
    $("dst_apid").value = srcData;
    if (srcName != "") {
      $("dst_ap").style.color = "#000";
    }
  } else {
    // Clear out DST
    $("dst_ap").value = "";
    $("dst_apid").value = "";
  }

  // Redraw markers and airline codes
  markAirport("src_ap", true);
  markAirport("dst_ap", true);
  if (manual) {
    markAsChanged();
  }
}

/**
 * Given apid or code, find the matching airport and either pop it up (select=false) or mark it as selected (select=true)
 * @param apid
 * @param select {boolean}
 * @param quick {boolean} passed to markAirport
 * @param code
 * @returns {boolean}
 */
function selectAirport(apid, select, quick, code) {
  var found = false;
  for (var ap = 0; ap < airportLayer.features.length; ap++) {
    var attrstack = new Array();
    if (airportLayer.features[ap].cluster) {
      for (var c = 0; c < airportLayer.features[ap].cluster.length; c++) {
        attrstack.push(airportLayer.features[ap].cluster[c].attributes);
      }
    } else {
      attrstack.push(airportLayer.features[ap].attributes);
    }
    while (attrstack.length > 0) {
      var attrs = attrstack.pop();
      if ((apid && attrs.apid == apid) || (code && attrs.code == code)) {
        // If "select" is true, we select the airport into the input form instead of popping it up
        if (select && isEditMode()) {
          var element = input_toggle;
          $(element).value = attrs.name;
          $(element).style.color = "#000";
          $(element + "id").value = attrs.apdata;
          replicateSelection(element);
          markAirport(element, quick);
          markAsChanged(true);
          closePopup(true);
        } else {
          if (airportLayer.features[ap].cluster) {
            onAirportSelect(
              airportLayer.features[ap].cluster[attrstack.length]
            );
          } else {
            onAirportSelect(airportLayer.features[ap]);
          }
        }
        found = true;
        return found;
      }
    }
  }
  // Search failed
  if (!quick && !code) {
    if (
      confirm(
        gt.gettext("This airport is currently filtered out. Clear filter?")
      )
    ) {
      clearFilter(false);
    }
  }
  return false;
}

/**
 * Change number of rows displayed in multiinput
 * @param type {string}
 */
function changeRows(type) {
  switch (type) {
    case "More":
      if (multiinput_rows >= 3) {
        $("b_more").disabled = true;
      }
      if (multiinput_rows == 1) {
        $("b_less").disabled = false;
      }
      multiinput_rows++;
      var row = "row" + multiinput_rows;
      $(row).style.display = ""; // resolves to "table-row" in FF and "block" in IE...
      replicateSelection("dst_ap" + multiinput_rows);
      break;

    case "Less":
      if (multiinput_rows == 4) {
        $("b_more").disabled = false;
      }
      if (multiinput_rows == 2) {
        $("b_less").disabled = true;
      }
      $("row" + multiinput_rows).style.display = "none";
      multiinput_rows--;
      break;
  }

  markAirport("dst_ap" + multiinput_rows); // redraw flight path
}

/**
 * In multiinput mode, copy entered airport/airline/date into the next row (when empty)
 * Special argument "More" adds a row, "Less" removes one
 * @param source
 */
function replicateSelection(source) {
  if (getCurrentPane() != "multiinput") {
    return;
  }

  switch (source) {
    case "dst_ap1":
    case "dst_ap2":
    case "dst_ap3":
    case "airline1":
    case "airline2":
    case "airline3":
      // Check if the row we're trying to replicate to is active; if no, abort
      var idx = parseInt(source.charAt(source.length - 1)) + 1;
      var row = "row" + idx;
      if ($(row).style.display == "none") {
        return;
      }

      var target = "src_ap" + idx;
      var date_target = "src_date" + idx;
      var date_source = "src_date" + (idx - 1);
      var al_target = "airline" + idx;
      var al_source = "airline" + (idx - 1);
      break;

    default:
      return; // do nothing
  }
  if ($(source + "id").value != 0 && $(target + "id").value == 0) {
    $(target).value = $(source).value;
    $(target).style.color = "#000";
    $(target + "id").value = $(source + "id").value;
  }
  if ($(al_source + "id").value != 0 && $(al_target + "id").value == 0) {
    $(al_target).value = $(al_source).value;
    $(al_target).style.color = "#000";
    $(al_target + "id").value = $(al_source + "id").value;
  }
  if ($(date_target).value == "") {
    $(date_target).value = $(date_source).value;
  }
}

/**
 * Given alid, find it in filter
 * @param new_alid
 * @param edit {boolean} if edit is true, set it in editor, else set in map (filter)
 * @returns {boolean} true if found, false if not
 */
function selectAirline(new_alid, edit) {
  var al_select = document.forms["filterform"].Airlines;
  for (var index = 0; index < al_select.length; index++) {
    if (al_select[index].value.split(";")[0] == new_alid) {
      if (edit) {
        $(input_al_toggle).value = al_select[index].value.split(";")[1];
        $(input_al_toggle).style.color = "#000";
        $(input_al_toggle + "id").value = new_alid;
      } else {
        al_select.selectedIndex = index;
      }
      return true;
    }
  }
  return false;
}

function getAirlineMapIcon(alid) {
  return (
    "<a href='#' onclick='JavaScript:showAirlineMap(" +
    alid +
    // TODO: alt text
    ")'><img src='/img/icon_routes.png' width=16 height=16 title='" +
    gt.gettext("Show airline route map") +
    "'></a>"
  );
}

/**
 * Load route map for this alid
 * (set filter to this airline as well)
 * @param alid
 */
function showAirlineMap(alid) {
  selectAirline(0, false);
  xmlhttpPost(URL_ROUTES, "L" + alid);
}

/**
 * Context help
 * @param context {string}
 */
function help(context) {
  window.open(
    "/help/" + context,
    "Help",
    "width=500,height=400,scrollbars=yes"
  );
}

/**
 * Import flights
 */
function openImport() {
  window.open("/html/import", "Import", "width=900,height=600,scrollbars=yes");
}

/**
 * Change settings
 */
function settings() {
  location.href = "/html/settings";
}

/**
 * Handle keypresses
 *  1. Let users log in by pressing ENTER
 *  2. Get codes if user hits TAB on autocompletable field
 * @param e
 * @param element
 * @returns {boolean}
 */
function keyPress(e, element) {
  var keycode;
  if (window.event) {
    keycode = window.event.keyCode;
  } else if (e) {
    keycode = e.which;
  }

  if (element == "login") {
    if (e == "CHANGE" && logged_in == "pending") {
      return true;
    }
    if (keycode == Event.KEY_RETURN) {
      logged_in = "pending";
      xmlhttpPost(URL_LOGIN);
    }
  } else {
    if (keycode == Event.KEY_TAB) {
      // Ignore fields that are already autocompleted
      if ($(element).value.length > 4) {
        return;
      }

      switch (element) {
        case "qs":
        case "src_ap":
        case "src_ap1":
        case "src_ap2":
        case "src_ap3":
        case "src_ap4":
        case "dst_ap":
        case "dst_ap1":
        case "dst_ap2":
        case "dst_ap3":
        case "dst_ap4":
          airportCodeToAirport(element);
          break;

        case "airline":
        case "airline1":
        case "airline2":
        case "airline3":
        case "airline4":
          flightNumberToAirline(element);
          break;
      }
    }
  }
  return true;
}

/**
 * Login and logout
 * @param str {string}
 * @param param {string}
 *  null: "Normal" login from front page
 *  REFRESH: User has session open and is coming back
 *  NEWUSER: User using OF for the first time (or has zero flights)
 */
function login(str, param) {
  var result = JSON.parse(str);
  var name = result["name"];
  $("loginstatus").style.display = "inline";

  // Login successful
  switch (result["status"]) {
    case 1:
      prefs_editor = result["editor"];
      elite = result["elite"];
      logged_in = true;
      $("loginform").style.display = "none";
      $("langselect").style.display = "none";
      $("controlpanel").style.display = "inline";
      switch (param) {
        case "REFRESH":
          $("loginstatus").innerHTML =
            getEliteIcon(elite) +
            gt.strargs(gt.gettext("Logged in as <b>%1</b>"), [name]);
          break;

        case "NEWUSER":
          $("loginstatus").innerHTML =
            getEliteIcon(elite) +
            gt.strargs(gt.gettext("Welcome, <b>%1</b> !"), [name]);
          break;

        default:
          $("stats").innerHTML = "<i>" + gt.gettext("Loading") + "</i>";
          $("stats_ajax").style.display = "inline";
          $("loginstatus").innerHTML =
            getEliteIcon(elite) +
            gt.strargs(gt.gettext("Hi, <b>%1</b> !"), [name]);
          break;
      }

      switch (elite) {
        case "X":
          $("news").style.display = "inline";
          $("news").innerHTML =
            getEliteIcon("X") +
            // TODO: alt text
            "<img src='/img/close.gif' height=17 width=17 onClick='JavaScript:closeNews()'> " +
            gt.gettext(
              "<b>Welcome back!</b> We're delighted to see that you like OpenFlights.<br>Please <a href='/donate' target='_blank'>donate and help keep the site running</a>!"
            );
          break;

        case "G":
        case "P":
          // Remove ad pane and manually force help to show
          $(getCurrentPane()).style.display = "none";
          $("help").style.display = "inline";
          paneStack[0] = "help";
          break;
      }

      if (param == "NEWUSER") {
        $("news").innerHTML =
          // TODO: alt text
          "<img src='/img/close.gif' height=17 width=17 onClick='JavaScript:closeNews()'> " +
          gt.strargs(
            gt.gettext(
              "<b>Welcome to OpenFlights!</b> Click on %1 to start adding flights, or on %2 to load in existing flights from sites like FlightMemory."
            ),
            [
              "<input type='button' value='" +
                gt.gettext("New flight") +
                "' align='middle' onclick='JavaScript:newFlight()'>",
              "<input type='button' value='" +
                gt.gettext("Import") +
                "' align='middle' onclick='JavaScript:openImport()'>",
            ]
          );
        $("news").style.display = "inline";
      } else {
        closeNews();
      }

      // in a NEWUSER or REFRESH, we've already drawn the map, so no need to redraw
      if (!param) {
        clearStack();
        clearMap();
        clearFilter(true);
      }
      break;

    case 2:
      // Successful but need to switch UI language, so reload, stripping out any "?lang" in the URL
      $("loginstatus").innerHTML = "<b>" + gt.gettext("Loading") + "</b>";
      location.href = location.origin + location.pathname;
      break;

    default:
      // Login failed
      logged_in = false;
      $("loginstatus").innerHTML = "<b>" + result["message"] + "</b>";
      showLoadingAnimation(false);
  }
}

function logout(str) {
  logged_in = false;
  $("loginstatus").innerHTML =
    "<b>" + gt.gettext("You have been logged out.") + "</b>";
  $("stats").innerHTML = "<i>" + gt.gettext("Loading") + "</i>";
  $("stats_ajax").style.display = "inline";
  $("loginform").style.display = "inline";
  $("langselect").style.display = "block";
  $("controlpanel").style.display = "none";
  $(getCurrentPane()).style.display = "none";
  $("ad").style.display = "inline";
  paneStack[0] = "ad";
  clearStack();
  clearMap();
  clearFilter(true);
  closeNews();
  document.forms["login"].name.value = "";
  document.forms["login"].pw.value = "";
  document.forms["login"].name.focus();
}

// Get current transport mode
function getMode() {
  if (getCurrentPane() == "input") {
    return document.forms["inputform"].mode.value;
  }
  return "F";
}

// Functions for swapping between lower panes

/**
 * @returns {string} Possible panes: 'ad', 'result', 'input', 'help'
 */
function getCurrentPane() {
  return paneStack[paneStack.length - 1];
}

/**
 * @returns {boolean} Return true if we are in detailed or multi edit mode
 */
function isEditMode() {
  var currentPane = getCurrentPane();
  return currentPane == "input" || currentPane == "multiinput";
}

/**
 * Open a new pane
 * If the pane is open already, do nothing
 * @param newPane
 */
function openPane(newPane) {
  if (paneStack.length > 0) {
    var currentPane = getCurrentPane();
    if (currentPane == newPane) {
      return;
    }
    $(currentPane).style.display = "none";
  }
  $(newPane).style.display = "inline";
  paneStack.push(newPane);
}

/**
 * Check if a named pane is already open, return index if yes
 * @param pane
 * @returns {number|null}
 */
function findPane(pane) {
  for (var i = 0; i < paneStack.length; i++) {
    if (paneStack[i] == pane) {
      return i;
    }
  }
  return null;
}

/**
 * Close current pane
 * If the current pane is the last one, do nothing
 */
function closePane() {
  if (paneStack.length == 1) {
    return;
  }

  if (isEditMode()) {
    unmarkAirports();
    $("newairport").style.display = "none";
    $("qsmini").style.display = "block";
  }
  var currentPane = paneStack.pop();
  var lastPane = getCurrentPane();
  if (currentPane == "result") {
    apid = 0;
  }
  $(currentPane).style.display = "none";
  $(lastPane).style.display = "inline";

  // If ad pane is now displayed, refresh it
  if (paneStack.length == 1 && paneStack[0] == "ad") {
    refreshAd();
  }
}

/**
 * Clear all panes until the base pane (ad)
 */
function clearStack() {
  while (paneStack.length > 1) {
    closePane();
  }
}

function openDetailedInput(param) {
  // Does the user already have an input pane open?
  var p = findPane("input");
  if (!p) {
    p = findPane("multiinput");
  }
  if (p) {
    // Have they changed it, and do they want to throw away the changes?
    if (hasChanged()) {
      var msg;
      switch (param) {
        case "ADD":
        case "COPY":
          msg = gt.gettext(
            "You are already editing a flight. OK to discard your changes and add a new flight instead?"
          );
          break;

        case "EDIT":
          msg = gt.gettext(
            "You are already editing a flight. OK to discard your changes and edit this flight instead?"
          );
          break;
      }
      if (!confirm(msg)) {
        return;
      }
    }
    $(paneStack[p]).style.display = "none";
    paneStack.splice(p, 1); // remove the previous "input" pane from stack
  }
  openPane("input");

  switch (param) {
    case "ADD":
      clearInput();
    // fall thru

    case "COPY":
      $("addflighttitle").style.display = "inline";
      $("addflightbuttons").style.display = "inline";
      $("editflighttitle").style.display = "none";
      $("editflightbuttons").style.display = "none";
      break;

    case "EDIT":
      $("addflighttitle").style.display = "none";
      $("addflightbuttons").style.display = "none";
      $("editflighttitle").style.display = "inline";
      $("editflightbuttons").style.display = "inline";
  }
  input_toggle = "src_ap";
  input_al_toggle = "airline";
  $("quicksearch").style.display = "none";
  $("qsmini").style.display = "none";
  $("newairport").style.display = "inline";
  $("input_status").innerHTML = "";
}

/**
 * Opens the basic (multiflight) editor
 * @param param {string}
 */
function openBasicInput(param) {
  // Does the user already have an input pane open?
  var p = findPane("input");
  if (!p) {
    p = findPane("multiinput");
  }
  if (p) {
    // Have they changed it, and do they want to throw away the changes?
    if (hasChanged()) {
      if (
        !confirm(
          gt.gettext(
            "You are already editing a flight. OK to discard your changes and add a new flight instead?"
          )
        )
      ) {
        return;
      }
    }
    $(paneStack[p]).style.display = "none";
    paneStack.splice(p, 1); // remove the previous "input" pane from stack
  }

  openPane("multiinput");
  $("quicksearch").style.display = "none";
  $("qsmini").style.display = "none";
  $("newairport").style.display = "inline";
  $("multiinput_status").innerHTML = "";
  clearInput();
  input_toggle = MULTI_INPUT_ORDER[0];
  input_al_toggle = "airline1";
}

function closeInput() {
  if (hasChanged()) {
    if (
      !confirm(
        gt.gettext(
          "Changes made to this flight have not been saved. OK to discard them?"
        )
      )
    ) {
      return;
    }
  }
  closePane();

  // Reload the flight list if we were editing flights, or
  // user had a result pane open when they opened a new flight editor

  if (
    getCurrentPane() == "result" &&
    ($("editflighttitle").style.display == "inline" ||
      $("addflighttitle").style.display == "inline")
  ) {
    xmlhttpPost(URL_FLIGHTS, 0, "RELOAD");
  }
}

/**
 * Clear out (restore to defaults) the time indicators in the editor
 */
function clearTimes() {
  $("src_time").value = "";
  $("dst_time").value = "";
  $("dst_days").value = "";
  $("dst_days").style.display = "none";
}

/**
 * @returns {string} YYYY-MM-DD
 */
function todayString() {
  var today = new Date();
  var month = today.getMonth() + 1 + "";
  if (month.length == 1) {
    month = "0" + month;
  }
  var day = today.getDate() + "";
  if (day.length == 1) {
    day = "0" + day;
  }
  return today.getFullYear() + "-" + month + "-" + day;
}

/**
 * Clear out (restore to defaults) the input box
 */
function clearInput() {
  var form;
  if (getCurrentPane() == "input") {
    form = document.forms["inputform"];
    form.src_date.value = todayString();
    form.src_date.focus();
    form.src_apid.value = 0;
    form.src_ap.value = "";
    form.dst_apid.value = 0;
    form.dst_ap.value = "";
    form.dst_days.value = "";
    clearTimes();
    var $dur = $("duration");
    $dur.value = "";
    $dur.style.color = "#000";
    var $dist = $("distance");
    $dist.value = "";
    $dist.style.color = "#000";
    form.number.value = "";
    form.airlineid.value = 0;
    form.airline.value = "";
    form.seat.value = "";
    form.seat_type.selectedIndex = 0;
    form.mode.selectedIndex = 0;
    changeMode("F");
    form.planeid.value = "";
    form.plane.value = "";
    form.registration.value = "";
    form.note.value = "";
    if (form.trips) {
      form.trips.selectedIndex = 0;
    }
  } else {
    form = document.forms["multiinputform"];
    for (var i = 0; i < MULTI_INPUT_IDS.length; i++) {
      $(MULTI_INPUT_IDS[i]).value = 0;
    }
    form.src_date1.value = todayString();
    form.src_ap1.focus();
    form.src_ap1.style.color = "#000000";
  }
  unmarkAirports();
  setCommitAllowed(false);
}

function showHelp() {
  if (getCurrentPane() == "help") {
    return;
  }
  openPane("help");
}

function closePopup(unselect) {
  // close any previous popups
  if (currentPopup && currentPopup != this.popup) {
    currentPopup.hide();
    currentPopup = null;
  }
  if (unselect) {
    selectControl.unselectAll();
  }
}

function closeNews() {
  $("news").style.display = "none";
}

function showLoadingAnimation(show) {
  $("ajaxstatus").style.display = show ? "inline" : "none";
}

/**
 * user has selected a new field in the extra filter
 */
function setExtraFilter() {
  var key = document.forms["filterform"].Extra.value,
    span = "";
  switch (key) {
    case "": // none (More...)
      $("filter_extra_span").innerHTML = "";
      refresh(true);
      return;

    case "class":
      span = createSelectFromArray(
        "filter_extra_value",
        classes,
        "refresh(true)"
      );
      break;

    case "distgt":
    case "distlt":
      span =
        "<input type='text' style='width: 50px' id='filter_extra_value' class='date' onChange='JavaScript:refresh(true)'> mi";
      break;

    case "mode":
      span = createSelectFromArray(
        "filter_extra_value",
        modenames,
        "refresh(true)"
      );
      break;

    case "reason":
      span = createSelectFromArray(
        "filter_extra_value",
        reasons,
        "refresh(true)"
      );
      break;

    case "reg":
    case "note":
      span =
        "<input type='text' style='width: 100px' id='filter_extra_value' class='date' onChange='JavaScript:refresh(true)'>";
      break;
  }
  $("filter_extra_span").innerHTML = span;
}

/**
 * @param refresh_all {boolean} false = only flights, true = reload everything
 */
function clearFilter(refresh_all) {
  var form = document.forms["filterform"];

  // Do not allow trip filter to be cleared if it's set in URL
  if (form.Trips && parseUrl()[0] == "trip") {
    form.Trips.selectedIndex = 0;
  }
  form.Years.selectedIndex = 0;
  form.Extra.selectedIndex = 0;
  $("filter_extra_span").innerHTML = "";
  selectAirline(0);
  if (refresh_all && lasturl == URL_ROUTES) {
    var extent = airportLayer.getDataExtent();
    if (extent) {
      map.zoomToExtent(extent);
    }
    lasturl = URL_MAP;
  }
  refresh(refresh_all);
}

/**
 * Refresh user's display after change in filter
 * @param init {boolean} true: reloads all user data. false: loads flight data and stats only
 *
 * lasturl: either URL_MAP or URL_ROUTES (set in updateMap())
 */
function refresh(init) {
  closePopup();
  if (typeof lasturl == "undefined") {
    lasturl = URL_MAP;
  }
  if (lasturl == URL_MAP) {
    apid = 0;
  }
  xmlhttpPost(lasturl, apid, init);
}

/**
 *  Refresh the Google Ad iframe
 * @TODO: How to make the second ad refresh?
 */
function refreshAd() {
  var d = $("ad");
  if (d) {
    var s = d.getElementsByTagName("iframe");
    if (s && s.length) {
      s[0].src =
        s[0].src.split(/&xtime=/)[0] + "&xtime=" + new Date().getTime();
    }
  }
  return true;
}

function of_debug(str) {
  $("maptitle").innerHTML = $("maptitle").innerHTML + "<br>" + str;
}
