"use strict";

function _toConsumableArray(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }
    return arr2;
  } else {
    return Array.from(arr);
  }
}

$(document).ready(function() {
  $(".copyright-year").text(new Date().getFullYear());
  var spreadsheetID = "1z5iTKdahMJpEaKBS4Mhw_QEGsAEjVARkP2tNO7E-p80";
  var URL =
    "https://spreadsheets.google.com/feeds/list/" +
    spreadsheetID +
    "/1/public/values?alt=json";

  var sheet = void 0,
    table = void 0,
    page = void 0,
    display = void 0,
    total = void 0;

  fetch(URL)
    .then(function(resp) {
      return resp.json();
    })
    .then(function(json) {
      return new Promise(resolve => {
        let sheet = {
          rows: [],
          columns: [],
          links: []
        };

        json.feed.entry.filter((row, i) => {
          let newRow = {};
          Object.keys(row).forEach(column => {
            if (column.includes("gsx$")) {
              if (i === 0) {
                if (column.indexOf("link") < 0) {
                  $("thead tr").append(
                    `<th>${column.replace("gsx$", "")}</th>`
                  );

                  if (
                    !Object.values(sheet.columns.map(c => c.data)).includes(
                      column
                    )
                  ) {
                    sheet.columns.push({ data: column, defaultContent: "" });
                  }
                }
              } else {
                if (column.indexOf("link") < 0) {
                  if (column.indexOf("description") > -1) {
                    var link =
                      "<a href=" +
                      row["gsx$linktodocument"]["$t"] +
                      ' target="_blank">' +
                      "link to document " +
                      externalLink +
                      "</a>";

                    newRow[column] = "<p>" + row[column]["$t"] + "</p>" + link;
                  } else {
                    newRow[column] = row[column]["$t"];
                  }
                }
              }
            }
          });

          if (i !== 0) {
            sheet.rows.push(newRow);
          }

          if (sheet.rows.length === json.feed.entry.length - 1) {
            resolve(sheet);
          }
        });
      });
    })
    .then(function(sheet) {
      $("#proposals").DataTable({
        data: sheet.rows,
        columns: [
          {
            className: "details-control",
            orderable: false,
            data: null,
            defaultContent: ""
          }
        ].concat(sheet.columns),
        fixedHeader: true,
        responsive: { details: false },
        paging: false,
        order: [[1, "desc"]],
        columnDefs: [
          {
            targets: Array(5)
              .fill({})
              .map(function(v, i) {
                return i;
              })
              .filter(function(v, i) {
                return i !== 1;
              }),
            orderable: false
          },
          { targets: [5], visible: false }
        ],

        initComplete: function initComplete() {
          $(".loader").hide();
          table = this.api();

          page = table.page.info().page + 1;
          display = table.page.info().recordsDisplay + 1;
          total = table.page.info().recordsTotal + 1;

          var memberDatalist = $(
            '<select class="companies"></select>'
          ).prependTo(".dataTables_filter");

          var memberInput =
            '<input id="members" type="search" data-list-filter="^" data-wslist="companies" class="filter companies" list="companies">';

          memberDatalist
            .wrap("<div></div>")
            .before('<label for="members">Member:</label>')
            .before(memberInput);

          var typeDatalist = $('<select class="types"></select>').prependTo(
            ".dataTables_filter"
          );

          var typeInput =
            '<input for="types" type="search" data-list-filter="^" data-wslist="types" class="filter types" list="types">';

          typeDatalist
            .wrap("<div></div>")
            .before('<label for="types">Type:</label>')
            .before(typeInput);

          $("select.companies").wrap('<datalist id="companies"></datalist>');
          $("select.types").wrap('<datalist id="types"></datalist>');

          var members = new Set(
            sheet.rows
              .map(function(row) {
                return row["gsx$member"];
              })
              .filter(function(member) {
                return member;
              })
          );

          Array.from(members).forEach(function(member) {
            $(memberDatalist).append(
              '<option value="' + member + '"></option>'
            );
          });

          var types = new Set(
            sheet.rows
              .map(function(row) {
                return row["gsx$type"];
              })
              .filter(function(type) {
                return type;
              })
          );
          Array.from(types).forEach(function(type) {
            $(typeDatalist).append('<option value="' + type + '"></option>');
          });

          // if (window.webshims) {
          //   webshims.setOptions("forms", {
          //     customDatalist: true
          //   });
          //   webshims.polyfill("forms");
          // }

          $("input.companies").on("input", function() {
            var companyVal = $.fn.dataTable.util.escapeRegex($(this).val());
            if (companyVal.trim()) {
              searchTargets("company", companyVal);
            }
          });

          $("input.types").on("input", function() {
            var individualVal = $.fn.dataTable.util.escapeRegex($(this).val());
            if (individualVal.trim()) {
              searchTargets("individual", individualVal);
            }
          });

          var filterColumns = [2, 3].map(function(c) {
            return table.column(c);
          });

          var searchField = document.querySelector(
            "label input[type='search']"
          );

          $(searchField).after(
            '<button class="reset" aria-label="Reset Form">reset</button>'
          );

          $(".reset").on("click", function() {
            []
              .concat(_toConsumableArray(filterColumns), [table.column(12)])
              .forEach(function(fc) {
                return fc.search("", true, false).draw();
              });

            searchField.value = "";
            []
              .concat(_toConsumableArray(document.querySelectorAll(".filter")))
              .forEach(function(f) {
                return (f.value = "");
              });
            rerender();
          });

          searchField.addEventListener("keydown", function() {
            rerender();
          });

          $("tr").hover(function() {
            this.classList.toggle("hover");
          });

          $("#proposals tbody").on("click", "td.details-control", function() {
            var tr = $(this).closest("tr");
            var row = table.row(tr);

            if (row.child.isShown()) {
              row.child.hide();
              tr.removeClass("shown");
            } else {
              row.child(format(row.data())).show();

              $(row.child()[0])
                .find("td")
                .attr("colspan", "5")
                .attr("scope", "colgroup");

              $(row.child()[0])
                .find("td")
                .before("<td>&nbsp;</td>");
              tr.addClass("shown");
            }
          });

          $("#proposals_filter").after(
            '<div class="dataTables_info" id="proposals_info" role="status" aria-live="polite"></div>'
          );
        }
      });
    });

  function rerender() {
    var results = table.page.info().end;
    $(".dataTables_info").text(function(i, d) {
      return (
        "Showing " +
        (results + 1 === total ? total + " proposals" : results) +
        " " +
        (results + 1 === total ? "" : "of " + total + " proposals")
      );
    });
    table.responsive.recalc();
  }

  function searchTargets(target, value) {
    if (target === "company") {
      $("input.types").val("");
    } else {
      $("input.companies").val("");
    }

    table
      .column(12)
      .search("(" + value + "*)", true, false)
      .draw();

    rerender();
  }

  function makeFilter(table, array) {
    array.forEach(function(c) {
      var label = c.header().textContent;
      var labelSlug = label
        .toLowerCase()
        .replace(/[!@#\$%\^\&*\)\(+=.,_-]/g, "")
        .replace(/\s/g, "_");

      var datalist = $(
        '<datalist data-list-filter="^" id="datalist_' +
          labelSlug +
          '"></datalist>'
      ).prependTo(".dataTables_filter");

      var input =
        '<input id="' +
        labelSlug +
        '" data-list-focus="true" type="search" class="filter ' +
        labelSlug +
        '" list="datalist_' +
        labelSlug +
        '">';

      datalist
        .wrap("<div></div>")
        .before('<label for="' + labelSlug + '">' + label + ":</label>")
        .before(input);

      $("." + labelSlug).on("change", function() {
        userInput(this);
      });
      $("." + labelSlug).on("input", function() {
        userInput(this);
      });

      function userInput(input) {
        var val = $.fn.dataTable.util.escapeRegex($(input).val());
        c.search(val ? "" + val + "" : "", true, false).draw();

        $(".view-all")
          .removeClass("down")
          .addClass("up")
          .find("span")
          .text("Hide");

        // $(input).blur();
        $("table").removeClass("hide");
        $(".dataTables_info").removeClass("hide");
        rerender();
      }

      $(".sorting_asc").on("click", function() {
        rerender();
      });

      var newArray = [].concat.apply(
        [],
        c.data().map(function(d) {
          return d
            .replace(/(\<ul\>|<\/ul\>)/g, "")
            .split("</li><li>")
            .map(function(d) {
              return d.replace(/(\<li\>|<\/li\>)/g, "");
            });
        })
      );

      $([].concat(_toConsumableArray(new Set(newArray))))
        .sort()
        .each(function(j, d) {
          datalist.append('<option value="' + d + '">' + d + "</option>");
        });

      $(datalist)
        .children("option")
        .wrapAll("<select></select>");
    });
  }

  function format(d) {
    return d["gsx$longdescription"];
  }
});
var externalLink =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15"><path d="M7.49,0V1.67H1.68V13.32H13.32V7.52H15v5.72a1.76,1.76,0,0,1-.42,1.19,1.64,1.64,0,0,1-1.13.56H1.74a1.67,1.67,0,0,1-1.16-.41A1.61,1.61,0,0,1,0,13.48v-.27C0,9.4,0,5.6,0,1.8A1.83,1.83,0,0,1,.58.4a1.53,1.53,0,0,1,1-.39h6Z" transform="translate(0 0)"/><path d="M9.17,1.67V0H15V5.84H13.34v-3h0c-.05.05-.11.1-.16.16l-.45.46-1.3,1.29-.84.84-.89.9-.88.87-.89.9c-.28.29-.57.57-.86.86L6.16,10l-.88.87a1.83,1.83,0,0,1-.13.16L4,9.86l0,0L5.36,8.47l.95-1,.75-.75,1-1L8.87,5l1-.94.85-.86.92-.91.56-.58Z" transform="translate(0 0)"/></svg>';
