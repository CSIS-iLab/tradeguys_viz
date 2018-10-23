import { select, selectAll } from 'd3-selection'
import { format } from 'd3-format'
import { scaleQuantile, scaleOrdinal, scaleLog } from 'd3-scale'
import { on, transition, duration } from 'd3-transition'
import { extent } from 'd3-array'
import tooltip from './tooltip'

const formatter = format('.3s')
const countries = ['canada', 'china', 'eu', 'mexico']
const colors = ['#9EB040', '#FE5000', '#0AA4CF', '#F2AF19', '#fff']
const margin = { top: 10, right: 5, bottom: 10, left: 5 }

const container = select('.chart')
const rows = 8
const columns = 11
const padding = 12
const modalPadding = 48

let chart,
  width,
  height,
  cellSize,
  activeState,
  borderColorScale,
  borderWidthScale,
  fillScale,
  keyFilter = countries,
  diff = []

function draw(data) {
  borderColorScale = scaleLog()
    .domain(
      extent(data, function(d) {
        return +d.totaldollars
      })
    )
    .range(['#E5E5E5', '#5E5E5E'])

  borderWidthScale = scaleLog()
    .domain(
      extent(data, function(d) {
        return +d.totaldollars
      })
    )
    .range(['1', '5'])

  fillScale = scaleOrdinal()
    .domain([...countries, 'other'])
    .range(colors)

  function drawPercents() {
    fillScale = scaleOrdinal()
      .domain([...countries, 'other'])
      .range(
        colors.map((color, i) => {
          let indices = []
          keyFilter.forEach(country => {
            indices.push([...countries, 'other'].indexOf(country))
          })
          return !indices.includes(i) ? '#fff' : color
        })
      )

    let groups = selectAll('.group')

    groups.each((g, gi, nodes) => {
      let percentObj = {}

      countries.forEach(country => {
        percentObj[country] = Array(Math.round((g[country] / 100) * 100)).fill({
          state: g.code,
          country: country
        })
      })

      let percent = []

      diff = countries.filter(i => keyFilter.indexOf(i) < 0)

      diff.forEach(c => {
        percent = percent.concat(percentObj[c])
      })

      keyFilter.forEach(c => {
        percent = percent.concat(percentObj[c])
      })

      percent = Array(100 - percent.length)
        .fill({
          state: g.code,
          country: 'other'
        })
        .concat(percent)

      let parentX = select(nodes[gi]).attr('x')
      let parentY = select(nodes[gi]).attr('y')

      let percents = select(nodes[gi]).selectAll(`.percent.${g.code}`)

      percents
        .attr('height', (cellSize - padding) / 10)
        .transition(transition().duration(1200))
        .attr('height', 0)
        .remove()

      percents = select(nodes[gi])
        .selectAll(`.percent.${g.code}`)
        .data(percent, d => d)
        .enter()
        .append('rect')
        .attr('class', function(d) {
          return `percent ${g.code} ${d.country}`
        })

        .attr('fill', function(d) {
          return fillScale(d.country)
        })
        .attr('stroke-width', '0.25px')
        .attr('stroke', '#fff')

        .attr('x', function(d, di) {
          let switchIndex = percent.findIndex(
            p => ![...diff, 'other'].includes(p.country)
          )

          switchIndex = switchIndex >= 0 ? switchIndex : null

          let reverse =
            Math.ceil((di + 1) / 10) * 10 <= Math.ceil(switchIndex / 10) * 10
              ? Math.abs(99 - di)
              : di

          let x = ((reverse % 10) * (cellSize - 2)) / 10 + parseInt(parentX, 10)
          return x + 2
        })
        .attr('y', function(d, di) {
          let y =
            (Math.ceil((di + 1) / 10) * (cellSize - 2)) / 10 +
            parseInt(parentY, 10) -
            cellSize / 10 +
            1
          return y + 2
        })
        .attr('height', 0)
        .attr('width', (cellSize - padding / 2) / 10)
        .transition(transition().duration(600))
        .attr('height', (cellSize - padding / 2) / 10)

      let label = select(nodes[gi]).selectAll(`.label.${g.code}`)

      label.remove()

      label = select(nodes[gi])
        .selectAll(`.label.${g.code}`)
        .data([g])
        .enter()
        .append('text')
        .attr('class', 'label ' + g.code)

      label
        .attr('x', function(d) {
          return (d.col - 1) * cellSize + cellSize / 2 + padding * d.col
        })
        .attr('y', function(d) {
          return (d.row - 1) * cellSize + (cellSize / 2 - 3) + padding * d.row
        })
        .style('text-anchor', 'middle')
        .text(g.code)
    })

    selectAll('.group').on('click', interactions.states.click)
  }

  function drawState(x, d) {
    select('.stateModal').remove()

    fillScale = scaleOrdinal()
      .domain([...countries, 'other'])
      .range(colors)

    let stateData = data.filter(state => state.code === d.code)
    width = drawGridMap.width()
    height = drawGridMap.width()
    let stateSize = height * 0.3
    let svg = container.selectAll('.map')

    container.selectAll('.gridmap')

    svg.append('g').attr('class', 'stateModal')

    select('.stateModal')
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#000')
      .attr('opacity', '0.3')

    select('.stateModal')
      .append('rect')
      .attr('width', width * 0.75)
      .attr('height', height * 0.5)
      .attr('x', width / 7.5)
      .attr('y', width / 7.5)
      .attr('fill', '#fff')
      .attr('stroke', '#000')
      .attr('stroke-width', '1.5px')
      .attr('paint-order', 'stroke')

    select('.stateModal')
      .append('foreignObject')
      .attr('cursor', 'pointer')
      .attr('width', width / 10)
      .attr('height', height / 20)
      .attr('x', width - width / 7.5 - padding * 2)
      .attr('y', width / 7.5 + padding)
      .append('xhtml:div')
      .attr('class', 'icon-close-lg')
      .on('click', () => {
        select('.stateModal').remove()
      })

    select('.stateModal')
      .selectAll('.stateBorder')
      .data(stateData)
      .enter()
      .append('rect')
      .attr('class', 'stateBorder')
      .attr('fill', '#fff')
      .attr('stroke', function(d) {
        return borderColorScale(d.totaldollars)
      })
      .attr('stroke-width', function(d) {
        return borderWidthScale(d.totaldollars)
      })
      .attr('x', width / 5)
      .attr('y', width / 5 + padding)
      .attr('width', stateSize - 3)
      .attr('height', stateSize - 2)

    let percentObj = {}
    countries.forEach(country => {
      percentObj[country] = Array(
        Math.round((stateData[0][country] / 100) * 100)
      ).fill({
        state: stateData[0].code,
        country: country
      })
    })

    let percent = []

    diff = countries.filter(i => keyFilter.indexOf(i) < 0)

    diff.forEach(c => {
      percent = percent.concat(percentObj[c])
    })

    keyFilter.forEach(c => {
      percent = percent.concat(percentObj[c])
    })

    percent = Array(100 - percent.length)
      .fill({
        state: stateData[0].code,
        country: 'other'
      })
      .concat(percent)

    let parentX = select('.stateBorder').attr('x')
    let parentY = select('.stateBorder').attr('y')

    let percents = select('.stateModal')
      .selectAll(`.percentModal.${stateData[0].code}`)
      .data(percent, d => d)
      .enter()
      .append('rect')
      .attr('class', function(d) {
        return `percent ${stateData[0].code} ${d.country}`
      })

      .attr('fill', function(d) {
        return fillScale(d.country)
      })

      .attr('x', function(d, di) {
        let switchIndex = percent.findIndex(
          p => ![...diff, 'other'].includes(p.country)
        )

        switchIndex = switchIndex >= 0 ? switchIndex : null

        let reverse =
          Math.ceil((di + 1) / 10) * 10 <= Math.ceil(switchIndex / 10) * 10
            ? Math.abs(99 - di)
            : di

        let x = ((reverse % 10) * (stateSize - 2)) / 10 + parseInt(parentX, 10)
        return x + 2
      })
      .attr('y', function(d, di) {
        let y =
          (Math.ceil((di + 1) / 10) * (stateSize - 2)) / 10 +
          parseInt(parentY, 10) -
          stateSize / 10 +
          1
        return y + 2
      })
      .attr('height', 0)
      .attr('width', (stateSize - modalPadding) / 10)
      .attr('height', (stateSize - modalPadding) / 10)

    let column2 = parseInt(parentX, 10) + stateSize + padding

    // select('.stateModal')
    //   .selectAll(`.modalLabel`)
    //   .data(stateData)
    //   .enter()
    //   .append('text')
    //   .attr('class', 'modalLabel')
    //   .attr('x', column2)
    //   .attr('y', parseInt(parentY, 10) - padding)

    // let details = select(`.modalLabel`)
    //   .selectAll('tspan')
    //   .data(stateData)
    //   .enter()
    //
    // details
    //   .append('tspan')
    //   .text(stateData[0].state)
    //   .attr('dy', '1.5em')
    //   .attr('x', column2)
    //
    // details
    //   .append('tspan')
    //   .text(
    //     `$${formatter(stateData[0].totaldollars).replace(/G/, 'B')} Total Trade`
    //   )
    //   .attr('dy', '1.5em')
    //   .attr('x', column2)

    // countries.forEach(c => {
    // details
    //   .append('tspan')
    //   .text(
    //     `${c.charAt(0).toUpperCase() + c.slice(1)}: ${formatter(
    //       stateData[0][c]
    //     )}%`
    //   )
    //   .attr('dy', '1.5em')
    //   .attr('x', column2)
    // })

    //   details
    //     .append('tspan')
    //     .text(`${formatter(stateData[0].grandtotal)}% of Total Trade`)
    //     .attr('dy', '1.5em')
    //     .attr('x', column2)

    select('.stateModal')
      .append('foreignObject')
      .attr('x', column2)
      .attr('y', parseInt(parentY, 10) - padding)
      .attr('width', width - stateSize)
      .append('xhtml:div').html(`<div class="modal-heading">
                ${d.state}
              </div>
              <div class="modal-body">
                $${formatter(d.totaldollars).replace(/G/, 'B')} Total Trade
              </div>
              <ul class="modal-list">
              ${countries
                .map(
                  c =>
                    `<li class="${c}">${c.charAt(0).toUpperCase() +
                      c.slice(1)}: ${
                      stateData[0][c] ? formatter(stateData[0][c]) : 0
                    }%</li> `
                )
                .join('')}

              </ul> <div class="modal-footer">
                  ${formatter(d.grandtotal)}% of Total Trade
                </div>`)
  }

  function drawGridMap() {
    width = drawGridMap.width()
    height = drawGridMap.width() * 0.8
    // calculate cellSize based on dimensions of svg
    cellSize = calcCellSize(
      width - columns * padding - margin.right - margin.left,
      height - columns * padding - margin.top - margin.bottom,
      columns,
      rows
    )

    // generate grid data with specified number of columns and rows
    let gridData = gridGraph(columns, rows, cellSize)

    let svgNodes = document.querySelectorAll('.map').length
    let svg = svgNodes
      ? container.selectAll('.map')
      : select('.chart').append('svg')

    svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .attr('class', 'map')
      .attr(
        'viewBox',
        '0 0 ' +
          (width + margin.left + margin.right) +
          ' ' +
          (height + margin.top + margin.bottom)
      )

    selectAll('input').on('click', interactions.key.click)

    let gridMapNodes = document.querySelectorAll('.gridmap').length
    let gridMap = gridMapNodes
      ? container.selectAll('.gridmap')
      : svg.append('g').attr('class', 'gridmap')
    // .attr(
    //   'transform',
    //   'translate(' + margin.left + ',' + margin.top + ')'
    // )

    let groupNodes = document.querySelectorAll('.group').length
    let groups = groupNodes
      ? gridMap.selectAll('.group')
      : gridMap
          .selectAll('.group')
          .data(data)
          .enter()
          .append('g')
          .attr('class', function(d) {
            return 'group ' + d.code
          })

    groups
      .data(data)
      .attr('x', function(d) {
        return (d.col - 1) * cellSize + padding * d.col
      })
      .attr('y', function(d) {
        return (d.row - 1) * cellSize + padding * d.row
      })

    let breakpoint = getComputedStyle(document.body).getPropertyValue(
      '--breakpoint'
    )

    if (breakpoint !== '"xsmall"' && breakpoint !== '"small"') {
      gridMap
        .selectAll('.group')
        .on('mouseover', interactions.states.mouseover)
        .on('mouseleave', interactions.states.mouseleave)
    }

    groups.each((g, gi, nodes) => {
      let stateNode = document.querySelector(`.state.${g.code}`)
      let state = stateNode
        ? select(nodes[gi]).selectAll(`.state.${g.code}`)
        : select(nodes[gi])
            .selectAll('.state')
            .data([g])
            .enter()
            .append('rect')
            .attr('class', function(d) {
              return 'state ' + d.code
            })

      state
        .attr('fill', '#fff')
        .attr('stroke', function(d) {
          return borderColorScale(d.totaldollars)
        })
        .attr('stroke-width', function(d) {
          return borderWidthScale(d.totaldollars)
        })
        .attr('x', function(d) {
          return (d.col - 1) * cellSize + padding * d.col
        })
        .attr('y', function(d) {
          return (d.row - 1) * cellSize + padding * d.row
        })
        .attr('width', cellSize + 2)
        .attr('height', cellSize + 2)
    })
  }

  // function that generates a nested array for square grid
  function gridGraph(ncol, nrow, cellsize) {
    let gridData = []
    let xpos = 1 // starting xpos and ypos at 1 so the stroke will show when we make the grid below
    let ypos = 1

    // calculate width and height of the cell based on width and height of the canvas
    let cellSize = cellsize

    // iterate for rows
    for (let row = 0; row < nrow; row++) {
      gridData.push([])

      // iterate for cells/columns inside each row
      for (let col = 0; col < ncol; col++) {
        gridData[row].push({
          x: xpos,
          y: ypos,
          width: cellSize,
          height: cellSize
        })

        // increment x position (moving over by 50)
        xpos += cellSize
      }

      // reset x position after a row is complete
      xpos = 1
      // increment y position (moving down by 50)
      ypos += cellSize
    }
    return gridData
  }

  // function to calculate grid cell size based on width and height of svg
  function calcCellSize(w, h, ncol, nrow) {
    // leave tiny space in margins
    let gridWidth = w - 2
    let gridHeight = h - 2
    let cellSize

    // calculate size of cells in columns across
    let colWidth = Math.floor(gridWidth / ncol)
    // calculate size of cells in rows down
    let rowWidth = Math.floor(gridHeight / nrow)

    // take the smaller of the calculated cell sizes
    if (colWidth <= rowWidth) {
      cellSize = colWidth
    } else {
      cellSize = rowWidth
    }
    return cellSize
  }

  drawGridMap.width = function(...args) {
    if (!args.length) return width
    width = args[0] - margin.left - margin.right
  }

  drawGridMap.height = function(...args) {
    if (!args.length) return height
    height = args[0] - margin.top - margin.bottom
  }

  const interactions = {
    key: {
      click(d) {
        select('.stateModal').remove()
        let excluded = ['legend-label', 'active', 'other', 'all']

        let classList = this.classList

        let isAll = classList.contains('all')
        let isActive = this.checked
        let isAllSelected = select('input.all').node().checked
        let country = [...classList].find(c => !excluded.includes(c))
        let all = select('input.all').node()

        if (country && keyFilter.includes(country)) {
          keyFilter = keyFilter.filter(c => c !== country)
          all.checked = false
        } else if (country) {
          keyFilter.unshift(country)
        }

        if (keyFilter.length !== 4) {
          all.checked = false
        } else {
          select('input.all').node().checked = true
        }

        if (isAll && isActive) {
          keyFilter = countries
          selectAll('input').each((g, gi, nodes) => {
            nodes[gi].checked = true
          })
        } else if (isAll && !isActive) {
          keyFilter = []
          selectAll('input').each((g, gi, nodes) => {
            nodes[gi].checked = false
          })
        }
        container.call(chart.drawPercents)
      }
    },

    states: {
      mouseover(d) {
        interactions.states.showTooltip(d)
      },
      mouseleave(d) {
        tooltip.hide()
      },
      click(d) {
        tooltip.hide()
        activeState = d
        container.call(chart.drawState, d)
      },
      showTooltip(d) {
        let tooltipContent = `
        <p class="tooltip-heading">
          ${d.state}
        </p>
        <p class="tooltip-body">
          $${formatter(d.totaldollars).replace(/G/, 'B')} Total Trade
        </p>
        <ul class="tooltip-list">
        ${countries
          .map(
            c =>
              `<li class="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}: ${
                d[c] ? formatter(d[c]) : 0
              }%</li>`
          )
          .join('')}

        </ul>
        <p class="tooltip-footer">
          ${formatter(d.grandtotal)}% of Total Trade
        </p>
        `
        tooltip.show(tooltipContent)
      }
    }
  }

  return { drawGridMap, drawPercents, drawState, interactions }
}

function init(data) {
  container.datum(data)
  chart = draw(data)
  resize()
}

function resize() {
  if (chart) {
    const parentWidth = container.node().offsetWidth
    chart.drawGridMap.width(parentWidth)
    chart.drawGridMap.height(parentWidth) * 0.9
    container.call(chart.drawGridMap)
    container.call(chart.drawPercents)

    if (select('.stateModal').size()) {
      select('.stateModal').remove()
      chart.interactions.states.click(activeState)
    }
  }
}

export default { init, draw, resize }
