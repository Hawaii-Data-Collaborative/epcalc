<script>
  
  import { onMount } from 'svelte';
  import { scaleLinear } from "d3-scale";
  import { format } from 'd3-format'
  import { drag } from 'd3-drag';
  import { selectAll } from 'd3-selection'
  import katex from 'katex';
  import { addDays, format as dateFormat } from 'date-fns'

  export let time
  export let amount
  export let om
  export let width
  export let height
  export let index
  export let show
  export let R0
  export let tmax
  export let lock_yaxis
  export let drag_intervention
  export let onLineChange
  export let onLineToggle
  export let startDate

  const padding = { top: 20, right: 0, bottom: 20, left: 25 };
  $: xScaleTime = scaleLinear()
    .domain([0, tmax])
    .range([padding.left, width - padding.right]);


  function onDottedLineClick() {
    debugger
  }

  function math_inline(str) {
    return katex.renderToString(str, {
    throwOnError: false,
    displayMode: false,
    colorIsTextColor: true
    });
  }

  onMount(() => {
    var drag_callback_intervention = drag_intervention(index)
    drag_callback_intervention(selectAll(`#dottedline-${index}`))
  })

</script>

<style>
  
  .caption {
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    font-size: 13px;    
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

  .legendtext{
    color:#888; 
    font-size:13px;
    padding-bottom: 5px;
    font-weight: 300;
    font-family: nyt-franklin,helvetica,arial,sans-serif;
    line-height: 14px;
  }

</style>

<!-- Dotted line -->
<div style="position: absolute; width:{width+15}px; height: {height}px; position: absolute; top:100px; left:10px; pointer-events: none">
  <div id="dottedline-{index}" class="dottedline"  style="pointer-events: all;
              position: absolute;
              top:-20px;
              left:{xScaleTime(time)}px;
              visibility: {(xScaleTime(time) < (width - padding.right)) ? 'visible':'hidden'};
              width:2px;
              background-color:#FFF;
              border-right: 1px dashed black;
              pointer-events: all;
              cursor:col-resize;
              height:{height}px">
  
  <div on:click={() => onLineToggle(index)} class="caption" style="position: absolute; top: 15px; left: 0; transform: translateX(-50%); background: #fffa; font-size: 12px; color: {show ? '#111' : '#777'}; cursor: pointer; user-select: none; z-index: 1; padding: 1px 4px;">toggle</div>

  <div id="shadow2" style="display: {show ? '' : 'none'}; background: #fff; z-index: 1; position: absolute; width: 300px; height: 108px; top: -98px; left: -126px; box-shadow: 0px 0px 20px 1px #0001;"></div>

  <div id="interventionDrag2" class="legendtext" style="display: {show ? '' : 'none'}; background: #fff; z-index: 2; flex: 0 0 160px; width:120px; position:relative;  top:-83px; height: 79px; padding-right: 7px; left: -126px; pointer-events: all;cursor:col-resize;" >
    <div class="paneltitle" style="top:2px; position: relative; text-align: right;">
      Intervention {index+1} on day {format("d")(time)}
      <span style="font-weight:normal">({dateFormat(addDays(startDate, time), 'M/d/yy')})</span>
    </div>
    <span></span><div style="top:9px; position: relative; text-align: right">
    (drag me)</div>
    <div style="top:43px; left:40px; position: absolute; text-align: right; width: 20px; height:20px; opacity: 0.3">
      <svg width="20" height="20">
        <g transform="rotate(90)">
          <g transform="translate(0,-20)">
            <path d="M2 11h16v2H2zm0-4h16v2H2zm8 11l3-3H7l3 3zm0-16L7 5h6l-3-3z"/>
            </g>  
        </g>
      </svg>
    </div>
  </div>
  </div>
</div>

<!-- Slider -->
<div style="display: {show ? '' : 'none'}; position: absolute; width:{width+15}px; height: {height}px; position: absolute; top:120px; left:10px; pointer-events: none">
  <div style="
      position: absolute;
      top:-38px;
      left:{xScaleTime(time)}px;
      visibility: {(xScaleTime(time) < (width - padding.right)) ? 'visible':'hidden'};
      width:2px;
      background-color:#FFF;
      border-right: 1px dashed black;
      cursor:col-resize;
      height:{height}px">
      <div style="display: {show ? '' : 'none'}; background: #fff; z-index: 2; flex: 0 0 160px; width:200px; position:relative; top:-125px; left: 1px" >
        <div class="caption" style="pointer-events: none; position: absolute; left:0; top:40px; width:150px; border-left: 2px solid #777; padding: 5px 7px 7px 7px; height: 71px">      
        <div class="paneltext"  style="height:20px; text-align: right">
        <div class="paneldesc">to decrease transmission by<br></div>
        </div>
        <div style="pointer-events: all">
        <div class="slidertext" on:mousedown={lock_yaxis}>{(100*(1-amount)).toFixed(2)}%</div>
          <input class="range" type=range min=0 max=1 step=0.01 list="rangeoptions" value={om} on:mousedown={lock_yaxis} on:input={e=>onLineChange(e, index)}>
          <datalist id="rangeoptions">
            <option value={0} label="2.5"></option>
            <option value={0.28} label="1.8"></option>
            <option value={0.52} label="1.2"></option>
            <option value={0.68} label="0.8"></option>
          </datalist>
        </div>
        
        <div style="width: 120px; color: #777; margin-top: 3px;">
          <span style="font-size: 13px">{@html math_inline("\\mathcal{R}_t=" + (R0*amount).toFixed(2) )}</span> ⟶ 
        </div>

        </div>
      </div>
    </div>
</div>
