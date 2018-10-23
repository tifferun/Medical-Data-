//Build Cotroller object for logic controller
var mainController = {

    //Inititialization Function - App
    init: function () {
        //initiating tabs with JQuery UI on right 
        $(".tabs-wrapper").tabs();

        // build left nav bar content
        uiController.buildNavBar(data.countries, data.diseaseGroups);

        // load the data and render the map
        mainController.loadData();
    },

    //Functions for retreiving data from WHO 
    fetchHealthData: function (countries, diseases, callback) {
        //URL for AJAX request
        var queryUrl = "https://cors-anywhere.herokuapp.com/http://apps.who.int/gho/athena/data/GHO/SDG_SH_DTH_RNCOM?profile=simple&format=json&filter=SEX:BTSX;YEAR:2016";

        diseases.forEach(function (disease) {
            if (disease.include) {
                queryUrl += ";GHECAUSES:" + disease.code;
            }
        });

        // For now pre-filter for all 5 countries and we will further filter by GHECODE/COUNTRY in the data processing.
        countries.forEach(function (country) {
            queryUrl += ";COUNTRY:" + country.code;
        });

        //create simplified object and store in data
        $.ajax({
            headers: {
                "Access-Control-Allow-Origin": "*"
            },
            url: queryUrl,
            method: "GET"
        }).then(function (response) {
            callback(response);
        });
    },

    loadData: function () {
        // toggle the map and spinner
        uiController.showMap(false);
        uiController.showTabs(false);
        uiController.showSubtitle(false);
        uiController.showSpinner(true);

        mainController.fetchHealthData(data.countries, data.diseaseGroups, function (response) {
            //  process the data
            console.log(response);

            // loop through the countries, then the groups and finally the repsonse and add a value to 
            // the countries object if there is a match
            data.countries.forEach(function (country) {
                // clear the values
                country.values = {};
                country.weights = {};

                data.diseaseGroups.forEach(function (diseaseGroup) {
                    if (diseaseGroup.include) {
                        if (diseaseGroup.includeCountries.indexOf(country.code) !== -1) {
                            response.fact.forEach(function (item) {
                                if (diseaseGroup.title.toLowerCase() === item.dim.GHECAUSES.toLowerCase()
                                    && country.title.toLowerCase() === item.dim.COUNTRY.toLowerCase()) {
                                    // insert the new values
                                    var val = parseInt(item.Value);
                                    country.values[diseaseGroup.code] = val;
                                    country.weights[diseaseGroup.code] = Math.floor(country.population / val);

                                }
                            });
                        }
                    }
                });
            });


            // pass the processed data to uiController to populate map
            setTimeout(function () {
                uiController.populateMap(data.diseaseGroups, data.countries);
            });

            setTimeout(function () {
                uiController.buildStatisticsTabs(data.diseaseGroups, data.countries);
            })

            // toggle the map and spinner in reverse
            setTimeout(function () {
                uiController.showSpinner(false);
                uiController.showSubtitle(true);
                uiController.showMap(true);

                // if at least one tab was loaded then show the tabs container
                if (data.tabLoaded = true) {
                    uiController.showTabs(true);
                }
            }, 250);
        });
    },

    // Split button click
    onDropDownClick: function () {
        var dataAttr = $(this).data();

        // toggle the check marks and data-include attribute.
        var leftButton = $(this).closest(".btn-group").children("button").first();

        if (dataAttr.include) {
            $(this).find("i").toggleClass("fa-square fa-check-square");
            dataAttr.include = false;

            var checkedItemCount = $(this).closest(".dropdown-menu").find("i.fa-check-square").length;
            if (checkedItemCount === 0) {
                leftButton.children("i").toggleClass("fa-check-square", false);
                leftButton.children("i").toggleClass("fa-square", true);
                leftButton.attr("data-include", 0);
            }
        } else {
            $(this).find("i").toggleClass("fa-square fa-check-square");
            dataAttr.include = true;

            leftButton.children("i").toggleClass("fa-check-square", true);
            leftButton.children("i").toggleClass("fa-square", false);
            leftButton.attr("data-include", 1);
        }

        // update the array to reflect thechange.
        var codesArray = dataAttr.codes.split("|");
        $.each(data.diseaseGroups, function () {
            if (this.code === codesArray[0]) {
                if (codesArray[1] == "*") {
                    this.include = dataAttr.include;
                } else {
                    var countryIndex = this.includeCountries.indexOf(codesArray[1]);
                    if (dataAttr.include) {
                        if (countryIndex === -1) {
                            this.includeCountries.push(codesArray[1]);
                        }
                    } else {
                        if (countryIndex !== -1) {
                            this.includeCountries.splice(countryIndex, 1);
                        }
                    }
                }
            }
        });

        $(this).data(dataAttr);

        // load the data and render the map
        mainController.loadData();
    },

};

//Build Controller object for UI
var uiController = {

    //Add an object to store the selectors
    selectors: {
        googleMap: "#googleMap",
        navBar: "#nav-bar",
        spinner: ".spinner",
        subtitle: ".sub-title",
        tabsWrapper: ".tabs-wrapper"
    },

    //Use the API data to build the left navigation bar 
    buildNavBar: function (countries, diseases) {
        //for loop to loop through countries

        diseases.forEach(function (disease) {
            //add dropdown wrapper
            var dropDown = $("<div>")
                .addClass("btn-group dropright")
                .appendTo(uiController.selectors.navBar);

            // add left side of split button
            $("<button>")
                .attr({
                    "type": "button",
                    "class": "btn btn-info",
                    "data-codes": disease.code + "|*",
                    "data-include": "true"
                })
                .text(disease.title)
                .prepend("<i class=\"fas fa-check-square fa-pull-left\"></i>")
                .on("click", mainController.onDropDownClick)
                .appendTo(dropDown);

            //add the right side of the split button
            var rightButton = $("<button>")
                .attr({
                    "type": "button",
                    "class": "btn btn-info dropdown-toggle dropdown-toggle-split",
                    "data-toggle": "dropdown",
                    "aria-haspopup": "true",
                    "aria-expanded": "false"
                })
                .appendTo(dropDown);

            $("<span>")
                .addClass("sr-only")
                .text("Toggle Dropdown")
                .appendTo(rightButton);


            //add the div for flyout
            var dropdownContainer = $("<div>")
                .attr({
                    class: "dropdown-menu dropdown-menu-right text-left",
                    "aria-labelledby": "navbarDropdownMenuLink"
                })
                .appendTo(dropDown);

            //adding the diseases to flyout
            countries.forEach(function (country) {
                $("<a>")
                    .attr({
                        class: "dropdown-item",
                        "h-ref": "#",
                        "data-codes": disease.code + "|" + country.code,
                        "data-include": "true"
                    })
                    .text(country.title)
                    .prepend("<i class=\"fas fa-check-square fa-pull-left\"></i>")
                    .on("click", mainController.onDropDownClick)
                    .appendTo(dropdownContainer);
            });
        });
    },

    //Function for building and initiating right Statistics
    buildStatisticsTabs: function (diseaseGroups, countries) {
        data.tabLoaded = false;
        var tabsWrapper = $(uiController.selectors.tabsWrapper);

        diseaseGroups.forEach(function (disease) {
            // define the id of the anchor tag for the outer tab
            var outerTab = $("#outer-tabs");
            var outerTabAnchorId = ("#" + disease.code + "-anchor").toLowerCase();
            var outerTabContentId = ("#" + disease.code + "-tab").toLowerCase();

            // if this disease group is included, set the anchor text make it visible.
            if (disease.include) {
                $(outerTabAnchorId).text(disease.title);
                outerTab.find("ul li:has(a[href='" + outerTabContentId + "'])").removeClass("d-none");

                // loop through the countries to populatet the inner tabs
                countries.forEach(function (country) {
                    // define the ids of the tags for the inner tab
                    var tabId = ("#" + disease.code + "-tabs").toLowerCase()
                    var tabContentId = ("#" + disease.code + "-" + country.code + "-tab").toLowerCase();
                    var tab = $(tabId);
                    var tabContent = $(tabContentId);

                    // empty the content before we reload
                    tabContent.empty();

                    // if the ocuntry is included then populatet he data and make the tab visible.
                    if (disease.includeCountries.indexOf(country.code) !== -1) {
                        var list = $("<ul>")
                            .addClass("fa-ul")
                            .appendTo(tabContent);

                        $("<li>")
                            .html("<span class='fa-li'><i class='fas fa-angle-right'></i></span><strong>Population:</strong> " + country.population.toLocaleString('en'))
                            .appendTo(list);

                        $("<li>")
                            .html("<span class='fa-li'><i class='fas fa-angle-right'></i></span><strong>Total Cases:</strong> " + country.values[disease.code].toLocaleString('en'))
                            .appendTo(list);

                        $("<li>")
                            .html("<span class='fa-li'><i class='fas fa-angle-right'></i></span><strong>One Case Per:</strong> " + country.weights[disease.code].toLocaleString('en') + " People")
                            .appendTo(list);

                        tabsWrapper.find("ul li:has(a[href='" + tabContentId + "'])").removeClass("d-none");

                        // indicate that we have at least one loaded tab.
                        data.tabLoaded = true;
                    } else {
                        tabsWrapper.find("ul li:has(a[href='" + tabContentId + "'])").addClass("d-none");
                    }

                    //find the first visible inner tab and set it as active.
                    var firstVisibleTabIndex = 0;

                    tab.children("ul").children("li").each(function (i, o) {
                        if (!$(o).hasClass("d-none")) {
                            firstVisibleTabIndex = i;
                            return false;
                        }
                    });

                    tab.tabs("option", "active", firstVisibleTabIndex);
                });
            } else {
                outerTab.find("ul li:has(a[href='" + outerTabContentId + "'])").addClass("d-none");
            }

            //find the first visible outer tab and set it as active.
            var firstVisibleTabIndex = 0;

            outerTab.children("ul").children("li").each(function (i, o) {
                if (!$(o).hasClass("d-none")) {
                    firstVisibleTabIndex = i;
                    return false;
                }
            });

            outerTab.tabs("option", "active", firstVisibleTabIndex);
        });


        tabsWrapper.tabs("refresh");
    },

    //Function for mapping data to Leaflet API
    populateMap: function (diseaseGroups, countries) {
        var zoomLvl = 1.8;

        var mapProp = {
            center: new google.maps.LatLng(20, 20),
            zoom: zoomLvl,
        };
        var map = new google.maps.Map($(this.selectors.googleMap)[0], mapProp);

        var heatMaps = [];

        diseaseGroups.forEach(function (diseaseGroup) {
            if (diseaseGroup.include) {
                var heatmapData = [];

                countries.forEach(function (country) {
                    if (country.values[diseaseGroup.code]) {
                        var offsetCoord = {
                            lat: country.coord.lat + diseaseGroup.offset.lat,
                            lng: country.coord.lng + diseaseGroup.offset.lng
                        }

                        new google.maps.Marker({
                            position: offsetCoord,
                            map: map,
                            title: diseaseGroup.title + " - " + country.title
                        });

                        heatmapData.push({
                            location: new google.maps.LatLng(country.coord.lat + diseaseGroup.offset.lat, country.coord.lng + diseaseGroup.offset.lng),
                            weight: country.weights[diseaseGroup.code]
                        });
                    }
                });

                var heatmap = new google.maps.visualization.HeatmapLayer({
                    data: heatmapData,
                    map: map,
                    radius: "300",
                    gradient: diseaseGroup.gradient
                });
                heatMaps.push(heatmap);
            }
        });

        map.addListener('zoom_changed', function () {
            // 3 seconds after the center of the map has changed, pan back to the
            // marker.
            if (zoomLvl !== map.getZoom()) {
                zoomLvl = map.getZoom();
                heatMaps.forEach(function (heatmap) {
                    heatmap.set('radius', zoomLvl * 20);
                });
            }
        });
    },

    showMap: function (show) {
        $(this.selectors.googleMap).toggleClass("d-none", !show);
    },

    showSpinner: function (show) {
        $(this.selectors.spinner).toggleClass("d-none", !show);
    },

    showSubtitle: function (show) {
        $(this.selectors.subtitle).toggleClass("d-none", !show);
    },

    showTabs: function (show) {
        $(this.selectors.tabsWrapper).toggleClass("d-none", !show);
    }
};

//Build Controller object for data
var data = {

    tabLoaded: false,

    countries: [
        {
            code: "BRA",
            population: 205823665,
            coord: { lat: -14.235004, lng: -51.92528 },
            language: "Portuguese",
            title: "Brazil",
            weights: {},
            values: {}
        },
        {
            code: "CHN",
            population: 1373541278,
            coord: { lat: 35.86166, lng: 104.195397 },
            language: "Chinese",
            title: "China",
            weights: {},
            values: {}
        },
        {
            code: "IND",
            population: 1266883598,
            coord: { lat: 20.593684, lng: 78.96288 },
            language: "Hindi",
            title: "India",
            weights: {},
            values: {}
        },
        {
            code: "IDN",
            population: 258316051,
            coord: { lat: -0.789275, lng: 113.921327 },
            language: "Indonesian",
            title: "Indonesia",
            weights: {},
            values: {}
        },
        {
            code: "USA",
            population: 323995528,
            coord: { lat: 40.09024, lng: -102.712891 },
            language: "English",
            title: "United States of America",
            weights: {},
            values: {}
        }
    ],

    //Build JSON array of Disease Cause Groups/SubGroups
    diseaseGroups: [
        {
            title: "Cardiovascular Diseases",
            dimension: "GHECAUSES",
            code: "GHE110",
            include: true,
            includeCountries: ["BRA", "CHN", "IND", "IDN", "USA"],
            offset: { lat: .5, lng: .5 },
            gradient: [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 0.3)',
                'rgba(0, 191, 255, 0.4)',
                'rgba(0, 127, 255, 0.5)',
                'rgba(0, 63, 255, 0.6)',
                'rgba(0, 0, 255, 0.6)',
                'rgba(0, 0, 223, 0.7)',
                'rgba(0, 0, 191, 0.7)',
                'rgba(0, 0, 159, 0.8)',
                'rgba(0, 0, 127, 0.8)',
                'rgba(63, 0, 91, 0.9)',
                'rgba(127, 0, 63, 0.9)',
                'rgba(191, 0, 31, 1)',
                'rgba(255, 0, 0, 1)'
            ]
        },
        {
            title: "Diabetes Mellitus",
            dimension: "GHECAUSES",
            code: "GHE080",
            include: true,
            includeCountries: ["BRA", "CHN", "IND", "IDN", "USA"],
            offset: { lat: -.5, lng: .5 },
            gradient: [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 0.3)',
                'rgba(0, 191, 255, 0.4)',
                'rgba(0, 127, 255, 0.5)',
                'rgba(0, 63, 255, 0.6)',
                'rgba(0, 0, 255, 0.6)',
                'rgba(0, 0, 223, 0.7)',
                'rgba(0, 0, 191, 0.7)',
                'rgba(0, 0, 159, 0.8)',
                'rgba(0, 0, 127, 0.8)',
                'rgba(63, 0, 91, 0.9)',
                'rgba(127, 0, 63, 0.9)',
                'rgba(191, 0, 31, 1)',
                'rgba(255, 0, 0, 1)'
            ]
        },
        {
            title: "Malignant Neoplasms",
            dimension: "GHECAUSES",
            code: "GHE061",
            include: true,
            includeCountries: ["BRA", "CHN", "IND", "IDN", "USA"],
            offset: { lat: .5, lng: -.5 },
            gradient: [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 0.3)',
                'rgba(0, 191, 255, 0.4)',
                'rgba(0, 127, 255, 0.5)',
                'rgba(0, 63, 255, 0.6)',
                'rgba(0, 0, 255, 0.6)',
                'rgba(0, 0, 223, 0.7)',
                'rgba(0, 0, 191, 0.7)',
                'rgba(0, 0, 159, 0.8)',
                'rgba(0, 0, 127, 0.8)',
                'rgba(63, 0, 91, 0.9)',
                'rgba(127, 0, 63, 0.9)',
                'rgba(191, 0, 31, 1)',
                'rgba(255, 0, 0, 1)'
            ]
        },
        {
            title: "Chronic obstructive pulmonary disease",
            dimension: "GHECAUSES",
            code: "GHE118",
            include: true,
            includeCountries: ["BRA", "CHN", "IND", "IDN", "USA"],
            offset: { lat: -.5, lng: -.5 },
            gradient: [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 0.3)',
                'rgba(0, 191, 255, 0.4)',
                'rgba(0, 127, 255, 0.5)',
                'rgba(0, 63, 255, 0.6)',
                'rgba(0, 0, 255, 0.6)',
                'rgba(0, 0, 223, 0.7)',
                'rgba(0, 0, 191, 0.7)',
                'rgba(0, 0, 159, 0.8)',
                'rgba(0, 0, 127, 0.8)',
                'rgba(63, 0, 91, 0.9)',
                'rgba(127, 0, 63, 0.9)',
                'rgba(191, 0, 31, 1)',
                'rgba(255, 0, 0, 1)'
            ]
        }
    ],

};

// add jquery listener for document ready
$(document).ready(mainController.init);











