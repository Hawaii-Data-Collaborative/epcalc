<script>
  
  import { scaleLinear } from "d3-scale";
  // import { Date } from "d3-time"
  import Chart from './Chart.svelte';
  import { onMount } from 'svelte';
  import { selectAll } from 'd3-selection'
  import { drag } from 'd3-drag';
  import queryString from "query-string";
  import Checkbox from './Checkbox.svelte';
  import Arrow from './Arrow.svelte';
  import InterventionLine from './InterventionLine.svelte';
  import { format } from 'd3-format'
  import { event } from 'd3-selection'
  import katex from 'katex';
  import { differenceInCalendarDays, addDays, addMonths, startOfDay, startOfMonth, endOfMonth, format as dateFormat, getDaysInMonth, isValid } from 'date-fns'
  import _ from 'lodash'
  import { travelerData2019 } from './constants'
  import { getScenarios } from './scenarios'

  const showTravelDynamics = window.location.search.indexOf('showTravel=false') === -1
  const showRtControls = window.location.search.indexOf('showRtControls=false') === -1
  const useSlider = window.location.search.indexOf('r0=slider') > -1
  const allowDownload = window.location.search.indexOf('csv=false') === -1

  const legendheight = 67 
  const startDate = new Date('2020-03-06T00:00')
  const may31 = new Date('2020-05-31T00:00')
  let showControls = false
  
  const { bestCase, worstCase } = getScenarios(startDate)

  function range(n){
    return Array(n).fill().map((_, i) => i);
  }

  function formatNumber(num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
  }

  function getTravelLineLabel(date) {
    try {
      return dateFormat(date, 'M/d') + ': resume travel'
    } catch(err) {
      return '[invalid date]'
    }
  }

  var sum = function(arr, bools){
    var x = 0
    for (var i = 0; i < arr.length; i++) {
      x = x + arr[i]*(bools[i] ? 1 : 0)
    }
    return x
  }

  var Integrators = {
    Euler    : [[1]],
    Midpoint : [[.5,.5],[0, 1]],
    Heun     : [[1, 1],[.5,.5]],
    Ralston  : [[2/3,2/3],[.25,.75]],
    K3       : [[.5,.5],[1,-1,2],[1/6,2/3,1/6]],
    SSP33    : [[1,1],[.5,.25,.25],[1/6,1/6,2/3]],
    SSP43    : [[.5,.5],[1,.5,.5],[.5,1/6,1/6,1/6],[1/6,1/6,1/6,1/2]],
    RK4      : [[.5,.5],[.5,0,.5],[1,0,0,1],[1/6,1/3,1/3,1/6]],
    RK38     : [[1/3,1/3],[2/3,-1/3,1],[1,1,-1,1],[1/8,3/8,3/8,1/8]]
  };

  // f is a func of time t and state y
  // y is the initial state, t is the time, h is the timestep
  // updated y is returned.
  var integrate=(m,f,y,t,h)=>{
    for (var k=[],ki=0; ki<m.length; ki++) {
      var _y=y.slice(), dt=ki?((m[ki-1][0])*h):0;
      for (var l=0; l<_y.length; l++) for (var j=1; j<=ki; j++) _y[l]=_y[l]+h*(m[ki-1][j])*(k[ki-1][l]);
      k[ki]=f(t+dt,_y,dt); 
    }
    for (var r=y.slice(),l=0; l<_y.length; l++) for (var j=0; j<k.length; j++) r[l]=r[l]+h*(k[j][l])*(m[ki-1][j]);
    return r;
  }


  $: Time_to_death     = 12.5 //32
  $: logN              = Math.log(1415872)
  $: N                 = Math.exp(logN)
  $: I0                = 10 //1
  $: R0                = 2.5 //2.2
  $: D_incbation       = 4.1 //5.2       
  $: D_infectious      = 8 //2.9 
  $: D_recovery_mild   = 11 //(14 - 2.9)  
  $: D_recovery_severe = 13 //(31.5 - 2.9)
  $: D_hospital_lag    = 6 //5
  $: D_death           = 4.5 //Time_to_death - D_infectious 
  $: CFR               = 0.059 //0.005 //0.02  
  $: InterventionTime  = 100  
  $: OMInterventionAmt = 2/3
  $: InterventionAmt   = 1 - OMInterventionAmt
  $: Time              = 220
  $: Xmax              = 110000
  $: dt                = 2
  $: P_SEVERE          = 0.12 //0.045 //0.2
  $: duration          = 7*12*1e10

  $: P_travel = 0
  $: P_travelersinfected = 0
  $: D_travel = Date.now() > may31.valueOf() ? new Date() : may31
  $: travelStart = differenceInCalendarDays(D_travel, startDate)

  $: rtLevel0 = 0    //Rt=2.5
  $: rtLevel1 = 0.28 //Rt=1.8
  $: rtLevel2 = 0.52 //Rt=1.2
  $: rtLevel3 = 0.60 //Rt=1.0
  $: rtLevel4 = 0.66 //Rt=0.85
  $: rtOptions = [
    { om: rtLevel0, amount: (R0*(1-rtLevel0)).toFixed(2), decrease: (100*(1-(1-rtLevel0))).toFixed(2) },
    { om: rtLevel1, amount: (R0*(1-rtLevel1)).toFixed(2), decrease: (100*(1-(1-rtLevel1))).toFixed(2) },
    { om: rtLevel2, amount: (R0*(1-rtLevel2)).toFixed(2), decrease: (100*(1-(1-rtLevel2))).toFixed(2) },
    { om: rtLevel3, amount: (R0*(1-rtLevel3)).toFixed(2), decrease: (100*(1-(1-rtLevel3))).toFixed(2) },
    { om: rtLevel4, amount: (R0*(1-rtLevel4)).toFixed(2), decrease: (100*(1-(1-rtLevel4))).toFixed(2) },
  ]
  
  $: staticLines = [
    {
      time: differenceInCalendarDays(startDate, startDate), 
      amount: R0 / R0, // Rt=R0
      label: '3/6: First case in Hawaii'
    },
    {
      time: differenceInCalendarDays(new Date('2020-03-16T00:00'), startDate), 
      amount: 2.45 / R0, // Rt 2.45
      label: '3/16: Spring break'
    },
    {
      time: differenceInCalendarDays(new Date('2020-03-18T00:00'), startDate), 
      amount: 2.4 / R0, // Rt 2.4
      label: '3/18: Restaurants close'
    },
    {
      time: differenceInCalendarDays(new Date('2020-03-26T00:00'), startDate), 
      amount: 1.8 / R0, // Rt 1.8
      label: '3/26: Stay home order'
    },
    {
      time: differenceInCalendarDays(new Date('2020-04-01T00:00'), startDate), 
      amount: 1.2 / R0, // Rt 1.2
      label: '4/1: Interisland ban'
    },
    {
      time: differenceInCalendarDays(new Date('2020-04-14T00:00'), startDate), 
      amount: 1.0 / R0, // Rt 1.0
      label: '4/14: Widespread mask use'
    },
    {
      time: differenceInCalendarDays(new Date('2020-04-23T00:00'), startDate), 
      amount: 0.95 / R0, // Rt 0.95
      label: '4/23: More strict mask use'
    },
    {
      time: differenceInCalendarDays(new Date('2020-05-01T00:00'), startDate), 
      amount: 0.9 / R0, // Rt 0.9
      label: '5/1: Heat/humidity effects'
    },
    // {
    //   time: differenceInCalendarDays(new Date('2020-05-31'), startDate), 
    //   amount: 1.2 / R0, // Rt 1.2
    //   label: '5/31: Potential phased reopening'
    // }
  ]

  $: travelLine = {
    time: differenceInCalendarDays(D_travel, startDate), 
    amount: null,
    label: getTravelLineLabel(D_travel)
  }

  $: interventionLines = [{
    time: differenceInCalendarDays(startOfDay(endOfMonth(new Date())), startDate),
    amount: 1.2 / R0,
    om: 0.52,
    index: 0,
    rtIndex: 2,
    canDrag: false,
    label: '5/31: Potential phased reopening'
  }]

  $: firstLine = interventionLines[0]
  $: activeIndex = 0

  $: sortedInterventionLines = _.sortBy([...staticLines, ...interventionLines], 'time')

  $: state = location.protocol + '//' + location.host + location.pathname + "?" + queryString.stringify({"Time_to_death":Time_to_death,
               "logN":logN,
               "I0":I0,
               "R0":R0,
               "D_incbation":D_incbation,
               "D_infectious":D_infectious,
               "D_recovery_mild":D_recovery_mild,
               "D_recovery_severe":D_recovery_severe,
               "CFR":CFR,
               "InterventionTime":InterventionTime,
               "InterventionAmt":InterventionAmt,
               "D_hospital_lag":D_hospital_lag,
               "P_SEVERE": P_SEVERE})

let initialState = null
function serializeState(state) {
  const json = JSON.stringify(state || { 
    Time_to_death, logN, N, I0, R0, D_incbation, D_infectious, D_recovery_mild, 
    D_recovery_severe, D_hospital_lag, D_death, CFR, InterventionTime, OMInterventionAmt, 
    InterventionAmt, Time, Xmax, dt, P_SEVERE, duration, interventionLines,
    rtLevel0, rtLevel1, rtLevel2, rtLevel3, rtLevel4, rtOptions,
    P_travel, P_travelersinfected, D_travel
  })

  console.log(json)
  return json
}
function setState(data) {
  if (!(data.logN === undefined)) {logN = data.logN}
  if (!(data.I0 === undefined)) {I0 = parseFloat(data.I0)}
  if (!(data.R0 === undefined)) {R0 = parseFloat(data.R0)}
  if (!(data.D_incbation === undefined)) {D_incbation = parseFloat(data.D_incbation)}
  if (!(data.D_infectious === undefined)) {D_infectious = parseFloat(data.D_infectious)}
  if (!(data.D_recovery_mild === undefined)) {D_recovery_mild = parseFloat(data.D_recovery_mild)}
  if (!(data.D_recovery_severe === undefined)) {D_recovery_severe = parseFloat(data.D_recovery_severe)}
  if (!(data.CFR === undefined)) {CFR = parseFloat(data.CFR)}
  if (!(data.InterventionTime === undefined)) {InterventionTime = parseFloat(data.InterventionTime)}
  if (!(data.InterventionAmt === undefined)) {InterventionAmt = parseFloat(data.InterventionAmt)}
  if (!(data.D_hospital_lag === undefined)) {D_hospital_lag = parseFloat(data.D_hospital_lag)}
  if (!(data.P_SEVERE === undefined)) {P_SEVERE = parseFloat(data.P_SEVERE)}
  if (!(data.Time_to_death === undefined)) {Time_to_death = parseFloat(data.Time_to_death)}
  
  if (!(data.dt === undefined)) {dt = data.dt}
  
  if (!(data.P_travel === undefined)) {P_travel = data.P_travel}
  if (!(data.P_travelersinfected === undefined)) {P_travelersinfected = data.P_travelersinfected}
  if (!(data.D_travel === undefined)) {D_travel = new Date(data.D_travel)}
  
  if (!(data.rtLevel0 === undefined)) {rtLevel0 = data.rtLevel0}
  if (!(data.rtLevel1 === undefined)) {rtLevel1 = data.rtLevel1}
  if (!(data.rtLevel2 === undefined)) {rtLevel2 = data.rtLevel2}
  if (!(data.rtLevel3 === undefined)) {rtLevel3 = data.rtLevel3}
  if (!(data.rtLevel4 === undefined)) {rtLevel4 = data.rtLevel4}
  if (!(data.rtOptions === undefined)) {rtOptions = data.rtOptions}
  
  // Make sure the changes are flushed before updating interventionLines
  setTimeout(() => {
    if (!(data.interventionLines === undefined)) {interventionLines = data.interventionLines}
  }, 150)
}
function setInitialState() {
  initialState = serializeState()
}
function getInitialState() {
  return initialState === null ? null : JSON.parse(initialState)
}

// dt, N, I0, R0, D_incbation, D_infectious, D_recovery_mild, D_hospital_lag, D_recovery_severe, D_death, P_SEVERE, CFR, InterventionTime, InterventionAmt, duration

  function get_solution(dt, N, I0, R0, D_incbation, D_infectious, D_recovery_mild, D_hospital_lag, D_recovery_severe, D_death, P_SEVERE, CFR, interventionLines, duration, travelStart, P_travel, P_travelersinfected) {
    var interpolation_steps = 40
    var steps = 110*interpolation_steps
    var dt = dt/interpolation_steps
    var sample_step = interpolation_steps

    var method = Integrators["RK4"]

    var currentInterventionLine = interventionLines[0]
    var currentInterventionTime = currentInterventionLine.time
    var currentInterventionAmt = currentInterventionLine.amount

    function f(t, x){

      // SEIR ODE
      if (t > currentInterventionTime && t < currentInterventionTime + duration){
        var beta = currentInterventionAmt*R0 / D_infectious
      } else if (t > currentInterventionTime + duration) {
        var beta = 0.5 * R0 / D_infectious
      } else {
        var beta = R0 / D_infectious
      }
      var a     = 1/D_incbation
      var gamma = 1/D_infectious

      function getITravelers(){
        if (t < travelStart) {
          return 0
        } 
        
        var date = addDays(startDate, t)
        var month = date.getMonth()
        // var monthlyTravelers = travelerData2019[month]
        // var dailyTravelersTypical = monthlyTravelers / getDaysInMonth(date)
        var dailyTravelersTypical = 30000
        var dailyTravelersActual = dailyTravelersTypical * P_travel
        var dailyTravelersInfected = dailyTravelersActual * P_travelersinfected
        return dailyTravelersInfected / (N + dailyTravelersActual)
      }

      var S        = x[0] // Susectable
      var E        = x[1] // Exposed
      var I        = x[2] // Infectious 
      var Mild     = x[3] // Recovering (Mild)     
      var Severe   = x[4] // Recovering (Severe at home)
      var Severe_H = x[5] // Recovering (Severe in hospital)
      var Fatal    = x[6] // Recovering (Fatal)
      var R_Mild   = x[7] // Recovered
      var R_Severe = x[8] // Recovered
      var R_Fatal  = x[9] // Dead

      var p_severe = P_SEVERE
      var p_fatal  = CFR
      var p_mild   = 1 - P_SEVERE - CFR

      var I_travelers = getITravelers()
      var I_combined  = I + I_travelers

      // var dS        = -beta*I*S
      var dS        = -beta*I_combined*S/N
      var dE        =  beta*I_combined*S/N - a*E
      var dI        =  a*E - gamma*I
      var dMild     =  p_mild*gamma*I   - (1/D_recovery_mild)*Mild
      var dSevere   =  p_severe*gamma*I - (1/D_hospital_lag)*Severe
      var dSevere_H =  (1/D_hospital_lag)*Severe - (1/D_recovery_severe)*Severe_H
      var dFatal    =  p_fatal*gamma*I  - (1/D_death)*Fatal
      var dR_Mild   =  (1/D_recovery_mild)*Mild
      var dR_Severe =  (1/D_recovery_severe)*Severe_H
      var dR_Fatal  =  (1/D_death)*Fatal

      //      0   1   2   3      4        5          6       7        8          9
      return [dS, dE, dI, dMild, dSevere, dSevere_H, dFatal, dR_Mild, dR_Severe, dR_Fatal]
    }

    var v = [N - I0, 0, I0, 0, 0, 0, 0, 0, 0, 0]
    var t = 0

    var P  = []
    var TI = []
    var Iters = []
    var CSVIters = []
    while (steps--) { 
      if ((steps+1) % (sample_step) == 0) {
            //    Dead   Hospital          Recovered        Infectious   Exposed
        P.push([ v[9], (v[5]+v[6]),  (v[7] + v[8]), v[2],    v[1] ])
        Iters.push(v)
        CSVIters.push([...v, t])
        TI.push((1-v[0]))
        // console.log((v[0] + v[1] + v[2] + v[3] + v[4] + v[5] + v[6] + v[7] + v[8] + v[9]))
        // console.log(v[0] , v[1] , v[2] , v[3] , v[4] , v[5] , v[6] , v[7] , v[8] , v[9])
      }
      v =integrate(method,f,v,t,dt); 
      t+=dt

      var nextLine = interventionLines[interventionLines.indexOf(currentInterventionLine)+1]
      if (nextLine && t > nextLine.time) {
        currentInterventionLine = nextLine
        currentInterventionTime = currentInterventionLine.time
        currentInterventionAmt = currentInterventionLine.amount
      }
    }
    return {"P": P, 
            "deaths": v[6], 
            "total": 1-v[0],
            "total_infected": TI,
            "Iters":Iters,
            "CSVIters": CSVIters,
            "dIters": f}
  }

  function max(P, checked) {
    return P.reduce((max, b) => Math.max(max, sum(b, checked) ), sum(P[0], checked) )
  }

  $: Sol            = get_solution(dt, N, I0, R0, D_incbation, D_infectious, D_recovery_mild, D_hospital_lag, D_recovery_severe, D_death, P_SEVERE, CFR, sortedInterventionLines, duration, travelStart, P_travel, P_travelersinfected)
  $: P              = Sol["P"].slice(0,100)
  $: timestep       = dt
  $: tmax           = dt*100
  $: deaths         = Sol["deaths"]
  $: total          = Sol["total"]
  $: total_infected = Sol["total_infected"].slice(0,100)
  $: Iters          = Sol["Iters"]
  $: CSVIters       = Sol["CSVIters"]
  $: dIters         = Sol["dIters"]
  $: Pmax           = max(P, checked)
  $: lock           = false

  const onDownloadCsvClick = () => {
    try {
      const data = CSVIters.map(iter => ({
        Date: dateFormat(addDays(startDate, iter[10]), 'M/d/yyyy'),
        Susceptible:  formatNumber(Math.round(iter[0])),
        Exposed:      formatNumber(Math.round(iter[1])),
        Infectious:   formatNumber(Math.round(iter[2])),
        Removed:      formatNumber(Math.round((1-iter[0]-iter[1]-iter[2]))),
        Recovered:    formatNumber(Math.round((iter[7]+iter[8]))),
        Hospitalized: formatNumber(Math.round((iter[5]+iter[6]))),
        Fatalities:   formatNumber(Math.round(iter[9]))
      }))

      const csv = window.json2csv.parse(data);
      
      // console.log(csv)

      var a = document.createElement('a')
      a.style.position = 'fixed'
      a.style.left = '-10000px'
      a.textContent = 'Download CSV'
      a.download = 'epcalc.csv'
      a.href = 'data:text/csv;charset=utf-8,' + escape(csv)
      a.target = '_blank'
      document.body.appendChild(a);
      a.click()
    } catch (err) {
      console.error(err);
    }

  }

  var colors = [ "#386cb0", "#8da0cb", "#4daf4a", "#f0027f", "#fdc086"]

  var Plock = 1

  var drag_y = function (){
    var dragstarty = 0
    var Pmaxstart = 0

    var dragstarted = function (d) {
      dragstarty = event.y  
      Pmaxstart  = Pmax
    }

    var dragged = function (d) {
      Pmax = Math.max( (Pmaxstart*(1 + (event.y - dragstarty)/500)), 10)
    }

    return drag().on("drag", dragged).on("start", dragstarted)
  }

  var drag_x = function (){
    var dragstartx = 0
    var dtstart = 0
    var Pmaxstart = 0
    var dragstarted = function (d) {
      dragstartx = event.x
      dtstart  = dt
      Plock = Pmax
      lock = true
    }
    var dragged = function (d) {
      dt = dtstart - 0.0015*(event.x - dragstartx)
    }
    var dragend = function (d) {
      lock = false
    }
    return drag().on("drag", dragged).on("start", dragstarted).on("end", dragend)
  }

  var drag_intervention = function (index){
    var line = interventionLines[index]

    var dragstarty = 0
    var InterventionTimeStart = 0

    var dragstarted = function (d) {
      dragstarty = event.x  
      InterventionTimeStart = line.time
      Plock = Pmax
      lock = true
    }

    var dragged = function (d) {
      line.time = Math.min(tmax-1, Math.max(0, InterventionTimeStart + xScaleTimeInv(event.x - dragstarty)))
      interventionLines[index] = line
    }

    var dragend = function (d) {
      lock = false
    }

    return drag().on("drag", dragged).on("start", dragstarted).on("end", dragend)
  }

  $: parsed = "";
  onMount(async () => {
    var drag_callback_y = drag_y()
    drag_callback_y(selectAll("#yAxisDrag"))
    var drag_callback_x = drag_x()
    drag_callback_x(selectAll("#xAxisDrag"))
    var drag_callback_intervention = drag_intervention(0)
    drag_callback_intervention(selectAll("#dottedline"))

    if (typeof window !== 'undefined') {
      parsed = queryString.parse(window.location.search)
      setState(parsed)
    }

    setInitialState()
  });

  function lock_yaxis(){
    Plock = Pmax
    lock  = true
  }

  function unlock_yaxis(){
    lock = false
  }

  function onAddLineClick() {
    var last = interventionLines[interventionLines.length-1] || { time: 100, om: 2/3, amount: 1/3, index: 0 }
    var index = interventionLines.length
    var rtIndex = interventionLines.length === 1 ? 2 : 1
    var rtOption = rtOptions[rtIndex]
    interventionLines = [
      ...interventionLines,
      {
        time: interventionLines.length === 1 ? 
          differenceInCalendarDays(startOfMonth(addMonths(new Date(), 2)), startDate) : 
          differenceInCalendarDays(addMonths(addDays(startDate, last.time), 1), startDate),
        om: rtOption.om,
        amount: 1 - rtOption.om,
        index: index,
        rtIndex: rtIndex, 
        canDrag: true
      }
    ]

    activeIndex = index
  }

  function onRemoveLineClick() {
    interventionLines.pop()
    interventionLines = interventionLines
  }

  function onLineChange(e, index, useDynamicRt) {
    var line = interventionLines[index]
    line.om = Number(e.target.value)
    line.amount = 1 - line.om

    if (useDynamicRt) {
      var rtOption = rtOptions.find(o=>o.om===line.om)
      if (rtOption) {
        line.rtIndex = rtOptions.indexOf(rtOption)
      }
    }

    interventionLines = interventionLines
  }

  function onLineToggle(index) {
    activeIndex = activeIndex === index ? -1 : index
  }

  function updateInterventionLines() {
    if (useSlider) {
      return
    }

    interventionLines = interventionLines.map(line => {
      var rtOption = rtOptions[line.rtIndex]
      if (!rtOption) return line

      return {
        ...line,
        om: rtOption.om,
        amount: 1 - rtOption.om
      }
    })
  }

  function onTravelDateChange(e) {
    var value = e.target.value
    if (value.indexOf('T') === -1) {
      value += 'T00:00'
    }

    D_travel = new Date(value)
  }

  const padding = { top: 20, right: 0, bottom: 20, left: 25 };

  let width  = 750;
  let height = 400;

  $: xScaleTime = scaleLinear()
    .domain([0, tmax])
    .range([padding.left, width - padding.right]);

  $: xScaleTimeInv = scaleLinear()
    .domain([0, width])
    .range([0, tmax]);

  $: indexToTime = scaleLinear()
    .domain([0, P.length])
    .range([0, tmax])

  window.addEventListener('mouseup', unlock_yaxis);

  $: checked = [true, true, false, true, true]
  $: active  = 0
  $: active_ = active >= 0 ? active : Iters.length - 1
  $: totalHospitalizations = (function() {
    let i = active_
    let total = 0
    while (i--) {
      total += (Iters[i][5]+Iters[i][6])
    }

    return formatNumber(Math.round(total))
  })()

  var Tinc_s = "\\color{#CCC}{T^{-1}_{\\text{inc}}} "
  var Tinf_s = "\\color{#CCC}{T^{-1}_{\\text{inf}}}"
  var Rt_s   = "\\color{#CCC}{\\frac{\\mathcal{R}_{t}}{T_{\\text{inf}}}} "
  $: ode_eqn = katex.renderToString("\\frac{d S}{d t}=-" +Rt_s +"\\cdot IS,\\qquad \\frac{d E}{d t}=" +Rt_s +"\\cdot IS- " + Tinc_s + " E,\\qquad \\frac{d I}{d t}=" + Tinc_s + "E-" + Tinf_s+ "I, \\qquad \\frac{d R}{d t}=" + Tinf_s+ "I", {
    throwOnError: false,
    displayMode: true,
    colorIsTextColor: true
  });

  function math_inline(str) {
    return katex.renderToString(str, {
    throwOnError: false,
    displayMode: false,
    colorIsTextColor: true
    });
  }

  function math_display(str) {
    return katex.renderToString(str, {
    throwOnError: false,
    displayMode: true,
    colorIsTextColor: true
    });
  }
  
  $: p_num_ind = 40

  $: get_d = function(i){
    return dIters(indexToTime(i), Iters[i])
  }

  function get_milestones(P){

    function argmax(x, index) {
      return x.map((x, i) => [x[index], i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
    }

     //    Dead   Hospital          Recovered        Infectious   Exposed
    var milestones = []
    for (var i = 0; i < P.length; i++) {
      if (P[i][0] >= 0.5) {
        milestones.push([i*dt, "First death"])
        break
      }
    }

    var i = argmax(P, 1)
    milestones.push([i*dt, "Peak: " + format(",")(Math.round(P[i][1])) + " hospitalizations"])

    return milestones
  }

  $: milestones = get_milestones(P)
  $: log = true

  // Scenario stuff.
  let scenario
  let scenarios = []

  const createScenario = () => {
    var newId = scenarios.length ? Math.max(...scenarios.map(s=>s.id)) + 1 : 1
    return {
      id: newId,
      name: 'Scenario ' + newId,
      data: null
    }
  }

  const saveScenario = () => {
    scenario.data = serializeState()
  }

  const loadScenario = (s) => {
    scenario = s
    if (scenario.data) {
      var data = JSON.parse(scenario.data)
      setState(data)
    }
  }

  const onScenarioClick = (s) => {
    saveScenario()
    loadScenario(s)
  }

  const onAddScenarioClick = () => {
    saveScenario()
    var newScenario = createScenario()
    scenarios = [ ...scenarios, newScenario ]
    scenario = newScenario
    setState(getInitialState())
  }

  const onDeleteScenarioClick = () => {
    scenarios = scenarios.filter(s=>s.id !== scenario.id)
    if (scenarios.length) {
      loadScenario(scenarios[0])
    } else {
      scenario = createScenario()
      scenarios = [scenario]
    }
  }

  const onNameChange = (e) => {
    scenario.name = e.target.value
    scenarios = scenarios
  }

  const onSaveClick = () => {
    saveScenario()
    localStorage.scenarios = JSON.stringify(scenarios)
  }

  const onResetClick = () => {
    delete localStorage.scenarios
    init()
  }

  const init = () => {
    if (localStorage.scenarios) {
      scenarios = JSON.parse(localStorage.scenarios)
      scenario = scenarios[0] || createScenario()
    } else {
      const bestCaseScenario = {
        id: 'BEST_CASE',
        name: 'Best case',
        data: serializeState(bestCase)
      }

      const worstCaseScenario = {
        id: 'WORST_CASE',
        name: 'Worst case',
        data: serializeState(worstCase)
      }

      scenarios = [bestCaseScenario, worstCaseScenario]
      scenario = bestCaseScenario
      setTimeout(() => {
        setState(bestCase)
      }, 100)
    }
  }

  init()
</script>

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/katex.css" integrity="sha384-bsHo4/LA+lkZv61JspMDQB9QP1TtO4IgOf2yYS+J6VdAYLVyx1c3XKcsHh0Vy8Ws" crossorigin="anonymous">

<style>
  .small { font: italic 6px Source Code Pro; }
  @import url('https://fonts.googleapis.com/css?family=Source+Code+Pro&display=swap');


  h2 {
    margin: auto;
    width: 950px;
    font-size: 40px;
    padding-top: 20px;
    padding-bottom: 20px;
    font-weight: 300;
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    padding-bottom: 30px
  }

  .center {
    margin: auto;
    width: 950px;
    padding-bottom: 20px;
    font-weight: 300;
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    color:#666;
    font-size: 16.5px;
    text-align: justify;
    line-height: 24px
  }

  .ack {
    margin: auto;
    width: 950px;
    padding-bottom: 20px;
    font-weight: 300;
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    color:#333;
    font-size: 13px;
  }

  .row {
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    margin: auto;
    display: flex;
    width: 948px;
    font-size: 13px;
  }

  .caption {
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    font-size: 13px;    
  }

  .column {
    flex: 158px;
    padding: 0px 5px 5px 0px;
    margin: 0px 5px 5px 5px;
    /*border-top: 2px solid #999*/
  }

  .travel-row .column {
    max-width: 200px;
  }
  .travel-row .paneldesc,
  .rt-row .paneldesc {
    padding-top: 10px;
  }
  .rt-row .column + .column {
    margin-left: 0px;
  }
  
  .minorTitle {
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    margin: auto;
    display: flex;
    width: 950px;
    font-size: 17px;
    color: #666;
  }

  .minorTitleColumn{
    flex: 60px;
    padding: 3px;
    border-bottom: 2px solid #999;
  }


  .paneltext{
    position:relative;
    height:130px;
  }

  .paneltitle{
    color:#777; 
    line-height: 17px; 
    padding-bottom: 4px;
    font-weight: 700;
    font-family: nyt-franklin,helvetica,arial,sans-serif;
  }

  .paneldesc{
    color:#888; 
    text-align: left;
    font-weight: 300;
  }

  .slidertext{
    color:#555; 
    line-height: 7px; 
    padding-bottom: 0px; 
    padding-top: 7px;
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    font-family: 'Source Code Pro', monospace;
    font-size: 10px;
    text-align: right;
    /*font-weight: bold*/
  }
    
  .range {
    width: 100%;
  }

  .chart {
    width: 100%;
    margin: 0 auto;
    padding-top:0px;
    padding-bottom:10px;
  }

  .legend {
    color: #888;
    font-family: Helvetica, Arial;
    font-size: .725em;
    font-weight: 200;
    height: 100px;
    left: 20px;
    top: 4px;
    position: absolute;
  }

  .legendtitle {
    color:#777; 
    font-size:13px;
    padding-bottom: 6px;
    font-weight: 600;
    font-family: nyt-franklin,helvetica,arial,sans-serif;
  }


  .legendtext{
    color:#888; 
    font-size:13px;
    padding-bottom: 5px;
    font-weight: 300;
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    line-height: 14px;
  }

  .legendtextnum{
    color:#888; 
    font-size:13px;
    padding-bottom: 5px;
    font-weight: 300;
    line-height: 12px;
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    left: -3px;
    position: relative;
  }

  .tick {
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    font-size: .725em;
    font-weight: 200;
    font-size: 13px
  }

  td { 
    text-align: left;
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    border-bottom: 1px solid #DDD;
    border-collapse: collapse;
    padding: 3px;
    /*font-size: 14px;*/
  }

  tr {
    border-collapse: collapse;
    border-spacing: 15px;
  }

  .eqn {
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    margin: auto;
    display: flex;
    flex-flow: row wrap;
    width: 950px;
    column-count: 4;
    font-weight: 300;
    color:#666;
    font-size: 16.5px;
  }

  th { font-weight: 500; text-align: left; padding-bottom: 5px; vertical-align: text-top;     border-bottom: 1px solid #DDD; }

  a:link { color: grey; }
  a:visited { color: grey; }

  .btn {
    appearance: none;
    background: #386cb0;
    border: none;
    color: #fff;
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    font-size: 15px;
  }
  .btn-icon {
    font-size: 20px;
    line-height: 20px;
  }
  .btn-text {
    padding: 5px 10px;
    font-size: 13px;
  }
  .btn:not(:disabled):focus {
    outline: none;
  }
  .btn:disabled {
    opacity: 0.8;
  }
  .btn:not(:disabled):hover {
    cursor: pointer;
  }
  .btn-primary:not(:disabled):hover {
    background: #3265aa;
  }
  .btn-primary:not(:disabled):active {
    background: #2c60a5;
  }
  .btn-plain {
    background: #fff;
    color: #386cb0;
    border: 1px solid #386cb0;
  }
  .btn-plain:not(:disabled):hover {
    background: #fbfbfb;
    color: #3265aa;
    border-color: #3265aa;
  }
  .btn-plain:not(:disabled):active {
    background: #f5f5f5;
    color: #2c60a5;
    border-color: #2c60a5;
  }
  .btn-remove {
    background: #f00a;
  }
  .btn-remove:not(:disabled):hover {
    background: #f00c;
  }
  .btn-remove:not(:disabled):active {
    background: #f00;
  }

  .scenario-section {
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    font-size: 15px;
    color: #777;
  }
  .scenario-list {
    height: 100px;
    overflow-y: auto;
  }
  .scenario-list-item {
    padding: 6px 10px;
    cursor: pointer;
  }
  .scenario-list-item:hover {
    background: #fafafa;
    color: #333;
  }
  .scenario-list-item.active {
    background: #f8f8f8;
    color: #386cb0;
  }
  .btn-add {
    padding: 1px 6px;
  }
  input#scenario-name {
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    font-size: 16px;
    padding: 4px 9px;
    appearance: none;
    color: #555;
    appearance: none;
    -webkit-appearance: none;
    border: 1px solid #ddd;
    border-radius: 2px;
  }
  input#scenario-name:focus {
    outline: none;
    border-color: #00f8;
  }

  .static-line .dottedline,
  .static-line .dottedline * {
    transition: all 100ms;
  }
  .static-line .dottedline * {
    opacity: 0;
  }
  .static-line .dottedline:hover * {
    opacity: 1;
  }
  .static-line .dottedline:hover {
    border-right-color: #000 !important;
  }

  .scenario-wrapper {
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    max-width: 980px;
    margin: auto;
    box-sizing: border-box;
  }

  .controls-toggle {
    max-width: 980px;
    margin: auto;
    padding: 5px 20px;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
  }
</style>

<div class="chart" style="padding-top: 30px; display: flex; max-width: 1120px">

  <div style="flex: 0 0 270px; width:270px;">
    <div style="position:relative; top:48px; right:-115px">
      <div class="legendtext" style="position:absolute; left:-16px; top:-34px; width:50px; height: 100px; font-size: 13px; line-height:16px; font-weight: normal; text-align: center"><b>Day</b><br> {Math.round(indexToTime(active_))}</div>

      <!-- Susceptible -->
      <div style="position:absolute; left:0px; top:0px; width: 180px; height: 100px">

        <span style="pointer-events: none"><Checkbox color="#CCC"/></span>
        <Arrow height="41"/>

        <div class="legend" style="position:absolute;">
          <div class="legendtitle">Susceptible</div>
          <div style="padding-top: 5px; padding-bottom: 1px">
          <div class="legendtextnum"><span style="font-size:12px; padding-right:3px; color:#CCC">∑</span> <i>{formatNumber(Math.round(Iters[active_][0]))} 
                                  ({ (100*(Iters[active_][0]/N)).toFixed(2) }%)</i></div>
          <div class="legendtextnum"><span style="font-size:12px; padding-right:2px; color:#CCC">Δ</span> <i>{formatNumber(Math.round(get_d(active_)[0]))} / day</i>
                                 </div>
          </div>
        </div>
          <div class="legendtext" style="text-align: right; width:105px; left:-111px; top: 4px; position:relative;">Population not immune to disease.</div>

      </div>

      <!-- Exposed -->
      <div style="position:absolute; left:0px; top:{legendheight*1}px; width: 180px; height: 100px">

        <Checkbox color="{colors[4]}" bind:checked={checked[4]}/>      
        <Arrow height="41"/>

        <div class="legend" style="position:absolute;">
          <div class="legendtitle">Exposed</div>

          <div style="padding-top: 5px; padding-bottom: 1px">
          <div class="legendtextnum"><span style="font-size:12px; padding-right:3px; color:#CCC">∑</span> <i>{formatNumber(Math.round(Iters[active_][1]))} 
                                  ({ (100*(Iters[active_][1]/N)).toFixed(2) }%)</div>
          <div class="legendtextnum"><span style="font-size:12px; padding-right:2px; color:#CCC">Δ</span> <i>{formatNumber(Math.round(get_d(active_)[1])) } / day</i>
                                 </div>
          </div>
        </div>
        <div class="legendtext" style="text-align: right; width:105px; left:-111px; top: 4px; position:relative;">Population currently in incubation.</div>

      </div>

      <!-- Infectious -->
      <div style="position:absolute; left:0px; top:{legendheight*2}px; width: 180px; height: 100px">

        <Checkbox color="{colors[3]}" bind:checked={checked[3]}/>
        <Arrow height="41"/>   

        <div class="legend" style="position:absolute;">
          <div class="legendtitle">Infectious</div>
          <div style="padding-top: 5px; padding-bottom: 1px">
          <div class="legendtextnum"><span style="font-size:12px; padding-right:3px; color:#CCC">∑</span> <i>{formatNumber(Math.round(Iters[active_][2]))} 
                                  ({ (100*(Iters[active_][2]/N)).toFixed(2) }%)</div>
          <div class="legendtextnum"><span style="font-size:12px; padding-right:2px; color:#CCC">Δ</span> <i>{formatNumber(Math.round(get_d(active_)[2])) } / day</i>
                                 </div>
          </div>
        </div>
        <div class="legendtext" style="text-align: right; width:105px; left:-111px; top: 4px; position:relative;">Number of infections <i>actively</i> circulating.</div>


      </div>

      <!-- Removed -->
      <div style="position:absolute; left:0px; top:{legendheight*3}px; width: 180px; height: 100px">

        <Checkbox color="grey" callback={(s) => {checked[1] = s; checked[0] = s; checked[2] = s} }/>
        <Arrow height="56" arrowhead="" dasharray="3 2"/>

        <div class="legend" style="position:absolute;">
          <div class="legendtitle">Removed</div>
          <div style="padding-top: 10px; padding-bottom: 1px">
          <div class="legendtextnum"><span style="font-size:12px; padding-right:3px; color:#CCC">∑</span> <i>{formatNumber(Math.round(N* ((1-Iters[active_][0]/N)-(Iters[active_][1]/N)-(Iters[active_][2]/N)) ))} 
                                  ({ ((100*(1-(Iters[active_][0]/N)-(Iters[active_][1]/N)-(Iters[active_][2]/N)))).toFixed(2) }%)</div>
          <div class="legendtextnum"><span style="font-size:12px; padding-right:2px; color:#CCC">Δ</span> <i>{formatNumber(Math.round((get_d(active_)[3]+get_d(active_)[4]+get_d(active_)[5]+get_d(active_)[6]+get_d(active_)[7]) )) } / day</i>
                                 </div>
          </div>
        </div>
        <div class="legendtext" style="text-align: right; width:105px; left:-111px; top: 4x; position:relative;">Population no longer infectious due to isolation or immunity.</div>

      </div>

      <!-- Recovered -->
      <div style="position:absolute; left:0px; top:{legendheight*4+14-3}px; width: 180px; height: 100px">
        <Checkbox color="{colors[2]}" bind:checked={checked[2]}/>
        <Arrow height="23" arrowhead="" dasharray="3 2"/>
        <div class="legend" style="position:absolute;">
          <div class="legendtitle">Recovered</div>

          <div style="padding-top: 3px; padding-bottom: 1px">
          <div class="legendtextnum"><span style="font-size:12px; padding-right:3px; color:#CCC">∑</span> <i>{formatNumber(Math.round((Iters[active_][7]+Iters[active_][8]) ))} 
                                  ({ (100*((Iters[active_][7]/N)+(Iters[active_][8]/N))).toFixed(2) }%)</div>
          </div>
        </div>
        <div class="legendtext" style="text-align: right; width:105px; left:-111px; top: 8px; position:relative;">Full recoveries.</div>

      </div>

      <!-- Hospitalized -->
      <div style="position:absolute; left:0px; top:{legendheight*4+57}px; width: 180px; height: 100px">
        <Arrow height="60" arrowhead="" dasharray="3 2"/>
        <Checkbox color="{colors[1]}" bind:checked={checked[1]}/>
        <div class="legend" style="position:absolute;">
          <div class="legendtitle">Hospitalized</div>
          <div style="padding-top: 3px; padding-bottom: 1px">
          <div class="legendtextnum"><span style="font-size:12px; padding-right:3px; color:#CCC">∑</span> <i>{formatNumber(Math.round((Iters[active_][5]+Iters[active_][6]) ))} 
                                  ({ (100*((Iters[active_][5]/N)+(Iters[active_][6]/N))).toFixed(2) }%)</div>
          </div>
          <div class="legendtextnum"><span style="font-size:12px; padding-right:2px; color:#CCC">Δ</span> <i>{formatNumber(Math.round((get_d(active_)[5]+get_d(active_)[6]))) } / day</i>
                                 </div>
          <div class="legendtextnum"><span style="font-size:12px; padding-right:2px; color:#CCC">Total</span> <i>{totalHospitalizations}</i>
                                 </div>
        </div>
        <div class="legendtext" style="text-align: right; width:105px; left:-111px; top: 10px; position:relative;">Active hospitalizations.</div>

      </div>

      <!-- Fatalities -->
      <div style="position:absolute; left:0px; top:{legendheight*4 + 120+19}px; width: 180px; height: 100px">
        <Arrow height="40" arrowhead="" dasharray="3 2"/>

        <Checkbox color="{colors[0]}" bind:checked={checked[0]}/>

        <div class="legend" style="position:absolute;">
          <div class="legendtitle">Fatalities</div>
          <div style="padding-top: 3px; padding-bottom: 1px">          
          <div class="legendtextnum"><span style="font-size:12px; padding-right:3px; color:#CCC">∑</span> <i>{formatNumber(Math.round(Iters[active_][9]))} 
                                  ({ (100*(Iters[active_][9]/N)).toFixed(2) }%)</div>
          <div class="legendtextnum"><span style="font-size:12px; padding-right:2px; color:#CCC">Δ</span> <i>{formatNumber(Math.round(get_d(active_)[9])) } / day</i>
                                 </div>
          </div>
        </div>
        <div class="legendtext" style="text-align: right; width:105px; left:-111px; top: 10px; position:relative;">Deaths.</div>
      </div>
    </div>
  </div>

  <div style="flex: 0 0 890px; width:890px; height: {height+128}px; position:relative;">

    <div style="position:relative; top:60px; left: 10px">
      <Chart bind:checked={checked}
             bind:active={active}
             y = {P} 
             xmax = {Xmax} 
             total_infected = {total_infected} 
             deaths = {deaths} 
             total = {total} 
             timestep={timestep}
             tmax={tmax}
             N={N}
             ymax={lock ? Plock: Pmax}
             InterventionTime={firstLine.time}
             colors={colors}
             log={!log}
             startDate={startDate} />
      </div>

      <div id="xAxisDrag"
           style="pointer-events: all;
                  position: absolute;
                  top:{height+80}px;
                  left:{0}px;
                  width:{780}px;
                  background-color:#222;
                  opacity: 0;
                  height:25px;
                  cursor:col-resize">
      </div>

      <div id="yAxisDrag"
           style="pointer-events: all;
                  position: absolute;
                  top:{55}px;
                  left:{0}px;
                  width:{20}px;
                  background-color:#222;
                  opacity: 0;
                  height:425px;
                  cursor:row-resize">
      </div>

      <!-- Static intervention lines -->
      {#each staticLines as line, i}
        <div class="static-line" style="position: absolute; width:{width+15}px; height: {height}px; position: absolute; top:100px; left:10px; pointer-events: none">
          <div class="dottedline"  style="pointer-events: all;
                      position: absolute;
                      top:-19px;
                      left:{xScaleTime(line.time)}px;
                      width:2px;
                      background-color:#FFF;
                      border-right: 1px dashed #0003;
                      pointer-events: all;
                      height:{height}px">

            <div style="position:absolute; color: #777; top:-5px; left:10px; width: 120px; z-index: 1; background: #fffc;">
              <span style="font-size: 13px">{@html math_inline("\\mathcal{R}_t=" + (R0*line.amount).toFixed(2) )}</span> ⟶ 
            </div>

            <!-- <div style="position:absolute; color: #777; top:-2px; left:-97px; width: 120px z-index: 1; background: #fffc;">
              <span style="font-size: 13px">⟵ {@html math_inline("\\mathcal{R}_0=" + (staticLines[i-1] ? staticLines[i-1].amount*R0 : R0).toFixed(2) )}</span>
            </div> -->
            
            <div class="line-label caption" style="position: absolute; top: 105px; left: 0px; transform: translateX(-50%); font-size: 12px; color: rgb(119, 119, 119); user-select: none; z-index: 1; white-space: nowrap; z-index: 1; background: #fffc; pointer-events: none;">
              <div>{line.label}</div>
            </div>
          </div>
        </div>
      {/each}

      <div class="static-line" style="position: absolute; width:{width+15}px; height: {height}px; position: absolute; top:100px; left:10px; pointer-events: none">
        <div class="dottedline"  style="pointer-events: all;
                    position: absolute;
                    top:-19px;
                    left:{xScaleTime(travelLine.time)}px;
                    width:2px;
                    background-color:#FFF;
                    border-right: 1px dashed #0003;
                    pointer-events: all;
                    height:{height}px">
          
          <div class="line-label caption" style="position: absolute; top: 105px; left: 0px; transform: translateX(-50%); font-size: 12px; color: rgb(119, 119, 119); user-select: none; z-index: 1; white-space: nowrap; z-index: 1; background: #fffc; pointer-events: none;">
            <div>{travelLine.label}</div>
          </div>
        </div>
      </div>
      

      {#each interventionLines as interventionLine} 
        <InterventionLine
          time={interventionLine.time}
          amount={interventionLine.amount}
          om={interventionLine.om}
          index={interventionLine.index}
          canDrag={interventionLine.canDrag}
          label={interventionLine.label}
          show={interventionLine.index === activeIndex}
          width={width}
          height={height}
          R0={R0}
          tmax={tmax}
          lock_yaxis={lock_yaxis}
          drag_intervention={drag_intervention}
          onLineChange={onLineChange}
          onLineToggle={onLineToggle}
          startDate={startDate}
          rtOptions={rtOptions}
          useSlider={useSlider}
        />
      {/each} 






      <div style="pointer-events: none;
                  position: absolute;
                  top:{height+84}px;
                  left:{0}px;
                  width:{780}px;
                  opacity: 1.0;
                  height:25px;
                  cursor:col-resize">
            {#each milestones as milestone}
              <div style="position:absolute; left: {xScaleTime(milestone[0])+8}px; top: -30px;">
                <span style="opacity: 0.3"><Arrow height=30 arrowhead="#circle" dasharray = "2 1"/></span>
                  <div class="tick" style="position: relative; left: 0px; top: 35px; max-width: 130px; color: #BBB; background-color: white; padding-left: 4px; padding-right: 4px">{@html milestone[1]}</div>
              </div>
            {/each}
      </div>
    
    <div style="opacity:{xScaleTime(firstLine.time) >= 192? 1.0 : 0.2}">
      <div class="tick" style="color: #AAA; position:absolute; pointer-events:all; left:10px; top: 10px">
        <Checkbox color="#CCC" bind:checked={log}/><div style="position: relative; top: 4px; left:20px">linear scale</div>
      </div>
    </div>

   </div>

</div>

<!-- Custom controls begin -->
<div class="scenario-wrapper">
  <div class="scenario-section" style="display: flex; border: 1px solid #eee;">
    <div class="list" style="border-right: 1px solid #eee; min-width: 200px;">
      <div class="list-header" style="font-weight: bold; font-size: 16px; padding: 3px 10px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #eee;">
        <span style="margin-right: 10px;">Scenarios</span>
        <button on:click={onAddScenarioClick} class="btn btn-primary btn-icon btn-add">+</button>
      </div>
      <div class="scenario-list">
        {#each scenarios as s}
          <div class="scenario-list-item {s.id === scenario.id ? 'active' : ''}" on:click={()=> onScenarioClick(s)}>{s.name}</div>
        {/each}
      </div>
    </div>
    <div class="detail" style="padding: 10px;">
      <div><input id="scenario-name" type="text" value={scenario.name} on:input={onNameChange} style="margin-right: 15px"></div>
      <div style="margin-top: 10px"><button on:click={onDeleteScenarioClick} class="btn btn-remove btn-text">Delete scenario</button></div>
      <!-- <div style="margin-top: 20px">
        <div><button on:click={onSaveClick} class="btn btn-text btn-primary save">Save session</button></div>
        <div style="margin-top: 10px"><button on:click={onResetClick} class="btn btn-text btn-primary reset">Clear session</button></div>
      </div> -->
    </div>
  </div>

  <div style="margin-left: 10px; display: flex; justify-content: center; align-items: center;">
    <span class="paneltitle" style="margin-right: 5px; padding: 0;">Add/remove intervention lines:</span>
    <button on:click={onRemoveLineClick} style="width: 33px; height: 28px;" class="btn btn-icon btn-primary" disabled="{interventionLines.length <= 1 ? 'disabled' : ''}">-</button>
    <button on:click={onAddLineClick} style="border-left: 1px solid #ddd; width: 33px; height: 28px;" class="btn btn-icon btn-primary">+</button>
  </div>
</div>
<!-- Custom controls end -->

<div class="controls-toggle">
  <button class="btn btn-plain btn-text" on:click={() => showControls = !showControls}>{showControls ? 'Hide' : 'Show'} inputs</button>
  {#if allowDownload}
    <button class="btn btn-plain btn-text" on:click={onDownloadCsvClick}>Download CSV</button>
  {:else}
    <span />
  {/if}
</div>
{#if showControls}

  {#if showTravelDynamics}
    <div class="minorTitle">
      <div style="margin: 0px 0px 5px 4px" class="minorTitleColumn">Travel Dynamics</div>
    </div>
    <div class="row travel-row">
      <div class="column">
        <div class="paneldesc" style="height:30px">Date to resume travel.<br></div>
        <input type=date value={isValid(D_travel) ? dateFormat(D_travel, 'yyyy-MM-dd') : ''} on:change={onTravelDateChange} />
      </div>
      <div class="column">
        <div class="paneldesc" style="height:30px">Travel rate compared to <a href="http://dbedt.hawaii.gov/visitor/tourism/" target="_blank">2019</a>.<br></div>
        <div class="slidertext">{Math.round(P_travel*100)} %</div>
        <input class="range" type=range bind:value={P_travel} min={0} max={1} step={0.01}>
      </div>
      <div class="column">
        <div class="paneldesc" style="height:30px">Percentage of infected, asymptomatic travelers entering the state per day.<br></div>
        <div class="slidertext">{(P_travelersinfected*100).toFixed(1)} %</div>
        <input class="range" type=range bind:value={P_travelersinfected} min={0} max={0.1} step={0.001}>
      </div>
    </div>
  {/if}

  {#if showRtControls}
    <div class="minorTitle">
      <div style="margin: 0px 0px 5px 4px" class="minorTitleColumn">Rt Controls</div>
    </div>
    <div class="row rt-row">
      <div class="column">
        <div class="paneldesc" style="height:20px">Level 0 • Normal • Rt={(R0*(1-rtLevel0)).toFixed(2)}<br></div>
        <div class="slidertext">to decrease txn by {(100*(1-(1-rtLevel0))).toFixed(2)}%</div>
        <input class="range" style="margin-bottom: 8px" type=range bind:value={rtLevel0} min={0} max={1} step={0.01} on:input={updateInterventionLines}>
      </div>
      <div class="column">
        <div class="paneldesc" style="height:20px">Level 1 • Prepare • Rt={(R0*(1-rtLevel1)).toFixed(2)}<br></div>
        <div class="slidertext">to decrease txn by {(100*(1-(1-rtLevel1))).toFixed(2)}%</div>
        <input class="range" style="margin-bottom: 8px" type=range bind:value={rtLevel1} min={0} max={1} step={0.01} on:input={updateInterventionLines}>
      </div>
      <div class="column">
        <div class="paneldesc" style="height:20px">Level 2 • Reduce • Rt={(R0*(1-rtLevel2)).toFixed(2)}<br></div>
        <div class="slidertext">to decrease txn by {(100*(1-(1-rtLevel2))).toFixed(2)}%</div>
        <input class="range" style="margin-bottom: 8px" type=range bind:value={rtLevel2} min={0} max={1} step={0.01} on:input={updateInterventionLines}>
      </div>
      <div class="column">
        <div class="paneldesc" style="height:20px">Level 3 • Restrict • Rt={(R0*(1-rtLevel3)).toFixed(2)}<br></div>
        <div class="slidertext">to decrease txn by {(100*(1-(1-rtLevel3))).toFixed(2)}%</div>
        <input class="range" style="margin-bottom: 8px" type=range bind:value={rtLevel3} min={0} max={1} step={0.01} on:input={updateInterventionLines}>
      </div>
      <div class="column">
        <div class="paneldesc" style="height:20px">Level 4 • Lockdown • Rt={(R0*(1-rtLevel4)).toFixed(2)}<br></div>
        <div class="slidertext">to decrease txn by {(100*(1-(1-rtLevel4))).toFixed(2)}%</div>
        <input class="range" style="margin-bottom: 8px" type=range bind:value={rtLevel4} min={0} max={1} step={0.01} on:input={updateInterventionLines}>
      </div>
    </div>
  {/if}

  <div style="height:220px;">
    <div class="minorTitle">
      <div style="margin: 0px 0px 5px 4px" class="minorTitleColumn">Transmission Dynamics</div>
      <div style="flex: 0 0 20; width:20px"></div>
      <div style="margin: 0px 4px 5px 0px" class="minorTitleColumn">Clinical Dynamics</div>
    </div>
    <div class = "row">

      <div class="column">
        <div class="paneltitle">Population Inputs</div>
        <div class="paneldesc" style="height:30px">Size of population.<br></div>
        <div class="slidertext">{format(",")(Math.round(N))}</div>
        <input class="range" style="margin-bottom: 8px"type=range bind:value={logN} min={5} max=25 step=0.01>
        <div class="paneldesc" style="height:29px; border-top: 1px solid #EEE; padding-top: 10px">Number of initial infections.<br></div>
        <div class="slidertext">{I0}</div>
        <input class="range" type=range bind:value={I0} min={1} max=10000 step=1>
      </div>

      <div class="column">
        <div class="paneltext">
        <div class="paneltitle">Basic Reproduction Number {@html math_inline("\\mathcal{R}_0")} </div>
        <div class="paneldesc">Measure of contagiousness: the number of secondary infections each infected individual produces. <br></div>
        </div>
        <div class="slidertext">{R0}</div>
        <input class="range" type=range bind:value={R0} min=0.01 max=10 step=0.01> 
      </div> 

      <div class="column">
        <div class="paneltitle">Transmission Times</div>
        <div class="paneldesc" style="height:30px">Length of incubation period, {@html math_inline("T_{\\text{inc}}")}.<br></div>
        <div class="slidertext">{(D_incbation).toFixed(2)} days</div>
        <input class="range" style="margin-bottom: 8px"type=range bind:value={D_incbation} min={0.15} max=24 step=0.0001>
        <div class="paneldesc" style="height:29px; border-top: 1px solid #EEE; padding-top: 10px">Duration patient is infectious, {@html math_inline("T_{\\text{inf}}")}.<br></div>
        <div class="slidertext">{D_infectious} Days</div>
        <input class="range" type=range bind:value={D_infectious} min={0} max=24 step=0.01>
      </div>

      <div style="flex: 0 0 20; width:20px"></div>

      <div class="column">
        <div class="paneltitle">Mortality Statistics</div>
        <div class="paneldesc" style="height:30px">Case fatality rate.<br></div>
        <div class="slidertext">{(CFR*100).toFixed(2)} %</div>
        <input class="range" style="margin-bottom: 8px" type=range bind:value={CFR} min={0} max=1 step=0.0001>
        <div class="paneldesc" style="height:29px; border-top: 1px solid #EEE; padding-top: 10px">Time from end of incubation to death.<br></div>
        <div class="slidertext">{Time_to_death} Days</div>
        <input class="range" type=range bind:value={Time_to_death} min={(D_infectious)+0.1} max=100 step=0.01>
      </div>

      <div class="column">
        <div class="paneltitle">Recovery Times</div>
        <div class="paneldesc" style="height:30px">Length of hospital stay<br></div>
        <div class="slidertext">{D_recovery_severe} Days</div>
        <input class="range" style="margin-bottom: 8px" type=range bind:value={D_recovery_severe} min={0.1} max=100 step=0.01>
        <div class="paneldesc" style="height:29px; border-top: 1px solid #EEE; padding-top: 10px">Recovery time for mild cases<br></div>
        <div class="slidertext">{D_recovery_mild} Days</div>
        <input class="range" type=range bind:value={D_recovery_mild} min={0.5} max=100 step=0.01>
      </div>

      <div class="column">
        <div class="paneltitle">Care statistics</div>
        <div class="paneldesc" style="height:30px">Hospitalization rate.<br></div>
        <div class="slidertext">{(P_SEVERE*100).toFixed(2)} %</div>
        <input class="range" style="margin-bottom: 8px"type=range bind:value={P_SEVERE} min={0} max=1 step=0.0001>      
        <div class="paneldesc" style="height:29px; border-top: 1px solid #EEE; padding-top: 10px">Time to hospitalization.<br></div>
        <div class="slidertext">{D_hospital_lag} Days</div>
        <input class="range" type=range bind:value={D_hospital_lag} min={0.5} max=100 step=0.01>
      </div>

    </div>

  </div>
{/if}
