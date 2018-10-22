import './scss/main.scss'
import { extent } from 'd3-array'
import { format } from 'd3-format'

import chart from './js/chart'
const spreadsheetID = '1qmhbztaMBKatqZkT4dQQsEm_j2Xl5d9Mp3zKmmdrqy4'
const URL = `https://spreadsheets.google.com/feeds/list/${spreadsheetID}/1/public/values?alt=json`

let data

function loadData() {
  fetch(URL)
    .then(resp => resp.json())
    .then(json => {
      data = parseData(json.feed.entry)
    })
    .then(() => {
      let minMax = extent(data, function(d) {
        return +d.totaldollars
      })

      document.querySelector('.min').innerHTML =
        '$' + format(',.0f')(minMax[0]).replace(/G/, 'B')
      document.querySelector('.max').innerHTML =
        '$' + format(',.0f')(minMax[1]).replace(/G/, 'B')
      chart.init(data)
    })
}

function parseData(rawData) {
  return rawData.map(r => {
    let row = r
    let stateData = {}
    Object.keys(row).forEach(c => {
      let column = c
      if (column.includes('gsx$')) {
        stateData[column.replace('gsx$', '')] = row[column]['$t']
      }
    })
    return stateData
  })
}

loadData()
window.addEventListener('resize', chart.resize)
